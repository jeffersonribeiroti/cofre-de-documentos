"""
Módulo de Validação e Sanitização de Entradas
Implementa a regra 'Não confie em dados enviados pelo usuário'.
Todas as entradas passam por checagens rigorosas de tamanho, formato e regras matemáticas.
"""
import re
import os
from backend.config import (
    MAX_NOME_LEN, MAX_SOBRENOME_LEN, MAX_TITULO_LEN, MIN_TITULO_LEN,
    MAX_DESCRICAO_LEN, MIN_SENHA_LEN, MAX_SENHA_LEN,
    CLASSIFICACOES, TIPOS_USUARIO, STATUS_USUARIO
)

def sanitizar_apenas_digitos(valor: str) -> str:
    """Remove qualquer caractere que não seja dígito numérico."""
    if not valor:
        return ""
    return re.sub(r"\D", "", str(valor))

def formatar_cpf(cpf_limpo: str) -> str:
    """Aplica a máscara visual 000.000.000-00 a um CPF de 11 dígitos."""
    if len(cpf_limpo) != 11:
        return cpf_limpo
    return f"{cpf_limpo[0:3]}.{cpf_limpo[3:6]}.{cpf_limpo[6:9]}-{cpf_limpo[9:11]}"

def mascarar_cpf(cpf_limpo: str) -> str:
    """Mascara o CPF para exibição, preservando somente os quatro últimos dígitos."""
    if not cpf_limpo:
        return ""
    digitos = sanitizar_apenas_digitos(cpf_limpo)
    if len(digitos) != 11:
        return cpf_limpo
    return f"***.***.***-{digitos[-2:]}"

def formatar_telefone(tel_limpo: str) -> str:
    """Aplica a máscara visual (00) 00000-0000 ou (00) 0000-0000."""
    if len(tel_limpo) == 11:
        return f"({tel_limpo[0:2]}) {tel_limpo[2:7]}-{tel_limpo[7:11]}"
    elif len(tel_limpo) == 10:
        return f"({tel_limpo[0:2]}) {tel_limpo[2:6]}-{tel_limpo[6:10]}"
    return tel_limpo

def validar_cpf(cpf_input: str) -> tuple[bool, str, str]:
    """
    Validação matemática oficial do CPF brasileiro por módulo 11.
    Retorna (valido, mensagem, cpf_limpo).
    """
    if not cpf_input or not isinstance(cpf_input, str):
        return False, "CPF é obrigatório.", ""

    cpf_limpo = sanitizar_apenas_digitos(cpf_input)

    if len(cpf_limpo) != 11:
        return False, "CPF inválido. Deve conter exatamente 11 dígitos.", ""

    # Bloqueia sequências repetitivas conhecidas (ex: 111.111.111-11, 000.000.000-00)
    if cpf_limpo in [str(i) * 11 for i in range(10)]:
        return False, "CPF inválido.", ""

    # Cálculo do 1º Dígito Verificador
    soma = sum(int(cpf_limpo[i]) * (10 - i) for i in range(9))
    resto = (soma * 10) % 11
    digito_1 = 0 if resto == 10 or resto == 11 else resto

    if int(cpf_limpo[9]) != digito_1:
        return False, "CPF inválido.", ""

    # Cálculo do 2º Dígito Verificador
    soma = sum(int(cpf_limpo[i]) * (11 - i) for i in range(10))
    resto = (soma * 10) % 11
    digito_2 = 0 if resto == 10 or resto == 11 else resto

    if int(cpf_limpo[10]) != digito_2:
        return False, "CPF inválido.", ""

    return True, "", cpf_limpo

def validar_telefone(tel_input: str) -> tuple[bool, str, str]:
    """
    Validação de telefone brasileiro (DDD 2 dígitos + número 8 ou 9 dígitos).
    Retorna (valido, mensagem, tel_limpo).
    """
    if not tel_input or not isinstance(tel_input, str):
        return False, "Telefone é obrigatório.", ""

    tel_limpo = sanitizar_apenas_digitos(tel_input)

    if len(tel_limpo) not in (10, 11):
        return False, "Telefone inválido. Deve conter 10 ou 11 dígitos com DDD.", ""

    # DDD válido (11 a 99)
    ddd = int(tel_limpo[:2])
    if ddd < 11 or ddd > 99:
        return False, "DDD do telefone inválido.", ""

    # Para celulares com 11 dígitos, o 3º dígito deve ser 9
    if len(tel_limpo) == 11 and tel_limpo[2] != '9':
        return False, "Celulares de 11 dígitos devem iniciar com o dígito 9 após o DDD.", ""

    return True, "", tel_limpo

def validar_nome(nome_input: str, campo: str = "Nome") -> tuple[bool, str, str]:
    """
    Validação e sanitização de nome e sobrenome.
    Retorna (valido, mensagem, nome_sanitizado).
    """
    if not nome_input or not isinstance(nome_input, str):
        return False, f"{campo} é obrigatório.", ""

    nome_limpo = nome_input.strip()

    if len(nome_limpo) == 0:
        return False, f"{campo} não pode ser vazio ou conter apenas espaços.", ""

    if len(nome_limpo) < 2:
        return False, f"{campo} deve possuir no mínimo 2 caracteres.", ""

    max_len = MAX_NOME_LEN if campo == "Nome" else MAX_SOBRENOME_LEN
    if len(nome_limpo) > max_len:
        return False, f"{campo} não pode ultrapassar {max_len} caracteres.", ""

    # Aceita letras, acentuações da língua portuguesa, apóstrofos e hífens
    if not re.match(r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-]+$", nome_limpo):
        return False, f"{campo} contém caracteres inválidos.", ""

    return True, "", nome_limpo

def validar_senha(senha: str, confirmacao: str = None) -> tuple[bool, str]:
    """
    Validação da política de senhas fortes:
    - Mínimo de 8 caracteres
    - Pelo menos uma maiúscula
    - Pelo menos uma minúscula
    - Pelo menos um número
    - Pelo menos um caractere especial
    - Confirmação idêntica (se fornecida)
    """
    if not senha or not isinstance(senha, str):
        return False, "Senha é obrigatória."

    if len(senha) < MIN_SENHA_LEN:
        return False, f"A senha deve ter no mínimo {MIN_SENHA_LEN} caracteres."

    if len(senha) > MAX_SENHA_LEN:
        return False, f"A senha deve ter no máximo {MAX_SENHA_LEN} caracteres."

    if not re.search(r"[A-Z]", senha):
        return False, "A senha deve conter pelo menos uma letra maiúscula."

    if not re.search(r"[a-z]", senha):
        return False, "A senha deve conter pelo menos uma letra minúscula."

    if not re.search(r"[0-9]", senha):
        return False, "A senha deve conter pelo menos um número."

    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?~`]", senha):
        return False, "A senha deve conter pelo menos um caractere especial (!@#$%&*...)."

    if confirmacao is not None and senha != confirmacao:
        return False, "A senha e a confirmação de senha não são iguais."

    return True, ""

def validar_titulo_documento(titulo: str) -> tuple[bool, str, str]:
    """
    Validação do título do documento (3 a 150 caracteres).
    """
    if not titulo or not isinstance(titulo, str):
        return False, "Título do documento é obrigatório.", ""

    titulo_limpo = titulo.strip()

    if len(titulo_limpo) < MIN_TITULO_LEN or len(titulo_limpo) > MAX_TITULO_LEN:
        return False, f"O título deve possuir entre {MIN_TITULO_LEN} e {MAX_TITULO_LEN} caracteres.", ""

    return True, "", titulo_limpo

def validar_descricao_documento(descricao: str) -> tuple[bool, str, str]:
    """
    Validação da descrição do documento (até 1000 caracteres).
    """
    if not descricao:
        return True, "", ""

    if not isinstance(descricao, str):
        return False, "Formato de descrição inválido.", ""

    desc_limpa = descricao.strip()

    if len(desc_limpa) > MAX_DESCRICAO_LEN:
        return False, f"A descrição ultrapassa o limite permitido de {MAX_DESCRICAO_LEN} caracteres.", ""

    return True, "", desc_limpa

def validar_classificacao(classif: str) -> tuple[bool, str]:
    """Valida se a classificação pertence estritamente ao enum permitido."""
    if not classif or classif.upper() not in CLASSIFICACOES:
        return False, "Classificação inválida. Escolha entre: PÚBLICO, INTERNO, CONFIDENCIAL ou SIGILOSO."
    return True, ""

def validar_tipo_usuario(tipo: str) -> tuple[bool, str]:
    """Valida se o tipo de usuário é ADMINISTRADOR ou USUARIO."""
    if not tipo or tipo.upper() not in TIPOS_USUARIO:
        return False, "Tipo de usuário inválido."
    return True, ""

def sanitizar_caminho_arquivo(nome_arquivo: str) -> str:
    """Prevenção contra Path Traversal (ex: ../../etc/passwd)."""
    nome_base = os.path.basename(nome_arquivo)
    # Remove caracteres de controle e perigosos
    nome_seguro = re.sub(r"[^\w\.\-]", "_", nome_base)
    return nome_seguro

def validar_aceite_termos_privacidade(dados: dict) -> tuple[bool, str]:
    """
    Validação obrigatória de aceite dos Termos de Uso e Política de Privacidade (LGPD).
    PRIVACY: Legal Documents Acceptance
    Nunca confia apenas no frontend: valida no backend se ambos os aceites foram expressos como verdadeiros.
    """
    if not isinstance(dados, dict):
        return False, "Dados cadastrais inválidos."

    terms_accepted = dados.get("terms_accepted")
    privacy_accepted = dados.get("privacy_accepted")

    # Aceita True booleano ou valores equivalentes 1/'true'
    is_terms_ok = terms_accepted is True or terms_accepted == 1 or str(terms_accepted).lower() == "true"
    is_privacy_ok = privacy_accepted is True or privacy_accepted == 1 or str(privacy_accepted).lower() == "true"

    if not is_terms_ok or not is_privacy_ok:
        return False, "Para criar sua conta, é necessário aceitar os Termos de Uso e confirmar ciência da Política de Privacidade."

    return True, ""

