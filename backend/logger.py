"""
Módulo de Logs Estruturados e Monitoramento
SECURITY: Structured Logging & Monitoring
Registra logs em formato padronizado e sanitizado:
[TIMESTAMP] [LEVEL] [REQUEST_ID] [METHOD] [ENDPOINT] [STATUS] [IP] [USER_ID] - [MESSAGE]
Garante que senhas, tokens ou dados confidenciais NUNCA sejam gravados em log.
"""
import sys
import datetime
import threading
from typing import Optional

_log_lock = threading.Lock()

# Palavras-chave estritamente proibidas em mensagens de log
SENSIBLE_KEYS = ["senha", "password", "salt", "token", "secret", "authorization"]

def sanitizar_mensagem_log(mensagem: str) -> str:
    """Sanitiza mensagens para impedir vazamento acidental de credenciais."""
    if not mensagem:
        return ""
    msg_str = str(mensagem)
    # Trunca se muito longa
    if len(msg_str) > 1000:
        msg_str = msg_str[:1000] + "...[TRUNCADO]"
    return msg_str

def log_event(
    level: str,
    method: str = "SYS",
    endpoint: str = "-",
    status: int = 0,
    ip: str = "-",
    user_id: Optional[int] = None,
    message: str = "",
    request_id: str = "-",
    **kwargs
):
    """
    Grava um log estruturado na saída padrão.
    SECURITY: Structured Logging & Monitoring
    Formato: [TIMESTAMP] [LEVEL] [REQUEST_ID] [METHOD] [ENDPOINT] [STATUS] [IP] [USER_ID] - [MESSAGE]
    """
    agora_iso = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    usr_str = str(user_id) if user_id is not None else "ANON"
    status_str = str(status) if status > 0 else "-"
    msg_limpa = sanitizar_mensagem_log(message)

    linha_log = f"[{agora_iso}] [{level.upper():5}] [{request_id}] [{method:6}] [{endpoint}] [{status_str}] [{ip}] [USR:{usr_str}] - {msg_limpa}"

    with _log_lock:
        print(linha_log, file=sys.stdout, flush=True)

def _extrair_kwargs(args, kwargs, default_level="INFO"):
    """Normaliza parâmetros posicionais e nomeados para flexibilidade total."""
    msg = ""
    status = kwargs.get("status_code", kwargs.get("status", 0))
    endpoint = kwargs.get("caminho", kwargs.get("endpoint", "-"))
    method = kwargs.get("method", "SYS")
    ip = kwargs.get("ip", "-")
    user_id = kwargs.get("user_id", None)
    request_id = kwargs.get("request_id", "-")

    if args:
        msg = str(args[0])
    elif "message" in kwargs:
        msg = str(kwargs["message"])

    if "exc" in kwargs and kwargs["exc"]:
        msg = f"{msg} | Exceção: {kwargs['exc']}"

    return {
        "method": method,
        "endpoint": endpoint,
        "status": status,
        "ip": ip,
        "user_id": user_id,
        "message": msg,
        "request_id": request_id
    }

def log_info(*args, **kwargs):
    params = _extrair_kwargs(args, kwargs, "INFO")
    log_event("INFO", **params)

def log_warn(*args, **kwargs):
    params = _extrair_kwargs(args, kwargs, "WARN")
    log_event("WARN", **params)

def log_error(*args, **kwargs):
    params = _extrair_kwargs(args, kwargs, "ERROR")
    log_event("ERROR", **params)
