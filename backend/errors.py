"""
Módulo de Tratamento Centralizado de Erros
SECURITY: Global Error Handling

Garante respostas amigáveis padronizadas em formato JSON.
NUNCA permite que dados sensíveis sejam enviados ao cliente.
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

# Campos que nunca devem ser enviados ao cliente.
CAMPOS_SENSIVEIS = {
    "senha",
    "password",
    "senha_hash",
    "salt",
    "token",
    "secret",
    "secret_key",
    "api_key",
    "apikey",
    "authorization",
    "cookie",
    "stack",
    "traceback"
}


def gerar_request_id() -> str:
    """Gera um identificador único de rastreamento para a requisição."""
    return f"req_{uuid.uuid4().hex[:12]}"


def _filtrar_dados_sensiveis(valor: Any) -> Any:
    """
    Remove recursivamente informações sensíveis de dicionários
    e estruturas aninhadas antes de enviá-las ao cliente.
    """
    if isinstance(valor, dict):
        resultado = {}

        for chave, conteudo in valor.items():
            chave_normalizada = str(chave).strip().lower()

            if chave_normalizada in CAMPOS_SENSIVEIS:
                continue

            resultado[chave] = _filtrar_dados_sensiveis(conteudo)

        return resultado

    if isinstance(valor, list):
        return [_filtrar_dados_sensiveis(item) for item in valor]

    if isinstance(valor, tuple):
        return tuple(_filtrar_dados_sensiveis(item) for item in valor)

    return valor


def formatar_resposta_erro(
    codigo: int,
    mensagem: Optional[str] = None,
    request_id: Optional[str] = None,
    detalhes_extras: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Constrói a resposta padronizada de erro.

    SECURITY:
    Dados sensíveis são filtrados recursivamente antes
    de serem retornados ao cliente.
    """
    if not request_id:
        request_id = gerar_request_id()

    msg = mensagem if mensagem else MENSAGENS_PADRAO.get(
        codigo,
        "Ocorreu um erro inesperado."
    )

    resposta = {
        "sucesso": False,
        "erro": msg,
        "codigo": codigo,
        "request_id": request_id
    }

    if detalhes_extras and isinstance(detalhes_extras, dict):
        dados_filtrados = _filtrar_dados_sensiveis(detalhes_extras)
        resposta.update(dados_filtrados)

    return resposta