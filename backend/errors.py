"""
Módulo de Tratamento Centralizado de Erros
SECURITY: Global Error Handling
Garante respostas amigáveis padronizadas em formato JSON para 400, 401, 403, 404, 405, 429 e 500.
NUNCA vaza stack traces, caminhos internos, consultas SQL ou dados sensíveis para o cliente.
"""
import uuid
from typing import Dict, Any, Optional

MENSAGENS_PADRAO = {
    400: "Requisição inválida. Verifique os parâmetros enviados.",
    401: "Autenticação necessária ou credenciais inválidas.",
    403: "Acesso não autorizado. Você não possui permissão para este recurso.",
    404: "Recurso ou endpoint não encontrado.",
    405: "Método HTTP não permitido para este endpoint.",
    429: "Muitas requisições. Limite temporário atingido, aguarde antes de tentar novamente.",
    500: "Ocorreu um erro interno no servidor. Tente novamente em instantes."
}

def gerar_request_id() -> str:
    """Gera um identificador único de rastreamento para a requisição."""
    return f"req_{uuid.uuid4().hex[:12]}"

def formatar_resposta_erro(
    codigo: int,
    mensagem: Optional[str] = None,
    request_id: Optional[str] = None,
    detalhes_extras: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Constrói a resposta padronizada de erro.
    SECURITY: Global Error Handling
    """
    if not request_id:
        request_id = gerar_request_id()

    msg = mensagem if mensagem else MENSAGENS_PADRAO.get(codigo, "Ocorreu um erro inesperado.")

    resposta = {
        "sucesso": False,
        "erro": msg,
        "codigo": codigo,
        "request_id": request_id
    }

    if detalhes_extras and isinstance(detalhes_extras, dict):
        for k, v in detalhes_extras.items():
            # Não permite inclusão de dados perigosos
            if k not in ("senha", "token", "salt", "secret", "stack"):
                resposta[k] = v

    return resposta
