"""
Módulo de Auditoria do Cofre de Documentos
Registra trilha de auditoria para todas as operações críticas e tentativas de acesso.
NUNCA armazena senhas ou dados confidenciais nos logs.
"""
from backend.database import registrar_evento_auditoria

def auditar(
    usuario: dict,
    acao: str,
    documento: dict = None,
    resultado: str = "SUCESSO",
    detalhes: str = None,
    ip: str = "127.0.0.1"
):
    """
    Registra um evento formal de auditoria.
    """
    user_id = usuario.get("id") if usuario else None
    user_nome = f"{usuario.get('nome', '')} {usuario.get('sobrenome', '')}".strip() if usuario else "Anônimo"
    user_cpf = usuario.get("cpf", "N/A") if usuario else "N/A"
    nivel_user = usuario.get("nivel_autorizacao", "N/A") if usuario else "N/A"

    doc_id = documento.get("id") if documento else None
    doc_titulo = documento.get("titulo") if documento else None
    doc_classif = documento.get("classificacao") if documento else None

    # Sanitiza detalhes para garantir que nenhuma senha seja inserida
    detalhes_seguros = str(detalhes)[:300] if detalhes else None

    registrar_evento_auditoria(
        usuario_id=user_id,
        usuario_nome=user_nome,
        usuario_cpf=user_cpf,
        acao=acao,
        documento_id=doc_id,
        documento_titulo=doc_titulo,
        classificacao_documento=doc_classif,
        nivel_usuario=nivel_user,
        resultado=resultado,
        detalhes=detalhes_seguros,
        ip=ip
    )
