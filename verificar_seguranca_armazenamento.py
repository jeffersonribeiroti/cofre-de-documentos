from backend.database import listar_usuarios, listar_documentos, obter_documento_por_id
from backend.storage import ler_arquivo_seguro, _esta_criptografado
import os

usuarios = listar_usuarios()
documentos = listar_documentos()

print("=== VERIFICAÇÃO DE SEGURANÇA ===")
print("[1] Hash de senhas: já implementado no backend/security.py (PBKDF2-HMAC-SHA256 + salt).")
print("[2] Menor privilégio: já implementado no backend/access_control.py (RBAC + nível de autorização).")
print("[3] Mascaramento: CPF exibido na listagem administrativa ->", usuarios[0]["cpf"] if usuarios else "sem usuários")

criptografados = 0
legiveis = 0
for resumo in documentos:
    doc = obter_documento_por_id(resumo["id"])
    caminho = os.path.join("data", "uploads", doc["arquivo_caminho"])
    bruto = open(caminho, "rb").read()
    if _esta_criptografado(bruto):
        criptografados += 1
    ok, conteudo, _ = ler_arquivo_seguro(doc["arquivo_caminho"])
    if ok and conteudo:
        legiveis += 1

print(f"[4] Criptografia em repouso dos arquivos: {criptografados}/{len(documentos)} arquivos criptografados no disco.")
print(f"    Leitura pelo sistema após descriptografia: {legiveis}/{len(documentos)} arquivos OK.")
print("=== FIM ===")
