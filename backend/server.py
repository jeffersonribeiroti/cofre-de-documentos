"""
Servidor REST API em Python Nativo (HTTP Server)
Fornece todos os endpoints seguros com autenticação por token de sessão,
controle de acesso estrito (RBAC + Clearance), validação em 2 camadas e auditoria contínua.
"""
import http.server
import socketserver
import json
import urllib.parse
import sys
import base64
import os
from datetime import datetime

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Servidor HTTP multithread para atender requisições concorrentes sem bloqueio."""
    daemon_threads = True
    allow_reuse_address = True

# Garante que a raiz do projeto esteja no sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.config import CLASSIFICACOES, TIPOS_USUARIO, LEGAL_CONFIG
from backend.database import (
    init_db,
    obter_usuario_por_cpf,
    obter_usuario_por_id,
    obter_usuario_por_token_sessao,
    criar_usuario,
    atualizar_usuario,
    alternar_status_usuario,
    listar_usuarios,
    criar_sessao,
    invalidar_sessao,
    criar_documento,
    atualizar_documento,
    excluir_documento,
    obter_documento_por_id,
    listar_documentos,
    listar_auditoria,
    listar_tentativas_golpes,
    obter_metricas_dashboard,
    obter_aceite_legal
)
from backend.security import hash_password, verify_password, generate_session_token
from backend.validators import (
    validar_cpf,
    validar_telefone,
    validar_nome,
    validar_senha,
    validar_titulo_documento,
    validar_descricao_documento,
    validar_classificacao,
    validar_tipo_usuario,
    formatar_cpf,
    formatar_telefone,
    validar_aceite_termos_privacidade
)
from backend.access_control import (
    verificar_permissao_documento,
    pode_gerenciar_sistema,
    pode_gerenciar_documentos,
    pode_gerenciar_usuarios,
    pode_visualizar_auditoria,
    obter_nivel_numerico
)
from backend.audit import auditar
from backend.storage import salvar_arquivo_seguro, ler_arquivo_seguro, remover_arquivo_seguro
from backend.seed import popular_dados_iniciais, gerar_pdf_simples
from backend.rate_limiter import limiter
from backend.logger import log_info, log_warn, log_error
from backend.errors import formatar_resposta_erro, gerar_request_id
from backend.legal import obter_documentos_legais

class CofreAPIHandler(http.server.BaseHTTPRequestHandler):
    """Handler HTTP customizado para a API REST do Cofre de Documentos."""
    protocol_version = "HTTP/1.1"

    def setup(self):
        super().setup()
        self.request_id = gerar_request_id()

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Request-ID")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-XSS-Protection", "1; mode=block")
        if hasattr(self, "request_id"):
            self.send_header("X-Request-ID", self.request_id)

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def send_error(self, code, message=None, explain=None):
        """Sobrescreve página HTML padrão do BaseHTTPRequestHandler para garantir respostas JSON consistentes."""
        msg = message or "Erro na requisição"
        self.responder_erro(code, msg)

    def responder_json(self, status_code: int, dados: dict):
        """Envia resposta JSON segura com cabeçalhos apropriados e log estruturado."""
        corpo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(corpo)
        log_info(
            f"Resposta enviada: HTTP {status_code}",
            status_code=status_code,
            caminho=getattr(self, "path", "/"),
            ip=self.obter_ip_cliente(),
            request_id=getattr(self, "request_id", None)
        )

    def responder_erro(self, status_code: int, mensagem: str, detalhes: dict = None):
        """Padroniza respostas amigáveis de erro via módulo centralizado sem vazar informações internas."""
        req_id = getattr(self, "request_id", None)
        payload = formatar_resposta_erro(status_code, mensagem, request_id=req_id, detalhes_extras=detalhes)
        if status_code >= 500:
            log_error(
                f"Erro do Servidor HTTP {status_code}: {mensagem}",
                status_code=status_code,
                caminho=getattr(self, "path", "/"),
                ip=self.obter_ip_cliente(),
                request_id=req_id
            )
        else:
            log_warn(
                f"Aviso do Cliente HTTP {status_code}: {mensagem}",
                status_code=status_code,
                caminho=getattr(self, "path", "/"),
                ip=self.obter_ip_cliente(),
                request_id=req_id
            )

        corpo = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        if status_code == 429 and detalhes and "retry_after" in detalhes:
            self.send_header("Retry-After", str(detalhes["retry_after"]))
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(corpo)

    def obter_usuario_autenticado(self):
        """Extrai o token do cabeçalho Authorization ou Cookie e valida a sessão ativa."""
        auth_header = self.headers.get("Authorization", "")
        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        
        if not token:
            # Tenta obter de cookie
            cookie_header = self.headers.get("Cookie", "")
            for cookie in cookie_header.split(";"):
                if "cofre_session=" in cookie:
                    token = cookie.split("cofre_session=")[1].strip()

        if not token:
            return None, None

        usuario = obter_usuario_por_token_sessao(token)
        return usuario, token

    def ler_json_corpo(self) -> dict:
        """Lê e desserializa o corpo JSON da requisição com tratamento seguro."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                return {}
            # Limite máximo de leitura para payload JSON: 15MB
            if content_length > 15 * 1024 * 1024:
                return None
            body_bytes = self.rfile.read(content_length)
            return json.loads(body_bytes.decode("utf-8"))
        except Exception:
            return None

    def obter_ip_cliente(self) -> str:
        """Identifica o IP do cliente através dos cabeçalhos de proxy ou socket."""
        forwarded = self.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return self.client_address[0] if self.client_address else "127.0.0.1"

    # ==========================================
    # ROTAS GET
    # ==========================================
    def do_GET(self):
        try:
            parsed_url = urllib.parse.urlparse(self.path)
            path = parsed_url.path
            query_params = urllib.parse.parse_qs(parsed_url.query)
            ip_cliente = self.obter_ip_cliente()

            # Health Check
            if path == "/api/health":
                return self.responder_json(200, {"status": "ok", "servico": "Cofre de Documentos API"})

            # Documentos Legais Institucionais (Termos de Uso e Privacidade LGPD)
            # PRIVACY: Legal Documents Acceptance
            if path == "/api/legal/documents":
                return self.responder_json(200, {
                    "sucesso": True,
                    "documentos": obter_documentos_legais(),
                    "metadados": LEGAL_CONFIG
                })

            if path == "/api/legal/terms":
                docs = obter_documentos_legais()
                termos = docs["termos_de_uso"]
                return self.responder_json(200, {
                    "sucesso": True,
                    "titulo": termos["titulo"],
                    "versao": termos["versao"],
                    "data_vigencia": termos["atualizado_em"],
                    "conteudo": termos["conteudo"]
                })

            if path == "/api/legal/privacy":
                docs = obter_documentos_legais()
                priv = docs["politica_de_privacidade"]
                return self.responder_json(200, {
                    "sucesso": True,
                    "titulo": priv["titulo"],
                    "versao": priv["versao"],
                    "data_vigencia": priv["atualizado_em"],
                    "conteudo": priv["conteudo"]
                })

            # Consulta do Aceite Legal do Usuário Autenticado
            # PRIVACY: Legal Documents Acceptance
            if path == "/api/legal/my-acceptance":
                usuario, _ = self.obter_usuario_autenticado()
                if not usuario:
                    return self.responder_erro(401, "Autenticação necessária.")
                aceite = obter_aceite_legal(usuario["id"])
                return self.responder_json(200, {
                    "sucesso": True,
                    "aceite": aceite
                })

            # Rota de Sessão Atual: /api/auth/me
            if path == "/api/auth/me":
                usuario, _ = self.obter_usuario_autenticado()
                if not usuario:
                    return self.responder_erro(401, "Sessão não autenticada ou expirada.")
                
                return self.responder_json(200, {
                    "sucesso": True,
                    "usuario": {
                        "id": usuario["id"],
                        "nome": usuario["nome"],
                        "sobrenome": usuario["sobrenome"],
                        "nome_completo": f"{usuario['nome']} {usuario['sobrenome']}",
                        "cpf_formatado": formatar_cpf(usuario["cpf"]),
                        "telefone_formatado": formatar_telefone(usuario["telefone"]),
                        "tipo": usuario["tipo"],
                        "nivel_autorizacao": usuario["nivel_autorizacao"],
                        "status": usuario["status"],
                        "terms_accepted": bool(usuario.get("terms_accepted", 1)),
                        "privacy_accepted": bool(usuario.get("privacy_accepted", 1)),
                        "terms_version": usuario.get("terms_version", "1.0"),
                        "privacy_version": usuario.get("privacy_version", "1.0"),
                        "accepted_at": usuario.get("accepted_at"),
                        "criado_em": usuario["criado_em"]
                    }
                })

            # Dashboard: /api/dashboard (Somente Administrador)
            if path == "/api/dashboard":
                permitido, retry_after = limiter.verificar_limite(ip_cliente, "query")
                if not permitido:
                    return self.responder_erro(429, f"Limite de consultas excedido. Aguarde {retry_after} segundos.", {"retry_after": retry_after})

                usuario, _ = self.obter_usuario_autenticado()
                if not usuario:
                    return self.responder_erro(401, "Acesso não autenticado.")
                if not pode_gerenciar_sistema(usuario):
                    auditar(usuario, "ACESSO_NEGADO_DASHBOARD", resultado="NEGADO", detalhes="Tentativa de acesso não autorizada ao Dashboard", ip=ip_cliente)
                    return self.responder_erro(403, "Você não possui permissão para acessar o dashboard administrativo.")
                
                metricas = obter_metricas_dashboard()
                return self.responder_json(200, {"sucesso": True, "metricas": metricas})

            # Listagem de Documentos: /api/documents
            if path == "/api/documents":
                permitido, retry_after = limiter.verificar_limite(ip_cliente, "query")
                if not permitido:
                    return self.responder_erro(429, f"Limite de consultas excedido. Aguarde {retry_after} segundos.", {"retry_after": retry_after})

                usuario, _ = self.obter_usuario_autenticado()
                if not usuario:
                    return self.responder_erro(401, "Faça login para visualizar documentos.")
                
                termo = query_params.get("q", [None])[0]
                classificacao = query_params.get("classificacao", [None])[0]
                
                documentos = listar_documentos(pesquisa=termo, filtro_classificacao=classificacao)
                
                # Adiciona informações de permissão calculadas no backend
                docs_processados = []
                for doc in documentos:
                    autorizado = verificar_permissao_documento(usuario, doc["classificacao"])
                    docs_processados.append({
                        "id": doc["id"],
                        "titulo": doc["titulo"],
                        "descricao": doc["descricao"],
                        "classificacao": doc["classificacao"],
                        "arquivo_nome_original": doc["arquivo_nome_original"],
                        "arquivo_tamanho": doc["arquivo_tamanho"],
                        "arquivo_tipo": doc["arquivo_tipo"],
                        "criado_por_nome": doc["criado_por_nome"],
                        "criado_em": doc["criado_em"],
                        "autorizado": autorizado,
                        "nivel_documento_peso": obter_nivel_numerico(doc["classificacao"]),
                        "nivel_usuario_peso": obter_nivel_numerico(usuario["nivel_autorizacao"])
                    })
                
                return self.responder_json(200, {"sucesso": True, "documentos": docs_processados})

            # Detalhes / Visualização Segura de Documento: /api/documents/<id>
            if path.startswith("/api/documents/") and not path.endswith("/file"):
                doc_id_str = path.replace("/api/documents/", "").strip()
                if not doc_id_str.isdigit():
                    return self.responder_erro(400, "Identificador de documento inválido.")
                
                doc_id = int(doc_id_str)
                usuario, _ = self.obter_usuario_autenticado()
                if not usuario:
                    return self.responder_erro(401, "Faça login para acessar este documento.")
                
                doc = obter_documento_por_id(doc_id)
                if not doc:
                    return self.responder_erro(404, "Documento não encontrado.")

                # VERIFICAÇÃO CENTRAL DE CONTROLE DE ACESSO
                tem_permissao = verificar_permissao_documento(usuario, doc["classificacao"])

                if not tem_permissao:
                    # REGISTRO DE AUDITORIA DE ACESSO NEGADO
                    auditar(
                        usuario=usuario,
                        acao="ACESSO_NEGADO",
                        documento=doc,
                        resultado="NEGADO",
                        detalhes=f"Tentativa de visualização negada. Nível do usuário ({usuario['nivel_autorizacao']}) inferior ao do documento ({doc['classificacao']}).",
                        ip=ip_cliente
                    )
                    return self.responder_erro(
                        403,
                        "ACESSO NEGADO: Você não possui autorização suficiente para visualizar este documento.",
                        {
                            "acesso_negado": True,
                            "documento_titulo": doc["titulo"],
                            "classificacao": doc["classificacao"],
                            "nivel_usuario": usuario["nivel_autorizacao"]
                        }
                    )

                # REGISTRO DE AUDITORIA DE VISUALIZAÇÃO PERMITIDA
                auditar(
                    usuario=usuario,
                    acao="VISUALIZACAO_DOCUMENTO",
                    documento=doc,
                    resultado="SUCESSO",
                    detalhes=f"Visualização de documento com nível {doc['classificacao']} autorizada.",
                    ip=ip_cliente
                )

                # Prepara metadados para Marca d'Água de Segurança
                agora_str = datetime.now().strftime("%d/%m/%Y às %H:%M:%S")
                cpf_mascarado = formatar_cpf(usuario["cpf"])
                nome_completo = f"{usuario['nome']} {usuario['sobrenome']}"
                
                marca_dagua = {
                    "texto_principal": doc["classificacao"],
                    "visualizado_por": nome_completo,
                    "cpf_usuario": cpf_mascarado,
                    "data_hora": agora_str,
                    "ip": ip_cliente,
                    "nivel_protecao": "MAXIMO" if doc["classificacao"] == "SIGILOSO" else ("ELEVADO" if doc["classificacao"] == "CONFIDENCIAL" else "PADRAO"),
                    "bloquear_download_impressao": doc["classificacao"] in ["CONFIDENCIAL", "SIGILOSO"]
                }

                return self.responder_json(200, {
                    "sucesso": True,
                    "documento": {
                        "id": doc["id"],
                        "titulo": doc["titulo"],
                        "descricao": doc["descricao"],
                        "classificacao": doc["classificacao"],
                        "arquivo_nome_original": doc["arquivo_nome_original"],
                        "arquivo_tamanho": doc["arquivo_tamanho"],
                        "arquivo_tipo": doc["arquivo_tipo"],
                        "conteudo_texto": doc["conteudo_texto"],
                        "criado_por_nome": doc["criado_por_nome"],
                        "criado_em": doc["criado_em"]
                    },
                    "marca_dagua": marca_dagua
                })

            # Download / Stream de Arquivo do Documento: /api/documents/<id>/file
            if path.startswith("/api/documents/") and path.endswith("/file"):
                doc_id_str = path.replace("/api/documents/", "").replace("/file", "").strip()
                if not doc_id_str.isdigit():
                    return self.responder_erro(400, "Identificador de documento inválido.")
                
                doc_id = int(doc_id_str)
                usuario, _ = self.obter_usuario_autenticado()
                if not usuario:
                    return self.responder_erro(401, "Autenticação necessária.")

                doc = obter_documento_por_id(doc_id)
                if not doc:
                    return self.responder_erro(404, "Documento não encontrado.")

                if not verificar_permissao_documento(usuario, doc["classificacao"]):
                    auditar(usuario, "ACESSO_NEGADO_ARQUIVO", doc, resultado="NEGADO", detalhes="Tentativa de obter arquivo sem autorização", ip=ip_cliente)
                    return self.responder_erro(403, "Acesso negado ao arquivo do documento.")

                # Para Confidencial e Sigiloso, não permite download direto em conformidade com o requisito 27
                if doc["classificacao"] in ["CONFIDENCIAL", "SIGILOSO"]:
                    return self.responder_erro(403, "O download direto de documentos CONFIDENCIAIS e SIGILOSOS é desabilitado por políticas de segurança. Utilize o visualizador protegido.")

                sucesso_leitura, arquivo_bytes, _ = ler_arquivo_seguro(doc["arquivo_caminho"])
                if not sucesso_leitura:
                    return self.responder_erro(404, "Arquivo físico não encontrado no servidor seguro.")

                auditar(usuario, "DOWNLOAD_DOCUMENTO", doc, resultado="SUCESSO", detalhes="Download de documento público/interno efetuado", ip=ip_cliente)

                self.send_response(200)
                self.send_header("Content-Type", doc["arquivo_tipo"])
                self.send_header("Content-Disposition", f'inline; filename="{doc["arquivo_nome_original"]}"')
                self.send_header("Content-Length", str(len(arquivo_bytes)))
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(arquivo_bytes)
                return

            # Listagem de Usuários: /api/users (Somente Administrador)
            if path == "/api/users":
                permitido, retry_after = limiter.verificar_limite(ip_cliente, "query")
                if not permitido:
                    return self.responder_erro(429, f"Limite de consultas excedido. Aguarde {retry_after} segundos.", {"retry_after": retry_after})

                usuario, _ = self.obter_usuario_autenticado()
                if not usuario:
                    return self.responder_erro(401, "Autenticação necessária.")
                if not pode_gerenciar_usuarios(usuario):
                    auditar(usuario, "ACESSO_NEGADO_USUARIOS", resultado="NEGADO", detalhes="Tentativa não autorizada de listar usuários", ip=ip_cliente)
                    return self.responder_erro(403, "Apenas administradores podem gerenciar usuários.")

                usuarios = listar_usuarios()
                usuarios_formatados = []
                for u in usuarios:
                    usuarios_formatados.append({
                        "id": u["id"],
                        "nome": u["nome"],
                        "sobrenome": u["sobrenome"],
                        "nome_completo": f"{u['nome']} {u['sobrenome']}",
                        "cpf_formatado": formatar_cpf(u["cpf"]),
                        "telefone_formatado": formatar_telefone(u["telefone"]),
                        "tipo": u["tipo"],
                        "nivel_autorizacao": u["nivel_autorizacao"],
                        "status": u["status"],
                        "terms_accepted": bool(u.get("terms_accepted", 1)),
                        "privacy_accepted": bool(u.get("privacy_accepted", 1)),
                        "terms_version": u.get("terms_version", "1.0"),
                        "privacy_version": u.get("privacy_version", "1.0"),
                        "accepted_at": u.get("accepted_at"),
                        "criado_em": u["criado_em"]
                    })
                return self.responder_json(200, {"sucesso": True, "usuarios": usuarios_formatados})

            # Auditoria: /api/audit (Somente Administrador)
            if path == "/api/audit":
                permitido, retry_after = limiter.verificar_limite(ip_cliente, "query")
                if not permitido:
                    return self.responder_erro(429, f"Limite de consultas excedido. Aguarde {retry_after} segundos.", {"retry_after": retry_after})

                usuario, _ = self.obter_usuario_autenticado()
                if not usuario:
                    return self.responder_erro(401, "Autenticação necessária.")
                if not pode_visualizar_auditoria(usuario):
                    auditar(usuario, "ACESSO_NEGADO_AUDITORIA", resultado="NEGADO", detalhes="Tentativa não autorizada de visualizar logs de auditoria", ip=ip_cliente)
                    return self.responder_erro(403, "Apenas administradores podem visualizar a trilha de auditoria.")

                filtro_acao = query_params.get("acao", [None])[0]
                filtro_resultado = query_params.get("resultado", [None])[0]
                
                logs = listar_auditoria(limite=200, filtro_acao=filtro_acao, filtro_resultado=filtro_resultado)
                logs_formatados = []
                for l in logs:
                    logs_formatados.append({
                        "id": l["id"],
                        "usuario_id": l["usuario_id"],
                        "usuario_nome": l["usuario_nome"],
                        "usuario_cpf_formatado": formatar_cpf(l["usuario_cpf"]) if l["usuario_cpf"] and l["usuario_cpf"] != "N/A" else "N/A",
                        "acao": l["acao"],
                        "documento_id": l["documento_id"],
                        "documento_titulo": l["documento_titulo"],
                        "classificacao_documento": l["classificacao_documento"],
                        "nivel_usuario": l["nivel_usuario"],
                        "resultado": l["resultado"],
                        "detalhes": l["detalhes"],
                        "ip": l["ip"],
                        "data_hora": l["data_hora"]
                    })
                return self.responder_json(200, {"sucesso": True, "logs": logs_formatados})

            # Telemetria SOC / Terminal de Tentativas de Golpes
            if path == "/api/security/threats":
                limite = int(query_params.get("limite", [100])[0])
                threats = listar_tentativas_golpes(limite=limite)
                
                # Estatísticas dos golpes interceptados
                stats = {
                    "total": len(threats),
                    "brute_force": sum(1 for t in threats if "BRUTE_FORCE" in t.get("acao", "") or "RATE_LIMIT" in str(t.get("detalhes", ""))),
                    "sql_injection": sum(1 for t in threats if "SQL_INJECTION" in t.get("acao", "") or "Injeção" in str(t.get("detalhes", ""))),
                    "cpf_falso": sum(1 for t in threats if "CPF_FALSO" in t.get("acao", "") or "inválidos" in str(t.get("detalhes", ""))),
                    "violacao_rbac": sum(1 for t in threats if "ACESSO_NEGADO" in t.get("acao", "")),
                    "falhas_login": sum(1 for t in threats if t.get("acao") == "LOGIN_FALHA")
                }

                threats_formatados = []
                for t in threats:
                    threats_formatados.append({
                        "id": t["id"],
                        "data_hora": t["data_hora"],
                        "ip": t["ip"] or "127.0.0.1",
                        "acao": t["acao"],
                        "resultado": t["resultado"],
                        "detalhes": t["detalhes"] or "Tentativa não autorizada interceptada pelo núcleo de segurança.",
                        "usuario_nome": t["usuario_nome"] if t["usuario_nome"] else "Atacante Anônimo",
                        "usuario_cpf": t["usuario_cpf"] if t["usuario_cpf"] and t["usuario_cpf"] != "N/A" else "N/A",
                        "nivel_usuario": t["nivel_usuario"] or "NÃO AUTORIZADO",
                        "documento_titulo": t["documento_titulo"]
                    })

                return self.responder_json(200, {
                    "sucesso": True,
                    "estatisticas": stats,
                    "threats": threats_formatados
                })

            return self.responder_erro(404, "Endpoint não encontrado.")
        except Exception as e:
            log_error(f"Erro inesperado em GET {self.path}: {e}", exc=e, request_id=getattr(self, "request_id", None))
            return self.responder_erro(500, "Ocorreu um erro interno no servidor ao processar sua requisição.")


    # ==========================================
    # ROTAS POST
    # ==========================================
    def do_POST(self):
        try:
            path = urllib.parse.urlparse(self.path).path
            corpo = self.ler_json_corpo()

            if corpo is None:
                return self.responder_erro(400, "Corpo da requisição JSON inválido ou vazio.")

            ip_cliente = self.obter_ip_cliente()

            # Endpoint para Simulação Didática de Ataques e Golpes para o Terminal SOC
            if path == "/api/security/simulate-threat":
                tipo_golpe = corpo.get("tipo", "SQL_INJECTION")
                ip_origem = corpo.get("ip") or ip_cliente

                if tipo_golpe == "SQL_INJECTION":
                    payload_tentado = corpo.get("payload", "' OR '1'='1' --")
                    auditar(
                        None,
                        "ATAQUE_SQL_INJECTION",
                        resultado="NEGADO",
                        detalhes=f"Golpe mitigado: Injeção de SQL/Comando detectada no payload: {payload_tentado} (Prepared Statement isolou parâmetros)",
                        ip=ip_origem
                    )
                    msg = "Tentativa de Injeção SQL interceptada e neutralizada pelo SQLite com Prepared Statement."
                elif tipo_golpe == "BRUTE_FORCE":
                    auditar(
                        None,
                        "ATAQUE_BRUTE_FORCE",
                        resultado="NEGADO",
                        detalhes=f"Golpe mitigado: Rajada de 5+ tentativas em <10s. Sliding Window Rate Limiter ativado; IP bloqueado.",
                        ip=ip_origem
                    )
                    msg = "Tentativa de Força Bruta / DoS bloqueada pelo Rate Limiter da API."
                elif tipo_golpe == "CPF_FALSO":
                    auditar(
                        None,
                        "GOLPE_CPF_FALSO",
                        resultado="NEGADO",
                        detalhes="Golpe mitigado: Engenharia social com identidade forjada / CPF matematicamente inconsistente (Módulo 11).",
                        ip=ip_origem
                    )
                    msg = "Tentativa com credencial fraudulenta/CPF falso bloqueada pela validação de integridade."
                elif tipo_golpe == "PRIVILEGE_ESCALATION":
                    auditar(
                        {"id": 99, "nome": "Atacante", "sobrenome": "Interno", "cpf": "333.666.999-57", "nivel_autorizacao": "PUBLICO"},
                        "ACESSO_NEGADO_DOCUMENTO",
                        documento={"id": 1, "titulo": "Plano Estratégico de Expansão e Fusão", "classificacao": "SIGILOSO"},
                        resultado="NEGADO",
                        detalhes="Violação RBAC: Usuário com clearance PÚBLICO tentou ler documento classificado como SIGILOSO.",
                        ip=ip_origem
                    )
                    msg = "Violação de privilégios interceptada pelo mecanismo RBAC (HTTP 403)."
                else:
                    auditar(
                        None,
                        "ATAQUE_ANOMALIA",
                        resultado="NEGADO",
                        detalhes=f"Golpe mitigado: Tráfego anômalo e cabeçalhos forjados detectados no gateway.",
                        ip=ip_origem
                    )
                    msg = "Tentativa de intrusão bloqueada pelos cabeçalhos de segurança."

                return self.responder_json(200, {
                    "sucesso": True,
                    "mensagem": msg,
                    "tipo": tipo_golpe
                })

            # LOGIN: /api/auth/login
            if path == "/api/auth/login":
                # Rate Limiting rigoroso contra Brute Force (5 tentativas / minuto)
                permitido, retry_after = limiter.verificar_limite(ip_cliente, "login")
                if not permitido:
                    auditar(
                        None,
                        "ATAQUE_BRUTE_FORCE",
                        resultado="NEGADO",
                        detalhes=f"Golpe mitigado: Limite de tentativas de autenticação excedido (Força Bruta). Cooldown ativo por {retry_after}s.",
                        ip=ip_cliente
                    )
                    return self.responder_erro(
                        429,
                        f"Muitas tentativas de login. Por motivos de segurança, aguarde {retry_after} segundos antes de tentar novamente.",
                        {"retry_after": retry_after}
                    )

                cpf_raw = str(corpo.get("cpf", ""))
                senha_raw = str(corpo.get("senha", ""))

                # Verificação explícita de assinaturas de injeção SQL no login
                sqli_signatures = ["'", '"', "--", ";", "/*", "*/", "UNION", "SELECT", "DROP", "OR '1'='1", "OR 1=1", "XP_"]
                cpf_upper = cpf_raw.upper()
                if any(sig in cpf_upper for sig in sqli_signatures):
                    auditar(
                        None,
                        "ATAQUE_SQL_INJECTION",
                        resultado="NEGADO",
                        detalhes=f"Golpe mitigado: Injeção de SQL detectada no campo CPF: {cpf_raw[:40]} (Prepared Statement ativo)",
                        ip=ip_cliente
                    )
                    return self.responder_erro(401, "CPF ou senha inválidos.")

                valido_cpf, msg_cpf, cpf_limpo = validar_cpf(cpf_raw)
                if not valido_cpf or not senha_raw:
                    auditar(
                        None,
                        "GOLPE_CPF_FALSO",
                        resultado="NEGADO",
                        detalhes=f"Golpe mitigado: Tentativa de login com CPF matematicamente fraudulento ou inválido ({msg_cpf})",
                        ip=ip_cliente
                    )
                    return self.responder_erro(401, "CPF ou senha inválidos.")

                usuario = obter_usuario_por_cpf(cpf_limpo)
                if not usuario:
                    auditar(None, "LOGIN_FALHA", resultado="NEGADO", detalhes=f"Tentativa de autenticação com CPF inexistente na base", ip=ip_cliente)
                    return self.responder_erro(401, "CPF ou senha inválidos.")

                if usuario["status"] != "ATIVO":
                    auditar(usuario, "LOGIN_FALHA", resultado="NEGADO", detalhes="Tentativa de acesso em conta suspensa/inativa", ip=ip_cliente)
                    return self.responder_erro(403, "Esta conta está inativa. Entre em contato com o Administrador.")

                if not verify_password(senha_raw, usuario["senha_hash"], usuario["salt"]):
                    auditar(usuario, "LOGIN_FALHA", resultado="NEGADO", detalhes="Tentativa com senha incorreta (possível força bruta/ataque de dicionário)", ip=ip_cliente)
                    return self.responder_erro(401, "CPF ou senha inválidos.")

                # Gera token de sessão seguro
                token = generate_session_token()
                expira_em = criar_sessao(usuario["id"], token)

                auditar(usuario, "LOGIN", resultado="SUCESSO", detalhes="Login realizado com sucesso", ip=ip_cliente)

                return self.responder_json(200, {
                    "sucesso": True,
                    "mensagem": "Login realizado com sucesso.",
                    "token": token,
                    "expira_em": expira_em.strftime("%Y-%m-%d %H:%M:%S"),
                    "usuario": {
                        "id": usuario["id"],
                        "nome": usuario["nome"],
                        "sobrenome": usuario["sobrenome"],
                        "nome_completo": f"{usuario['nome']} {usuario['sobrenome']}",
                        "cpf_formatado": formatar_cpf(usuario["cpf"]),
                        "telefone_formatado": formatar_telefone(usuario["telefone"]),
                        "tipo": usuario["tipo"],
                        "nivel_autorizacao": usuario["nivel_autorizacao"],
                        "status": usuario["status"]
                    }
                })

            # LOGOUT: /api/auth/logout
            if path == "/api/auth/logout":
                usuario, token = self.obter_usuario_autenticado()
                if token:
                    invalidar_sessao(token)
                if usuario:
                    auditar(usuario, "LOGOUT", resultado="SUCESSO", detalhes="Sessão finalizada pelo usuário", ip=ip_cliente)
                return self.responder_json(200, {"sucesso": True, "mensagem": "Sessão encerrada com sucesso."})

            # CADASTRO DE USUÁRIO: /api/auth/register ou /api/users
            if path in ["/api/auth/register", "/api/users"]:
                usuario_logado, _ = self.obter_usuario_autenticado()
                
                # Rate Limiting para cadastros
                permitido, retry_after = limiter.verificar_limite(ip_cliente, "register")
                if not permitido:
                    return self.responder_erro(429, f"Muitas requisições de cadastro. Aguarde {retry_after} segundos.", {"retry_after": retry_after})

                # Se for /api/users, exige que seja Administrador
                # Se for /api/auth/register (criação pública), força tipo 'USUARIO' e nível 'PUBLICO' por segurança
                tipo_desejado = corpo.get("tipo", "USUARIO")
                nivel_desejado = corpo.get("nivel_autorizacao", "PUBLICO")

                if path == "/api/users":
                    if not usuario_logado or not pode_gerenciar_usuarios(usuario_logado):
                        return self.responder_erro(403, "Apenas administradores podem cadastrar novos usuários no painel.")
                else:
                    # Cadastro público sempre cria como USUARIO de nível PUBLICO
                    tipo_desejado = "USUARIO"
                    nivel_desejado = "PUBLICO"

                    # PRIVACY: Legal Documents Acceptance
                    # Validação obrigatória de aceite formal dos Termos de Uso e Política de Privacidade
                    valido_legal, msg_legal = validar_aceite_termos_privacidade(corpo)
                    if not valido_legal:
                        return self.responder_erro(400, msg_legal)

                # 1. Validação de Nome
                valido, msg, nome_sanitizado = validar_nome(corpo.get("nome"), "Nome")
                if not valido:
                    return self.responder_erro(400, msg)

                # 2. Validação de Sobrenome
                valido, msg, sobrenome_sanitizado = validar_nome(corpo.get("sobrenome"), "Sobrenome")
                if not valido:
                    return self.responder_erro(400, msg)

                # 3. Validação Matemática de CPF
                valido, msg, cpf_limpo = validar_cpf(corpo.get("cpf"))
                if not valido:
                    return self.responder_erro(400, msg)

                # Verifica duplicidade de CPF
                if obter_usuario_por_cpf(cpf_limpo):
                    return self.responder_erro(409, "Este CPF já está cadastrado no sistema.")

                # 4. Validação de Telefone
                valido, msg, tel_limpo = validar_telefone(corpo.get("telefone"))
                if not valido:
                    return self.responder_erro(400, msg)

                # 5. Validação de Senha Forte e Confirmação
                senha = corpo.get("senha", "")
                confirmacao = corpo.get("confirmacao_senha", "")
                valido, msg = validar_senha(senha, confirmacao)
                if not valido:
                    return self.responder_erro(400, msg)

                # 6. Validação de Tipo e Nível
                valido, msg = validar_tipo_usuario(tipo_desejado)
                if not valido:
                    return self.responder_erro(400, msg)

                valido, msg = validar_classificacao(nivel_desejado)
                if not valido:
                    return self.responder_erro(400, msg)

                # Geração de Hash Criptográfico
                senha_hash, salt = hash_password(senha)

                terms_version = LEGAL_CONFIG["terms_version"]
                privacy_version = LEGAL_CONFIG["privacy_version"]

                novo_id = criar_usuario(
                    nome=nome_sanitizado,
                    sobrenome=sobrenome_sanitizado,
                    cpf=cpf_limpo,
                    telefone=tel_limpo,
                    senha_hash=senha_hash,
                    salt=salt,
                    tipo=tipo_desejado.upper(),
                    nivel=nivel_desejado.upper(),
                    status="ATIVO",
                    terms_accepted=1,
                    privacy_accepted=1,
                    terms_version=terms_version,
                    privacy_version=privacy_version
                )

                # Registro em Auditoria
                criador = usuario_logado if usuario_logado else {"id": novo_id, "nome": nome_sanitizado, "sobrenome": sobrenome_sanitizado, "cpf": cpf_limpo, "nivel_autorizacao": nivel_desejado}
                
                # PRIVACY: Legal Documents Acceptance
                # Registra na trilha de auditoria formal o aceite dos termos e privacidade com versão e IP
                auditar(
                    usuario=criador,
                    acao="ACEITE_DOCUMENTOS_LEGAIS",
                    resultado="SUCESSO",
                    detalhes=f"Aceite dos Termos de Uso (v{terms_version}) e Política de Privacidade (v{privacy_version}) formalizado no cadastro.",
                    ip=ip_cliente
                )

                auditar(
                    usuario=criador,
                    acao="CRIACAO_USUARIO",
                    resultado="SUCESSO",
                    detalhes=f"Usuário criado: {nome_sanitizado} {sobrenome_sanitizado} (Tipo: {tipo_desejado}, Nível: {nivel_desejado})",
                    ip=ip_cliente
                )

                return self.responder_json(201, {
                    "sucesso": True,
                    "mensagem": "Usuário cadastrado com sucesso!",
                    "usuario_id": novo_id
                })

            # CADASTRO DE DOCUMENTO: /api/documents (Somente Administrador)
            if path == "/api/documents":
                # Rate Limiting para uploads de documentos
                permitido, retry_after = limiter.verificar_limite(ip_cliente, "upload")
                if not permitido:
                    return self.responder_erro(429, f"Limite de upload de documentos atingido. Aguarde {retry_after} segundos.", {"retry_after": retry_after})

                usuario, _ = self.obter_usuario_autenticado()
                if not usuario or not pode_gerenciar_documentos(usuario):
                    return self.responder_erro(403, "Você não possui autorização para cadastrar documentos.")

                titulo_raw = corpo.get("titulo", "")
                descricao_raw = corpo.get("descricao", "")
                classificacao_raw = corpo.get("classificacao", "")
                conteudo_texto = corpo.get("conteudo_texto", "")
                arquivo_base64 = corpo.get("arquivo_base64", "")
                arquivo_nome = corpo.get("arquivo_nome", "documento.pdf")

                # Validações
                valido, msg, titulo_limpo = validar_titulo_documento(titulo_raw)
                if not valido:
                    return self.responder_erro(400, msg)

                valido, msg, desc_limpa = validar_descricao_documento(descricao_raw)
                if not valido:
                    return self.responder_erro(400, msg)

                valido, msg = validar_classificacao(classificacao_raw)
                if not valido:
                    return self.responder_erro(400, msg)

                # Processamento seguro do arquivo ou geração de PDF automático baseado no conteúdo
                if arquivo_base64:
                    try:
                        arquivo_bytes = base64.b64decode(arquivo_base64)
                    except Exception:
                        return self.responder_erro(400, "Arquivo em formato codificado inválido.")
                else:
                    # Gera PDF institucional baseado no título, descrição e conteúdo
                    arquivo_bytes = gerar_pdf_simples(titulo_limpo, classificacao_raw.upper(), conteudo_texto or desc_limpa or "Conteúdo do documento seguro.")
                    arquivo_nome = f"{titulo_limpo.lower().replace(' ', '_')[:30]}.pdf"

                sucesso_salvar, erro_salvar, nome_uuid, tamanho_bytes = salvar_arquivo_seguro(arquivo_bytes, arquivo_nome)
                if not sucesso_salvar:
                    return self.responder_erro(400, erro_salvar)

                doc_id = criar_documento(
                    titulo=titulo_limpo,
                    descricao=desc_limpa,
                    classificacao=classificacao_raw.upper(),
                    arquivo_caminho=nome_uuid,
                    arquivo_nome_original=arquivo_nome,
                    arquivo_tamanho=tamanho_bytes,
                    arquivo_tipo="application/pdf" if arquivo_nome.lower().endswith(".pdf") else "text/plain",
                    conteudo_texto=conteudo_texto or desc_limpa,
                    criado_por_id=usuario["id"]
                )

                novo_doc = {"id": doc_id, "titulo": titulo_limpo, "classificacao": classificacao_raw.upper()}
                auditar(usuario, "CRIACAO_DOCUMENTO", documento=novo_doc, resultado="SUCESSO", detalhes="Documento cadastrado no cofre", ip=ip_cliente)

                return self.responder_json(201, {
                    "sucesso": True,
                    "mensagem": "Documento cadastrado com sucesso.",
                    "documento_id": doc_id
                })

            # RESET DE DADOS DE TESTE: /api/seed/reset
            if path == "/api/seed/reset":
                popular_dados_iniciais(forcar_reset=True)
                return self.responder_json(200, {"sucesso": True, "mensagem": "Dados de demonstração restabelecidos com sucesso."})

            return self.responder_erro(404, "Endpoint não encontrado.")
        except Exception as e:
            log_error(f"Erro inesperado em POST {self.path}: {e}", exc=e, request_id=getattr(self, "request_id", None))
            return self.responder_erro(500, "Ocorreu um erro interno no servidor ao processar sua requisição.")


    # ==========================================
    # ROTAS PUT / PATCH
    # ==========================================
    def do_PUT(self):
        try:
            path = urllib.parse.urlparse(self.path).path
            corpo = self.ler_json_corpo()
            if corpo is None:
                return self.responder_erro(400, "Corpo JSON inválido.")
            
            usuario, _ = self.obter_usuario_autenticado()
            if not usuario:
                return self.responder_erro(401, "Autenticação necessária.")
            ip_cliente = self.obter_ip_cliente()

            # EDIÇÃO DE DOCUMENTO: /api/documents/<id>
            if path.startswith("/api/documents/"):
                if not pode_gerenciar_documentos(usuario):
                    return self.responder_erro(403, "Você não possui permissão para editar documentos.")

                doc_id_str = path.replace("/api/documents/", "").strip()
                if not doc_id_str.isdigit():
                    return self.responder_erro(400, "ID inválido.")
                
                doc_id = int(doc_id_str)
                doc_existente = obter_documento_por_id(doc_id)
                if not doc_existente:
                    return self.responder_erro(404, "Documento não encontrado.")

                valido, msg, titulo_limpo = validar_titulo_documento(corpo.get("titulo", doc_existente["titulo"]))
                if not valido:
                    return self.responder_erro(400, msg)

                valido, msg, desc_limpa = validar_descricao_documento(corpo.get("descricao", doc_existente["descricao"]))
                if not valido:
                    return self.responder_erro(400, msg)

                valido, msg = validar_classificacao(corpo.get("classificacao", doc_existente["classificacao"]))
                if not valido:
                    return self.responder_erro(400, msg)

                classif_nova = str(corpo.get("classificacao", doc_existente["classificacao"])).upper()
                conteudo_texto_novo = corpo.get("conteudo_texto", doc_existente.get("conteudo_texto"))

                atualizar_documento(doc_id, titulo_limpo, desc_limpa, classif_nova, conteudo_texto=conteudo_texto_novo)
                doc_atualizado = {"id": doc_id, "titulo": titulo_limpo, "classificacao": classif_nova}
                auditar(usuario, "EDICAO_DOCUMENTO", documento=doc_atualizado, resultado="SUCESSO", detalhes=f"Classificação anterior: {doc_existente['classificacao']} -> Nova: {classif_nova}", ip=ip_cliente)

                return self.responder_json(200, {"sucesso": True, "mensagem": "Documento atualizado com sucesso."})

            # EDIÇÃO DE USUÁRIO: /api/users/<id>
            if path.startswith("/api/users/"):
                if not pode_gerenciar_usuarios(usuario):
                    return self.responder_erro(403, "Apenas administradores podem editar usuários.")

                user_id_str = path.replace("/api/users/", "").strip()
                if not user_id_str.isdigit():
                    return self.responder_erro(400, "ID inválido.")
                
                user_id = int(user_id_str)
                user_existente = obter_usuario_por_id(user_id)
                if not user_existente:
                    return self.responder_erro(404, "Usuário não encontrado.")

                valido, msg, nome_sanitizado = validar_nome(corpo.get("nome", user_existente["nome"]), "Nome")
                if not valido:
                    return self.responder_erro(400, msg)

                valido, msg, sobrenome_sanitizado = validar_nome(corpo.get("sobrenome", user_existente["sobrenome"]), "Sobrenome")
                if not valido:
                    return self.responder_erro(400, msg)

                valido, msg, tel_limpo = validar_telefone(corpo.get("telefone", user_existente["telefone"]))
                if not valido:
                    return self.responder_erro(400, msg)

                tipo_novo = corpo.get("tipo", user_existente["tipo"]).upper()
                nivel_novo = corpo.get("nivel_autorizacao", user_existente["nivel_autorizacao"]).upper()
                status_novo = corpo.get("status", user_existente["status"]).upper()

                valido, msg = validar_tipo_usuario(tipo_novo)
                if not valido:
                    return self.responder_erro(400, msg)
                valido, msg = validar_classificacao(nivel_novo)
                if not valido:
                    return self.responder_erro(400, msg)

                # Senha opcional na edição
                nova_senha = corpo.get("senha")
                nova_senha_hash, novo_salt = None, None
                if nova_senha:
                    valido, msg = validar_senha(nova_senha, corpo.get("confirmacao_senha"))
                    if not valido:
                        return self.responder_erro(400, msg)
                    nova_senha_hash, novo_salt = hash_password(nova_senha)

                atualizar_usuario(
                    user_id=user_id,
                    nome=nome_sanitizado,
                    sobrenome=sobrenome_sanitizado,
                    telefone=tel_limpo,
                    tipo=tipo_novo,
                    nivel=nivel_novo,
                    status=status_novo,
                    nova_senha_hash=nova_senha_hash,
                    novo_salt=novo_salt
                )

                auditar(usuario, "EDICAO_USUARIO", resultado="SUCESSO", detalhes=f"Usuário ID {user_id} atualizado (Tipo: {tipo_novo}, Nível: {nivel_novo}, Status: {status_novo})", ip=ip_cliente)

                return self.responder_json(200, {"sucesso": True, "mensagem": "Usuário atualizado com sucesso."})

            return self.responder_erro(404, "Endpoint não encontrado.")
        except Exception as e:
            log_error(f"Erro inesperado em PUT {self.path}: {e}", exc=e, request_id=getattr(self, "request_id", None))
            return self.responder_erro(500, "Ocorreu um erro interno no servidor ao processar sua requisição.")

    def do_PATCH(self):
        try:
            path = urllib.parse.urlparse(self.path).path
            corpo = self.ler_json_corpo() or {}
            usuario, _ = self.obter_usuario_autenticado()
            if not usuario or not pode_gerenciar_usuarios(usuario):
                return self.responder_erro(403, "Apenas administradores podem alterar o status de usuários.")

            if path.startswith("/api/users/") and path.endswith("/status"):
                user_id_str = path.replace("/api/users/", "").replace("/status", "").strip()
                if not user_id_str.isdigit():
                    return self.responder_erro(400, "ID inválido.")
                
                user_id = int(user_id_str)
                novo_status = corpo.get("status", "INATIVO").upper()
                if novo_status not in ["ATIVO", "INATIVO"]:
                    return self.responder_erro(400, "Status inválido.")

                # Não permite que o próprio administrador desative a si mesmo
                if user_id == usuario["id"] and novo_status == "INATIVO":
                    return self.responder_erro(400, "Você não pode desativar sua própria conta de administrador.")

                alternar_status_usuario(user_id, novo_status)
                auditar(usuario, "DESATIVACAO_USUARIO" if novo_status == "INATIVO" else "ATIVACAO_USUARIO", resultado="SUCESSO", detalhes=f"Status do usuário {user_id} alterado para {novo_status}", ip=self.obter_ip_cliente())

                return self.responder_json(200, {"sucesso": True, "mensagem": f"Status alterado para {novo_status} com sucesso."})

            return self.responder_erro(404, "Endpoint não encontrado.")
        except Exception as e:
            log_error(f"Erro inesperado em PATCH {self.path}: {e}", exc=e, request_id=getattr(self, "request_id", None))
            return self.responder_erro(500, "Ocorreu um erro interno no servidor ao processar sua requisição.")

    # ==========================================
    # ROTAS DELETE
    # ==========================================
    def do_DELETE(self):
        try:
            path = urllib.parse.urlparse(self.path).path
            usuario, _ = self.obter_usuario_autenticado()
            if not usuario:
                return self.responder_erro(401, "Autenticação necessária.")
            ip_cliente = self.obter_ip_cliente()

            if path.startswith("/api/documents/"):
                if not pode_gerenciar_documentos(usuario):
                    return self.responder_erro(403, "Você não possui permissão para excluir documentos.")

                doc_id_str = path.replace("/api/documents/", "").strip()
                if not doc_id_str.isdigit():
                    return self.responder_erro(400, "ID inválido.")

                doc_id = int(doc_id_str)
                doc_removido = excluir_documento(doc_id)
                if not doc_removido:
                    return self.responder_erro(404, "Documento não encontrado para exclusão.")

                remover_arquivo_seguro(doc_removido["arquivo_caminho"])
                auditar(usuario, "EXCLUSAO_DOCUMENTO", documento=doc_removido, resultado="SUCESSO", detalhes=f"Documento '{doc_removido['titulo']}' excluído permanentemente", ip=ip_cliente)

                return self.responder_json(200, {"sucesso": True, "mensagem": "Documento excluído com sucesso."})

            return self.responder_erro(404, "Endpoint não encontrado.")
        except Exception as e:
            log_error(f"Erro inesperado em DELETE {self.path}: {e}", exc=e, request_id=getattr(self, "request_id", None))
            return self.responder_erro(500, "Ocorreu um erro interno no servidor ao processar sua requisição.")


def rodar_servidor(porta: int = 5001, host: str = "0.0.0.0"):
    """Inicia o servidor HTTP da API com suporte multithread."""
    popular_dados_iniciais()
    server_address = (host, porta)
    httpd = ThreadedHTTPServer(server_address, CofreAPIHandler)
    print(f"[*] Cofre de Documentos API Python rodando em http://{host}:{porta}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Encerrando servidor com segurança.", flush=True)
        httpd.server_close()

if __name__ == "__main__":
    porta = 5001
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        porta = int(sys.argv[1])
    rodar_servidor(porta=porta)
