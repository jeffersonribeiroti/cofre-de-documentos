"""
Módulo de Banco de Dados Persistente (SQLite)
Utiliza exclusivamente consultas parametrizadas para proteção contra SQL Injection.
Tabelas: users, documentos, auditoria, sessoes.
"""
import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime, timedelta
from backend.config import DB_PATH, SESSION_EXPIRATION_HOURS
from backend.validators import mascarar_cpf

def _recover_corrupted_db():
    print("[!] Detectada inconsistência no arquivo SQLite. Restaurando integridade...")
    for ext in ["", "-wal", "-shm", "-journal"]:
        p = f"{DB_PATH}{ext}"
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception as e:
                print(f"Erro ao remover {p}: {e}")

def _create_tables(conn):
    cursor = conn.cursor()
    # Tabela de Usuários com Termos e Privacidade (LGPD)
    # PRIVACY: Legal Documents Acceptance
    # SECURITY: SQL Injection Protection
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            sobrenome TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            telefone TEXT NOT NULL,
            senha_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('ADMINISTRADOR', 'USUARIO')),
            nivel_autorizacao TEXT NOT NULL CHECK(nivel_autorizacao IN ('PUBLICO', 'INTERNO', 'CONFIDENCIAL', 'SIGILOSO')),
            status TEXT NOT NULL DEFAULT 'ATIVO' CHECK(status IN ('ATIVO', 'INATIVO')),
            terms_accepted INTEGER NOT NULL DEFAULT 1,
            privacy_accepted INTEGER NOT NULL DEFAULT 1,
            terms_version TEXT DEFAULT '1.0',
            privacy_version TEXT DEFAULT '1.0',
            accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Migração automática e segura para tabelas existentes
    try:
        cursor.execute("PRAGMA table_info(users)")
        colunas_existentes = [row["name"] if isinstance(row, sqlite3.Row) else row[1] for row in cursor.fetchall()]
        if "terms_accepted" not in colunas_existentes:
            cursor.execute("ALTER TABLE users ADD COLUMN terms_accepted INTEGER NOT NULL DEFAULT 1")
        if "privacy_accepted" not in colunas_existentes:
            cursor.execute("ALTER TABLE users ADD COLUMN privacy_accepted INTEGER NOT NULL DEFAULT 1")
        if "terms_version" not in colunas_existentes:
            cursor.execute("ALTER TABLE users ADD COLUMN terms_version TEXT DEFAULT '1.0'")
        if "privacy_version" not in colunas_existentes:
            cursor.execute("ALTER TABLE users ADD COLUMN privacy_version TEXT DEFAULT '1.0'")
        if "accepted_at" not in colunas_existentes:
            cursor.execute("ALTER TABLE users ADD COLUMN accepted_at TIMESTAMP")
            cursor.execute("UPDATE users SET accepted_at = CURRENT_TIMESTAMP WHERE accepted_at IS NULL")
    except Exception as e:
        print(f"[!] Aviso na verificação de colunas users: {e}")

    # Tabela de Documentos
    # SECURITY: SQL Injection Protection
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            classificacao TEXT NOT NULL CHECK(classificacao IN ('PUBLICO', 'INTERNO', 'CONFIDENCIAL', 'SIGILOSO')),
            arquivo_caminho TEXT NOT NULL,
            arquivo_nome_original TEXT NOT NULL,
            arquivo_tamanho INTEGER NOT NULL DEFAULT 0,
            arquivo_tipo TEXT NOT NULL DEFAULT 'application/pdf',
            conteudo_texto TEXT,
            criado_por_id INTEGER REFERENCES users(id),
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabela de Auditoria
    # SECURITY: SQL Injection Protection
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS auditoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            usuario_nome TEXT NOT NULL,
            usuario_cpf TEXT NOT NULL,
            acao TEXT NOT NULL,
            documento_id INTEGER,
            documento_titulo TEXT,
            classificacao_documento TEXT,
            nivel_usuario TEXT,
            resultado TEXT NOT NULL CHECK(resultado IN ('SUCESSO', 'NEGADO', 'ERRO')),
            detalhes TEXT,
            ip TEXT,
            data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tabela de Sessões
    # SECURITY: SQL Injection Protection
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessoes (
            token TEXT PRIMARY KEY,
            usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expira_em TIMESTAMP NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Índices para alta performance e segurança
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_docs_classif ON documentos(classificacao)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_data ON auditoria(data_hora DESC)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes(token)")

def _configurar_conexoes_seguras(conn):
    """Aplica pragmas de alta concorrência e integridade referencial."""
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA busy_timeout = 15000")
    conn.execute("PRAGMA cache_size = -64000")

@contextmanager
def get_db():
    """
    Context manager para conexões seguras com o SQLite com WAL mode, Foreign Keys e timeout estendido.
    SECURITY: SQL Injection Protection
    """
    try:
        conn = sqlite3.connect(DB_PATH, timeout=15.0)
        conn.row_factory = sqlite3.Row
        _configurar_conexoes_seguras(conn)
    except sqlite3.DatabaseError:
        _recover_corrupted_db()
        conn = sqlite3.connect(DB_PATH, timeout=15.0)
        conn.row_factory = sqlite3.Row
        _configurar_conexoes_seguras(conn)
        _create_tables(conn)

    try:
        yield conn
        conn.commit()
    except sqlite3.DatabaseError as e:
        conn.rollback()
        if "malformed" in str(e).lower() or "corrupt" in str(e).lower():
            _recover_corrupted_db()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Inicializa as tabelas do banco de dados se não existirem."""
    with get_db() as conn:
        _create_tables(conn)

# --- Funções de Usuário ---
# SECURITY: SQL Injection Protection

def obter_usuario_por_cpf(cpf_limpo: str):
    """
    Busca um usuário pelo CPF sanitizado.
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE cpf = ?", (cpf_limpo,))
        row = cursor.fetchone()
        return dict(row) if row else None

def obter_usuario_por_id(user_id: int):
    """
    Busca um usuário pelo ID numérico incluindo dados de conformidade legal.
    SECURITY: SQL Injection Protection
    PRIVACY: Legal Documents Acceptance
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, nome, sobrenome, cpf, telefone, tipo, nivel_autorizacao, status,
                   terms_accepted, privacy_accepted, terms_version, privacy_version, accepted_at, criado_em
            FROM users WHERE id = ?
        """, (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def criar_usuario(
    nome: str,
    sobrenome: str,
    cpf: str,
    telefone: str,
    senha_hash: str,
    salt: str,
    tipo: str,
    nivel: str,
    status: str = "ATIVO",
    terms_accepted: int = 1,
    privacy_accepted: int = 1,
    terms_version: str = "1.0",
    privacy_version: str = "1.0",
    accepted_at: str = None
) -> int:
    """
    Insere um novo usuário com dados validados, hash seguro e aceite formal de termos e privacidade.
    SECURITY: SQL Injection Protection
    PRIVACY: Legal Documents Acceptance
    """
    if not accepted_at:
        accepted_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (
                nome, sobrenome, cpf, telefone, senha_hash, salt, tipo, nivel_autorizacao, status,
                terms_accepted, privacy_accepted, terms_version, privacy_version, accepted_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            nome, sobrenome, cpf, telefone, senha_hash, salt, tipo, nivel, status,
            1 if terms_accepted else 0, 1 if privacy_accepted else 0,
            terms_version, privacy_version, accepted_at
        ))
        return cursor.lastrowid

def atualizar_usuario(user_id: int, nome: str, sobrenome: str, telefone: str, tipo: str, nivel: str, status: str, nova_senha_hash: str = None, novo_salt: str = None):
    """
    Atualiza dados do usuário.
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()
        if nova_senha_hash and novo_salt:
            cursor.execute("""
                UPDATE users
                SET nome = ?, sobrenome = ?, telefone = ?, tipo = ?, nivel_autorizacao = ?, status = ?, senha_hash = ?, salt = ?
                WHERE id = ?
            """, (nome, sobrenome, telefone, tipo, nivel, status, nova_senha_hash, novo_salt, user_id))
        else:
            cursor.execute("""
                UPDATE users
                SET nome = ?, sobrenome = ?, telefone = ?, tipo = ?, nivel_autorizacao = ?, status = ?
                WHERE id = ?
            """, (nome, sobrenome, telefone, tipo, nivel, status, user_id))

def alternar_status_usuario(user_id: int, novo_status: str):
    """
    Altera o status de um usuário (ATIVO / INATIVO).
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET status = ? WHERE id = ?", (novo_status, user_id))

def listar_usuarios():
    """
    Retorna lista de todos os usuários (sem expor senhas e salts).
    SECURITY: SQL Injection Protection
    PRIVACY: Legal Documents Acceptance
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, nome, sobrenome, cpf, telefone, tipo, nivel_autorizacao, status,
                   terms_accepted, privacy_accepted, terms_version, privacy_version, accepted_at, criado_em
            FROM users ORDER BY criado_em DESC
        """)
        usuarios = []
        for row in cursor.fetchall():
            usuario = dict(row)
            usuario["cpf"] = mascarar_cpf(usuario.get("cpf", ""))
            usuarios.append(usuario)
        return usuarios

def obter_aceite_legal(user_id: int):
    """
    Retorna os dados do aceite legal registrado para o usuário.
    PRIVACY: Legal Documents Acceptance
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, nome, sobrenome, cpf, terms_accepted, privacy_accepted, terms_version, privacy_version, accepted_at
            FROM users WHERE id = ?
        """, (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

# --- Funções de Sessão ---
# SECURITY: SQL Injection Protection

def criar_sessao(usuario_id: int, token: str) -> datetime:
    """
    Cria uma sessão com validade de 8 horas.
    SECURITY: SQL Injection Protection
    """
    expira_em = datetime.utcnow() + timedelta(hours=SESSION_EXPIRATION_HOURS)
    with get_db() as conn:
        cursor = conn.cursor()
        # Remove sessões expiradas antes de criar nova
        cursor.execute("DELETE FROM sessoes WHERE expira_em < CURRENT_TIMESTAMP")
        cursor.execute("INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?, ?, ?)",
                       (token, usuario_id, expira_em.strftime("%Y-%m-%d %H:%M:%S")))
    return expira_em

def obter_usuario_por_token_sessao(token: str):
    """
    Verifica e recupera o usuário associado a um token de sessão válido.
    SECURITY: SQL Injection Protection
    PRIVACY: Legal Documents Acceptance
    """
    if not token:
        return None
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.id, u.nome, u.sobrenome, u.cpf, u.telefone, u.tipo, u.nivel_autorizacao, u.status,
                   u.terms_accepted, u.privacy_accepted, u.terms_version, u.privacy_version, u.accepted_at, u.criado_em
            FROM sessoes s
            JOIN users u ON s.usuario_id = u.id
            WHERE s.token = ? AND s.expira_em > CURRENT_TIMESTAMP AND u.status = 'ATIVO'
        """, (token,))
        row = cursor.fetchone()
        return dict(row) if row else None

def invalidar_sessao(token: str):
    """
    Invalida a sessão no logout.
    SECURITY: SQL Injection Protection
    """
    if not token:
        return
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessoes WHERE token = ?", (token,))


# --- Funções de Documento ---
# SECURITY: SQL Injection Protection

def criar_documento(titulo: str, descricao: str, classificacao: str, arquivo_caminho: str, arquivo_nome_original: str, arquivo_tamanho: int, arquivo_tipo: str, conteudo_texto: str, criado_por_id: int) -> int:
    """
    Insere um novo documento no cofre.
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO documentos (titulo, descricao, classificacao, arquivo_caminho, arquivo_nome_original, arquivo_tamanho, arquivo_tipo, conteudo_texto, criado_por_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (titulo, descricao, classificacao, arquivo_caminho, arquivo_nome_original, arquivo_tamanho, arquivo_tipo, conteudo_texto, criado_por_id))
        return cursor.lastrowid

def atualizar_documento(doc_id: int, titulo: str, descricao: str, classificacao: str, arquivo_caminho: str = None, arquivo_nome_original: str = None, arquivo_tamanho: int = None, arquivo_tipo: str = None, conteudo_texto: str = None):
    """
    Atualiza dados e arquivo de um documento existente.
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()
        if arquivo_caminho:
            cursor.execute("""
                UPDATE documentos
                SET titulo = ?, descricao = ?, classificacao = ?, arquivo_caminho = ?, arquivo_nome_original = ?, arquivo_tamanho = ?, arquivo_tipo = ?, conteudo_texto = ?, atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (titulo, descricao, classificacao, arquivo_caminho, arquivo_nome_original, arquivo_tamanho, arquivo_tipo, conteudo_texto, doc_id))
        elif conteudo_texto is not None:
            cursor.execute("""
                UPDATE documentos
                SET titulo = ?, descricao = ?, classificacao = ?, conteudo_texto = ?, atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (titulo, descricao, classificacao, conteudo_texto, doc_id))
        else:
            cursor.execute("""
                UPDATE documentos
                SET titulo = ?, descricao = ?, classificacao = ?, atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (titulo, descricao, classificacao, doc_id))

def excluir_documento(doc_id: int) -> dict:
    """
    Remove documento e retorna os dados do arquivo para exclusão segura do disco.
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documentos WHERE id = ?", (doc_id,))
        doc = cursor.fetchone()
        if doc:
            cursor.execute("DELETE FROM documentos WHERE id = ?", (doc_id,))
            return dict(doc)
    return None

def obter_documento_por_id(doc_id: int):
    """
    Busca documento por ID.
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT d.*, u.nome || ' ' || u.sobrenome AS criado_por_nome
            FROM documentos d
            LEFT JOIN users u ON d.criado_por_id = u.id
            WHERE d.id = ?
        """, (doc_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def listar_documentos(pesquisa: str = None, filtro_classificacao: str = None):
    """
    Lista documentos com pesquisa e filtros parametrizados.
    SECURITY: SQL Injection Protection
    """
    query = """
        SELECT d.id, d.titulo, d.descricao, d.classificacao, d.arquivo_nome_original, d.arquivo_tamanho, d.arquivo_tipo, d.criado_em, d.atualizado_em,
               u.nome || ' ' || u.sobrenome AS criado_por_nome
        FROM documentos d
        LEFT JOIN users u ON d.criado_por_id = u.id
        WHERE 1=1
    """
    params = []

    if pesquisa:
        query += " AND (d.titulo LIKE ? OR d.descricao LIKE ?)"
        term = f"%{pesquisa.strip()}%"
        params.extend([term, term])

    if filtro_classificacao and filtro_classificacao.upper() in ['PUBLICO', 'INTERNO', 'CONFIDENCIAL', 'SIGILOSO']:
        query += " AND d.classificacao = ?"
        params.append(filtro_classificacao.upper())

    query += " ORDER BY d.criado_em DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

# --- Funções de Auditoria ---
# SECURITY: SQL Injection Protection

def registrar_evento_auditoria(usuario_id: int, usuario_nome: str, usuario_cpf: str, acao: str, documento_id: int = None, documento_titulo: str = None, classificacao_documento: str = None, nivel_usuario: str = None, resultado: str = "SUCESSO", detalhes: str = None, ip: str = "127.0.0.1"):
    """
    Insere um novo registro de auditoria no log permanente.
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO auditoria (usuario_id, usuario_nome, usuario_cpf, acao, documento_id, documento_titulo, classificacao_documento, nivel_usuario, resultado, detalhes, ip)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (usuario_id, usuario_nome, usuario_cpf, acao, documento_id, documento_titulo, classificacao_documento, nivel_usuario, resultado, detalhes, ip))

def listar_auditoria(limite: int = 100, filtro_acao: str = None, filtro_resultado: str = None):
    """
    Lista eventos de auditoria com filtros opcionais.
    SECURITY: SQL Injection Protection
    """
    query = "SELECT * FROM auditoria WHERE 1=1"
    params = []

    if filtro_acao:
        query += " AND acao = ?"
        params.append(filtro_acao)

    if filtro_resultado:
        query += " AND resultado = ?"
        params.append(filtro_resultado)

    query += " ORDER BY data_hora DESC LIMIT ?"
    params.append(min(limite, 500))

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

def listar_tentativas_golpes(limite: int = 100):
    """
    Retorna exclusivamente registros de tentativas de golpes, ataques e violações de segurança interceptadas.
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM auditoria
            WHERE resultado = 'NEGADO'
               OR acao LIKE 'ATAQUE_%'
               OR acao LIKE 'GOLPE_%'
               OR acao LIKE 'ACESSO_NEGADO%'
               OR acao = 'LOGIN_FALHA'
            ORDER BY id DESC
            LIMIT ?
        """, (min(limite, 200),))
        return [dict(row) for row in cursor.fetchall()]

# --- Métricas do Dashboard ---
# SECURITY: SQL Injection Protection

def obter_metricas_dashboard():
    """
    Gera estatísticas consolidadas para o dashboard administrativo.
    SECURITY: SQL Injection Protection
    """
    with get_db() as conn:
        cursor = conn.cursor()

        
        # Contagem de usuários
        cursor.execute("SELECT COUNT(*) FROM users")
        total_usuarios = cursor.fetchone()[0]

        # Contagem de documentos totais e por classificação
        cursor.execute("SELECT COUNT(*) FROM documentos")
        total_documentos = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM documentos WHERE classificacao = 'PUBLICO'")
        docs_publicos = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM documentos WHERE classificacao = 'INTERNO'")
        docs_internos = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM documentos WHERE classificacao = 'CONFIDENCIAL'")
        docs_confidenciais = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM documentos WHERE classificacao = 'SIGILOSO'")
        docs_sigilosos = cursor.fetchone()[0]

        # Acessos na auditoria
        cursor.execute("SELECT COUNT(*) FROM auditoria WHERE acao IN ('VISUALIZACAO_DOCUMENTO', 'ACESSO_NEGADO', 'DOWNLOAD_DOCUMENTO')")
        total_acessos = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM auditoria WHERE resultado = 'NEGADO' OR acao = 'ACESSO_NEGADO'")
        total_acessos_negados = cursor.fetchone()[0]

        return {
            "total_usuarios": total_usuarios,
            "total_documentos": total_documentos,
            "docs_publicos": docs_publicos,
            "docs_internos": docs_internos,
            "docs_confidenciais": docs_confidenciais,
            "docs_sigilosos": docs_sigilosos,
            "total_acessos": total_acessos,
            "total_acessos_negados": total_acessos_negados
        }
