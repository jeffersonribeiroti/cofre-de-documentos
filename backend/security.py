"""
Módulo de Segurança e Criptografia
Implementa hash seguro de senhas com PBKDF2-HMAC-SHA256, geração de salt criptográfico e tokens de sessão.
"""
import hashlib
import hmac
import secrets
from backend.config import PBKDF2_ITERATIONS

def generate_salt() -> str:
    """Gera um salt criptográfico aleatório de 32 bytes em hexadecimal."""
    return secrets.token_hex(32)

def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    """
    Gera o hash da senha utilizando PBKDF2 com HMAC-SHA256 e salt exclusivo.
    Retorna a tupla (hash_hex, salt).
    """
    if not salt:
        salt = generate_salt()
    
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        PBKDF2_ITERATIONS
    )
    return key.hex(), salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """
    Verifica se a senha informada corresponde ao hash armazenado usando hmac.compare_digest
    para prevenir ataques de temporização (timing attacks).
    """
    try:
        calculated_hash, _ = hash_password(password, salt)
        return hmac.compare_digest(calculated_hash, stored_hash)
    except Exception:
        return False

def generate_session_token() -> str:
    """Gera um token de sessão criptograficamente seguro e de alta entropia."""
    return secrets.token_urlsafe(48)
