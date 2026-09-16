"""
Módulo de Rate Limiting em Memória
SECURITY: Rate Limiting
Protege a aplicação contra ataques de força bruta, DoS e requisições abusivas.
Implementa janelas deslizantes thread-safe com suporte a múltiplas categorias.
"""
import time
import threading
from typing import Tuple, Dict, List
from backend.config import (
    RATE_LIMIT_LOGIN,
    RATE_LIMIT_API_GERAL,
    RATE_LIMIT_CONSULTAS,
    RATE_LIMIT_UPLOAD
)

class RateLimiter:
    """
    Controlador de taxa de requisições por IP e Categoria.
    SECURITY: Rate Limiting
    """
    def __init__(self):
        self._lock = threading.Lock()
        # Mapeia (categoria, ip) -> lista de timestamps das requisições recentes
        self._requisicoes: Dict[Tuple[str, str], List[float]] = {}
        # Contador para disparar limpeza periódica a cada N requisições
        self._contador_limpeza = 0

    def _obter_configuracao(self, categoria: str) -> Tuple[int, int]:
        """Retorna (max_requests, window_seconds) para a categoria solicitada."""
        if categoria == "login":
            return RATE_LIMIT_LOGIN["max_requests"], RATE_LIMIT_LOGIN["window_seconds"]
        elif categoria == "upload":
            return RATE_LIMIT_UPLOAD["max_requests"], RATE_LIMIT_UPLOAD["window_seconds"]
        elif categoria == "query":
            return RATE_LIMIT_CONSULTAS["max_requests"], RATE_LIMIT_CONSULTAS["window_seconds"]
        else:
            return RATE_LIMIT_API_GERAL["max_requests"], RATE_LIMIT_API_GERAL["window_seconds"]

    def verificar_limite(self, ip_ou_cat: str, cat_ou_ip: str = "geral") -> Tuple[bool, int]:
        """
        Verifica se a requisição do IP na categoria está dentro do limite permitido.
        SECURITY: Rate Limiting
        
        Aceita tanto (ip, categoria) quanto (categoria, ip) para robustez.
        Retorna:
            (permitido: bool, retry_after_segundos: int)
        """
        categorias_conhecidas = {"login", "upload", "query", "register", "api", "geral"}
        if ip_ou_cat in categorias_conhecidas:
            categoria = ip_ou_cat
            ip = cat_ou_ip or "127.0.0.1"
        else:
            ip = ip_ou_cat or "127.0.0.1"
            categoria = cat_ou_ip

        agora = time.time()
        max_requests, window_seconds = self._obter_configuracao(categoria)
        chave = (categoria, ip)

        with self._lock:
            self._contador_limpeza += 1
            if self._contador_limpeza >= 200:
                self._limpar_expirados_interno(agora)
                self._contador_limpeza = 0

            # Obtém e filtra os registros fora da janela de tempo atual
            historico = self._requisicoes.get(chave, [])
            historico_recente = [ts for ts in historico if agora - ts < window_seconds]

            if len(historico_recente) >= max_requests:
                # Limite excedido: calcula o tempo até a requisição mais antiga expirar
                mais_antiga = historico_recente[0]
                tempo_decorrido = agora - mais_antiga
                tempo_restante = max(1, int(window_seconds - tempo_decorrido))
                self._requisicoes[chave] = historico_recente
                return False, tempo_restante

            # Requisição permitida: adiciona timestamp atual
            historico_recente.append(agora)
            self._requisicoes[chave] = historico_recente
            return True, 0

    def resetar_chave(self, categoria: str, ip: str):
        """Reseta o histórico de um IP para uma categoria específica."""
        chave = (categoria, ip)
        with self._lock:
            if chave in self._requisicoes:
                del self._requisicoes[chave]

    def resetar_todos(self):
        """Reseta todos os limites (útil para testes)."""
        with self._lock:
            self._requisicoes.clear()

    def _limpar_expirados_interno(self, agora: float):
        """Limpeza em lote de chaves inativas para evitar crescimento de memória."""
        chaves_remover = []
        for (categoria, ip), historico in self._requisicoes.items():
            _, window_seconds = self._obter_configuracao(categoria)
            recente = [ts for ts in historico if agora - ts < window_seconds]
            if not recente:
                chaves_remover.append((categoria, ip))
            else:
                self._requisicoes[(categoria, ip)] = recente

        for k in chaves_remover:
            del self._requisicoes[k]

# Instância Singleton global do Rate Limiter
limiter = RateLimiter()
