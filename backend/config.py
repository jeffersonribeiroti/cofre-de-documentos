"""
Configurações centrais do Cofre de Documentos
"""
import os
import secrets

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
DB_PATH = os.path.join(DATA_DIR, "cofre.db")

# Garante que os diretórios necessários existem
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Parâmetros de Segurança
SECRET_KEY_FILE = os.path.join(DATA_DIR, ".cofre_secret_key")

def _obter_secret_key() -> str:
    """Obtém uma chave estável para criptografia local e aceita sobrescrita por variável de ambiente."""
    chave_env = os.environ.get("COFRE_SECRET_KEY")
    if chave_env:
        return chave_env

    try:
        if os.path.exists(SECRET_KEY_FILE):
            with open(SECRET_KEY_FILE, "r", encoding="utf-8") as arquivo:
                chave = arquivo.read().strip()
                if chave:
                    return chave

        chave = secrets.token_urlsafe(48)
        with open(SECRET_KEY_FILE, "w", encoding="utf-8") as arquivo:
            arquivo.write(chave)
        try:
            os.chmod(SECRET_KEY_FILE, 0o600)
        except OSError:
            pass
        return chave
    except OSError:
        # Fallback apenas quando o ambiente não permite persistir um arquivo local.
        return secrets.token_urlsafe(48)

SECRET_KEY = _obter_secret_key()
SESSION_EXPIRATION_HOURS = 8
PBKDF2_ITERATIONS = 600000

# Limites de Arquivo
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = ["application/pdf", "text/plain"]
ALLOWED_EXTENSIONS = [".pdf", ".txt"]

# Limites de Caracteres
MAX_NOME_LEN = 100
MAX_SOBRENOME_LEN = 100
MAX_TITULO_LEN = 150
MIN_TITULO_LEN = 3
MAX_DESCRICAO_LEN = 1000
MIN_SENHA_LEN = 8
MAX_SENHA_LEN = 128

# Níveis de Classificação e Hierarquia
CLASSIFICACOES = ["PUBLICO", "INTERNO", "CONFIDENCIAL", "SIGILOSO"]
HIERARQUIA = {
    "PUBLICO": 1,
    "INTERNO": 2,
    "CONFIDENCIAL": 3,
    "SIGILOSO": 4
}

TIPOS_USUARIO = ["ADMINISTRADOR", "USUARIO"]
STATUS_USUARIO = ["ATIVO", "INATIVO"]

# ==========================================
# CONFIGURAÇÕES DE RATE LIMITING
# SECURITY: Rate Limiting
# ==========================================
RATE_LIMIT_LOGIN = {"max_requests": 5, "window_seconds": 60}       # 5 tentativas por minuto por IP
RATE_LIMIT_API_GERAL = {"max_requests": 100, "window_seconds": 60} # 100 requisições por minuto por IP
RATE_LIMIT_CONSULTAS = {"max_requests": 60, "window_seconds": 60}  # 60 consultas por minuto por IP
RATE_LIMIT_UPLOAD = {"max_requests": 10, "window_seconds": 60}     # 10 uploads por minuto por IP

# ==========================================
# CONFIGURAÇÕES INSTITUCIONAIS E LEGAIS (LGPD)
# PRIVACY: Legal Documents Acceptance
# ==========================================
LEGAL_CONFIG = {
    "controlador_razao_social": "Cofre de Documentos Segurança da Informação S.A.",
    "cnpj": "12.345.678/0001-90",
    "endereco": "Av. Governador Agamenon Magalhães, 1000 - Recife/PE, Brasil",
    "email_contato": "privacidade@cofredocumentos.seg.br",
    "canal_atendimento": "https://suporte.cofredocumentos.seg.br",
    "encarregado_dpo": "Encarregado de Proteção de Dados (DPO)",
    "dpo_email": "dpo@cofredocumentos.seg.br",
    "terms_version": "1.0",
    "terms_updated_at": "2026-09-01",
    "privacy_version": "1.0",
    "privacy_updated_at": "2026-09-01"
}

