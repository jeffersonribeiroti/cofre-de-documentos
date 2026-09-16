"""
Módulo de Inicialização e Dados Fictícios (Seed)
Popula o banco com usuários e documentos de teste para demonstrar os 4 níveis de confidencialidade.
"""
import os
import sys
import uuid

# Garante que a raiz do projeto esteja no sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.config import UPLOADS_DIR
from backend.database import init_db, obter_usuario_por_cpf, criar_usuario, criar_documento
from backend.security import hash_password

def gerar_pdf_simples(titulo: str, classificacao: str, conteudo: str) -> bytes:
    """
    Gera um arquivo PDF válido estruturado manualmente sem dependências externas.
    Inclui cabeçalhos PDF e texto legível em conformidade com as especificações PDF 1.4.
    """
    # Stream de texto formatado
    linhas = [
        f"COFRE DE DOCUMENTOS - SISTEMA SEGURO",
        f"CLASSIFICACAO: {classificacao}",
        f"TITULO: {titulo}",
        "-" * 50,
        "",
    ]
    for p in conteudo.split("\n"):
        linhas.append(p)
    
    stream_content = "BT /F1 12 Tf 50 750 Td 15 TL\n"
    for line in linhas:
        safe_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream_content += f"({safe_line}) '\n"
    stream_content += "ET"

    stream_len = len(stream_content.encode("utf-8"))

    pdf_template = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length {stream_len} >>
stream
{stream_content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
380
%%EOF"""
    return pdf_template.encode("utf-8")

def popular_dados_iniciais(forcar_reset: bool = False):
    """Inicializa tabelas e insere registros de teste caso ainda não existam."""
    init_db()

    # 1. Usuários de Demonstração
    usuarios_seed = [
        {
            "nome": "Carlos",
            "sobrenome": "Silva",
            "cpf": "11144477735",
            "telefone": "81999990001",
            "senha": "Admin@2026",
            "tipo": "ADMINISTRADOR",
            "nivel": "SIGILOSO"
        },
        {
            "nome": "João",
            "sobrenome": "Santos",
            "cpf": "22255588846",
            "telefone": "81988880002",
            "senha": "Usuario@2026",
            "tipo": "USUARIO",
            "nivel": "INTERNO"
        },
        {
            "nome": "Maria",
            "sobrenome": "Oliveira",
            "cpf": "33366699957",
            "telefone": "81977770003",
            "senha": "Usuario@2026",
            "tipo": "USUARIO",
            "nivel": "CONFIDENCIAL"
        },
        {
            "nome": "Ana",
            "sobrenome": "Pereira",
            "cpf": "44477711107",
            "telefone": "81966660004",
            "senha": "Usuario@2026",
            "tipo": "USUARIO",
            "nivel": "SIGILOSO"
        },
        {
            "nome": "Lucas",
            "sobrenome": "Mendes",
            "cpf": "55588822200",
            "telefone": "81955550005",
            "senha": "Usuario@2026",
            "tipo": "USUARIO",
            "nivel": "PUBLICO"
        }
    ]

    admin_id = 1
    for u in usuarios_seed:
        user_existente = obter_usuario_por_cpf(u["cpf"])
        if not user_existente:
            s_hash, salt = hash_password(u["senha"])
            uid = criar_usuario(
                nome=u["nome"],
                sobrenome=u["sobrenome"],
                cpf=u["cpf"],
                telefone=u["telefone"],
                senha_hash=s_hash,
                salt=salt,
                tipo=u["tipo"],
                nivel=u["nivel"],
                terms_accepted=1,
                privacy_accepted=1,
                terms_version="1.0",
                privacy_version="1.0"
            )
            if u["tipo"] == "ADMINISTRADOR":
                admin_id = uid
        else:
            if u["tipo"] == "ADMINISTRADOR":
                admin_id = user_existente["id"]

    # 2. Documentos de Demonstração
    documentos_seed = [
        {
            "titulo": "Manual de Integração Institucional",
            "descricao": "Guia de boas-vindas para novos colaboradores, conduta ética, horários e normas gerais de convivência corporativa.",
            "classificacao": "PUBLICO",
            "conteudo": "Este documento apresenta a missão, visão e valores da organização. Aberto a todo o público e novos integrantes."
        },
        {
            "titulo": "Política Interna de Segurança da Informação",
            "descricao": "Diretrizes de uso de senhas, estações de trabalho, bloqueio de tela e procedimentos de descarte seguro de mídias.",
            "classificacao": "INTERNO",
            "conteudo": "Diretrizes internas obrigatórias: Nunca compartilhar credenciais. Bloquear terminal (Win+L / Ctrl+Alt+L). Reportar incidentes ao CSIRT."
        },
        {
            "titulo": "Contrato de Prestação de Serviços em Nuvem",
            "descricao": "Termos de confidencialidade, SLAs e cláusulas de penalidade financeira firmadas com provedor de infraestrutura.",
            "classificacao": "CONFIDENCIAL",
            "conteudo": "Cláusulas Comerciais e Técnicas restritas. Disponibilidade mínima contratual de 99.98%. Dados protegidos por criptografia de ponta a ponta."
        },
        {
            "titulo": "Relatório Financeiro e Auditoria Contábil 2026",
            "descricao": "Balanço patrimonial consolidado, demonstrativo de fluxo de caixa e projeção de faturamento para o próximo exercício.",
            "classificacao": "CONFIDENCIAL",
            "conteudo": "Demonstrativo de Resultados do Exercício (DRE). Receita líquida anual: R$ 42.500.000,00. Margem EBITDA: 28.4%."
        },
        {
            "titulo": "Plano Estratégico de Expansão, Aquisições e Fusões",
            "descricao": "Mapeamento confidencial de empresas concorrentes para processo de M&A, avaliação de valuation e cronograma de negociação restrita.",
            "classificacao": "SIGILOSO",
            "conteudo": "PLANO ULTRA RESTRITO - NÍVEL MÁXIMO DE SIGILO: Análise de aquisição da Startup Alpha e cronograma confidencial de oferta pública."
        }
    ]

    from backend.database import listar_documentos
    docs_existentes = listar_documentos()
    
    if len(docs_existentes) == 0:
        for doc in documentos_seed:
            pdf_bytes = gerar_pdf_simples(doc["titulo"], doc["classificacao"], doc["conteudo"])
            nome_arquivo_uuid = f"{uuid.uuid4().hex}.pdf"
            caminho_disco = os.path.join(UPLOADS_DIR, nome_arquivo_uuid)
            with open(caminho_disco, "wb") as f:
                f.write(pdf_bytes)
            
            criar_documento(
                titulo=doc["titulo"],
                descricao=doc["descricao"],
                classificacao=doc["classificacao"],
                arquivo_caminho=nome_arquivo_uuid,
                arquivo_nome_original=f"{doc['titulo'].lower().replace(' ', '_')[:30]}.pdf",
                arquivo_tamanho=len(pdf_bytes),
                arquivo_tipo="application/pdf",
                conteudo_texto=doc["conteudo"],
                criado_por_id=admin_id
            )

if __name__ == "__main__":
    popular_dados_iniciais()
    print("Banco de dados inicializado e populado com sucesso.")
