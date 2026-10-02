"""
Módulo de Armazenamento Seguro de Arquivos
- Gera identificadores UUID aleatórios.
- Valida cabeçalhos binários (magic numbers), tamanho e Path Traversal.
- Criptografa os arquivos em repouso usando Fernet (AES-128-CBC + HMAC-SHA256).
- Descriptografa somente em memória quando o arquivo é solicitado.
"""
import base64
import hashlib
import os
import uuid
from cryptography.fernet import Fernet, InvalidToken

from backend.config import UPLOADS_DIR, MAX_FILE_SIZE_BYTES, ALLOWED_EXTENSIONS, SECRET_KEY
from backend.validators import sanitizar_caminho_arquivo


def _cifra() -> Fernet:
    """Deriva uma chave Fernet estável a partir da chave secreta do sistema."""
    digest = hashlib.sha256(SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _criptografar(conteudo_bytes: bytes) -> bytes:
    return _cifra().encrypt(conteudo_bytes)


def _descriptografar(conteudo_bytes: bytes) -> bytes:
    return _cifra().decrypt(conteudo_bytes)


def _esta_criptografado(conteudo_bytes: bytes) -> bool:
    """Identifica arquivos Fernet sem depender da extensão do arquivo."""
    try:
        _descriptografar(conteudo_bytes)
        return True
    except (InvalidToken, ValueError, TypeError):
        return False


def migrar_arquivos_existentes_para_criptografia() -> int:
    """Criptografa arquivos antigos que ainda estejam armazenados em texto puro."""
    migrados = 0
    if not os.path.isdir(UPLOADS_DIR):
        return 0

    for nome in os.listdir(UPLOADS_DIR):
        caminho = os.path.join(UPLOADS_DIR, nome)
        if not os.path.isfile(caminho):
            continue
        try:
            with open(caminho, "rb") as arquivo:
                conteudo = arquivo.read()
            if not conteudo or _esta_criptografado(conteudo):
                continue
            conteudo_cifrado = _criptografar(conteudo)
            with open(caminho, "wb") as arquivo:
                arquivo.write(conteudo_cifrado)
            migrados += 1
        except Exception:
            # Um arquivo problemático não deve impedir a inicialização do sistema.
            continue
    return migrados


def salvar_arquivo_seguro(conteudo_bytes: bytes, nome_original: str, tipo_mime: str = "application/pdf") -> tuple[bool, str, str, int]:
    """
    Armazena o arquivo criptografado em disco com nome UUID.
    Retorna (sucesso, mensagem_erro, caminho_relativo, tamanho_original_bytes).
    """
    if not conteudo_bytes:
        return False, "O arquivo enviado está vazio.", "", 0

    tamanho = len(conteudo_bytes)
    if tamanho > MAX_FILE_SIZE_BYTES:
        return False, "O arquivo ultrapassa o tamanho máximo permitido de 10 MB.", "", 0

    nome_sanitizado = sanitizar_caminho_arquivo(nome_original)
    _, ext = os.path.splitext(nome_sanitizado.lower())

    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Tipo de arquivo não permitido. Apenas arquivos PDF e TXT são aceitos ({', '.join(ALLOWED_EXTENSIONS)}).", "", 0

    if ext == ".pdf" and not conteudo_bytes.startswith(b"%PDF-"):
        return False, "O arquivo não é um documento PDF válido.", "", 0

    uuid_nome = f"{uuid.uuid4().hex}{ext}"
    caminho_completo = os.path.join(UPLOADS_DIR, uuid_nome)

    try:
        conteudo_cifrado = _criptografar(conteudo_bytes)
        with open(caminho_completo, "wb") as arquivo:
            arquivo.write(conteudo_cifrado)
        return True, "", uuid_nome, tamanho
    except Exception:
        return False, "Não foi possível salvar o arquivo criptografado no armazenamento.", "", 0


def ler_arquivo_seguro(uuid_nome: str) -> tuple[bool, bytes, str]:
    """Lê e descriptografa um arquivo armazenado no disco, mantendo proteção contra Path Traversal."""
    if not uuid_nome:
        return False, b"", ""

    nome_limpo = os.path.basename(uuid_nome)
    caminho_absoluto = os.path.abspath(os.path.join(UPLOADS_DIR, nome_limpo))
    diretorio_uploads = os.path.abspath(UPLOADS_DIR)

    if not (caminho_absoluto == diretorio_uploads or caminho_absoluto.startswith(diretorio_uploads + os.sep)):
        return False, b"", ""

    if not os.path.exists(caminho_absoluto):
        return False, b"", ""

    try:
        with open(caminho_absoluto, "rb") as arquivo:
            conteudo_cifrado = arquivo.read()
        try:
            conteudo = _descriptografar(conteudo_cifrado)
        except InvalidToken:
            # Compatibilidade de transição: arquivos legados serão migrados na inicialização.
            conteudo = conteudo_cifrado
        return True, conteudo, caminho_absoluto
    except Exception:
        return False, b"", ""


def remover_arquivo_seguro(uuid_nome: str) -> bool:
    """Remove o arquivo armazenado com proteção contra Path Traversal."""
    if not uuid_nome:
        return False

    nome_limpo = os.path.basename(uuid_nome)
    caminho_absoluto = os.path.abspath(os.path.join(UPLOADS_DIR, nome_limpo))
    diretorio_uploads = os.path.abspath(UPLOADS_DIR)

    if (caminho_absoluto == diretorio_uploads or caminho_absoluto.startswith(diretorio_uploads + os.sep)) and os.path.exists(caminho_absoluto):
        try:
            os.remove(caminho_absoluto)
            return True
        except Exception:
            return False
    return False
