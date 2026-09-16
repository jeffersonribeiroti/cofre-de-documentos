"""
Módulo de Controle de Acesso e Classificação da Informação
Implementa o Princípio do Menor Privilégio e a Hierarquia de Segurança:
PUBLICO (1) -> INTERNO (2) -> CONFIDENCIAL (3) -> SIGILOSO (4)
"""
from backend.config import HIERARQUIA

def obter_nivel_numerico(nivel: str) -> int:
    """Retorna o nível numérico da classificação ou 0 se desconhecido."""
    if not nivel:
        return 0
    return HIERARQUIA.get(str(nivel).upper(), 0)

def verificar_permissao_documento(usuario: dict, classificacao_documento: str) -> bool:
    """
    Função centralizada de verificação de acesso a documentos:
    1. Identifica o usuário e seu status ativo.
    2. Identifica o nível de autorização do usuário e a classificação do documento.
    3. Compara os níveis na hierarquia.
    4. Se for ADMINISTRADOR com nível SIGILOSO, tem acesso pleno. Se for USUÁRIO, segue estritamente a hierarquia.
    """
    if not usuario or usuario.get("status") != "ATIVO":
        return False

    # Usuário do tipo Administrador pode visualizar todos se seu nível for SIGILOSO
    tipo = usuario.get("tipo", "").upper()
    nivel_usuario = usuario.get("nivel_autorizacao", "PUBLICO").upper()
    nivel_doc = str(classificacao_documento).upper()

    peso_usuario = obter_nivel_numerico(nivel_usuario)
    peso_doc = obter_nivel_numerico(nivel_doc)

    if peso_doc == 0:
        return False

    # Administrador tem acesso integral se tiver nível igual ou superior
    # Para visualização, a regra de autorização por clearance se aplica:
    return peso_usuario >= peso_doc

def pode_gerenciar_sistema(usuario: dict) -> bool:
    """Verifica se o usuário possui perfil de Administrador ativo."""
    if not usuario or usuario.get("status") != "ATIVO":
        return False
    return usuario.get("tipo", "").upper() == "ADMINISTRADOR"

def pode_gerenciar_documentos(usuario: dict) -> bool:
    """Verifica se o usuário pode cadastrar, editar ou excluir documentos."""
    return pode_gerenciar_sistema(usuario)

def pode_gerenciar_usuarios(usuario: dict) -> bool:
    """Verifica se o usuário pode cadastrar, editar ou desativar usuários."""
    return pode_gerenciar_sistema(usuario)

def pode_visualizar_auditoria(usuario: dict) -> bool:
    """Verifica se o usuário pode visualizar os registros de auditoria."""
    return pode_gerenciar_sistema(usuario)
