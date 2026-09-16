"""
Módulo de Armazenamento Seguro de Arquivos
Gera identificadores UUID aleatórios para armazenamento em disco,
valida cabeçalhos binários (magic numbers), tamanho e previne Path Traversal.
"""
import os
import uuid
from backend.config import UPLOADS_DIR, MAX_FILE_SIZE_BYTES, ALLOWED_EXTENSIONS
from backend.validators import sanitizar_caminho_arquivo

def salvar_arquivo_seguro(conteudo_bytes: bytes, nome_original: str, tipo_mime: str = "application/pdf") -> tuple[bool, str, str, int]:
    """
    Armazena o arquivo com nome UUID no diretório seguro.
    Retorna (sucesso, mensagem_erro, caminho_relativo, tamanho_bytes).
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

    # Validação adicional de Magic Bytes para PDFs
    if ext == ".pdf":
        if not conteudo_bytes.startswith(b"%PDF-"):
            return False, "O arquivo não é um documento PDF válido.", "", 0

    # Gera nome interno seguro com UUID
    uuid_nome = f"{uuid.uuid4().hex}{ext}"
    caminho_completo = os.path.join(UPLOADS_DIR, uuid_nome)

    try:
        with open(caminho_completo, "wb") as f:
            f.write(conteudo_bytes)
        return True, "", uuid_nome, tamanho
    except Exception:
        return False, "Não foi possível salvar o arquivo no armazenamento.", "", 0

def ler_arquivo_seguro(uuid_nome: str) -> tuple[bool, bytes, str]:
    """
    Lê o arquivo do disco com proteção estrita contra Path Traversal.
    Retorna (sucesso, bytes, caminho_absoluto).
    """
    if not uuid_nome:
        return False, b"", ""

    # Garante que não há caracteres como ../ ou diretórios
    nome_limpo = os.path.basename(uuid_nome)
    caminho_absoluto = os.path.abspath(os.path.join(UPLOADS_DIR, nome_limpo))

    # Verifica se o caminho final permanece estritamente dentro de UPLOADS_DIR
    if not caminho_absoluto.startswith(os.path.abspath(UPLOADS_DIR)):
        return False, b"", ""

    if not os.path.exists(caminho_absoluto):
        return False, b"", ""

    try:
        with open(caminho_absoluto, "rb") as f:
            return True, f.read(), caminho_absoluto
    except Exception:
        return False, b"", ""

def remover_arquivo_seguro(uuid_nome: str) -> bool:
    """Remove o arquivo do disco com proteção contra Path Traversal."""
    if not uuid_nome:
        return False
    nome_limpo = os.path.basename(uuid_nome)
    caminho_absoluto = os.path.abspath(os.path.join(UPLOADS_DIR, nome_limpo))
    if caminho_absoluto.startswith(os.path.abspath(UPLOADS_DIR)) and os.path.exists(caminho_absoluto):
        try:
            os.remove(caminho_absoluto)
            return True
        except Exception:
            return False
    return False
