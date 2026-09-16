import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, Play, RefreshCw, Trash2, Copy, Filter, CheckCircle2, AlertTriangle, Search, Lock, X, Database, Shield, Zap } from 'lucide-react';

export interface ThreatLog {
  id: number;
  data_hora: string;
  ip: string;
  acao: string;
  resultado: string;
  detalhes: string;
  usuario_nome: string;
  usuario_cpf: string;
  nivel_usuario: string;
  documento_titulo?: string | null;
}

interface SecurityTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityTerminalModal: React.FC<SecurityTerminalModalProps> = ({ isOpen, onClose }) => {
  const [threats, setThreats] = useState<ThreatLog[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    brute_force: 0,
    sql_injection: 0,
    cpf_falso: 0,
    violacao_rbac: 0,
    falhas_login: 0
  });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'BRUTE_FORCE' | 'SQL_INJECTION' | 'CPF_FALSO' | 'RBAC'>('TODOS');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [simulandoAtaque, setSimulandoAtaque] = useState(false);
  const [mensagemSimulacao, setMensagemSimulacao] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const carregarThreats = async (mostrarLoading = false) => {
    if (mostrarLoading) setLoading(true);
    try {
      const res = await fetch('/api/security/threats?limite=150');
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setThreats(data.threats || []);
        if (data.estatisticas) {
          setStats(data.estatisticas);
        }
      }
    } catch (err) {
      console.error('Falha ao obter logs de ameaças:', err);
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarThreats(true);
    }
  }, [isOpen]);

  // Polling automático a cada 3 segundos enquanto aberto e autoRefresh = true
  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      carregarThreats(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh]);

  // Disparar um teste didático de golpe ao vivo
  const dispararSimulacao = async (tipo: 'SQL_INJECTION' | 'BRUTE_FORCE' | 'CPF_FALSO' | 'PRIVILEGE_ESCALATION') => {
    setSimulandoAtaque(true);
    setMensagemSimulacao(null);
    try {
      let payload = undefined;
      if (tipo === 'SQL_INJECTION') payload = "' OR '1'='1' --";

      const res = await fetch('/api/security/simulate-threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, payload })
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setMensagemSimulacao(`[TESTE CONCLUÍDO] ${data.mensagem}`);
        await carregarThreats(false);
      }
    } catch (err) {
      setMensagemSimulacao('[ERRO] Falha ao enviar requisição de simulação.');
    } finally {
      setSimulandoAtaque(false);
      setTimeout(() => setMensagemSimulacao(null), 5000);
    }
  };

  const copiarLogs = () => {
    const textoFormatado = threatsFiltradas.map(t => 
      `[${t.data_hora}] [${t.acao}] [IP: ${t.ip}] [STATUS: ${t.resultado}] ${t.detalhes}`
    ).join('\n');
    navigator.clipboard.writeText(textoFormatado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const limparLogsVisao = () => {
    setThreats([]);
  };

  if (!isOpen) return null;

  // Filtragem dos logs para visualização
  const threatsFiltradas = threats.filter(t => {
    // Filtro por categoria
    if (filtroTipo === 'BRUTE_FORCE') {
      const match = t.acao.includes('BRUTE_FORCE') || t.detalhes.toLowerCase().includes('rate limit') || t.detalhes.toLowerCase().includes('força bruta');
      if (!match) return false;
    } else if (filtroTipo === 'SQL_INJECTION') {
      const match = t.acao.includes('SQL_INJECTION') || t.detalhes.toLowerCase().includes('sql') || t.detalhes.toLowerCase().includes('prepared statement');
      if (!match) return false;
    } else if (filtroTipo === 'CPF_FALSO') {
      const match = t.acao.includes('CPF_FALSO') || t.detalhes.toLowerCase().includes('cpf') || t.detalhes.toLowerCase().includes('módulo 11');
      if (!match) return false;
    } else if (filtroTipo === 'RBAC') {
      const match = t.acao.includes('ACESSO_NEGADO') || t.detalhes.toLowerCase().includes('rbac') || t.detalhes.toLowerCase().includes('clearance');
      if (!match) return false;
    }

    // Busca textual
    if (!buscaTexto.trim()) return true;
    const termo = buscaTexto.toLowerCase();
    return (
      t.detalhes?.toLowerCase().includes(termo) ||
      t.ip?.toLowerCase().includes(termo) ||
      t.acao?.toLowerCase().includes(termo) ||
      t.usuario_nome?.toLowerCase().includes(termo)
    );
  });

  const getTagVisual = (acao: string) => {
    if (acao.includes('SQL_INJECTION')) {
      return {
        label: 'SQL INJECTION',
        bg: 'bg-purple-950/80 text-purple-300 border-purple-700',
        badge: 'CRÍTICO'
      };
    }
    if (acao.includes('BRUTE_FORCE')) {
      return {
        label: 'FORÇA BRUTA / DOS',
        bg: 'bg-rose-950/80 text-rose-300 border-rose-700',
        badge: 'ALERTA MÁXIMO'
      };
    }
    if (acao.includes('CPF_FALSO')) {
      return {
        label: 'FRAUDE IDENTIDADE',
        bg: 'bg-amber-950/80 text-amber-300 border-amber-700',
        badge: 'SUSPEITO'
      };
    }
    if (acao.includes('ACESSO_NEGADO')) {
      return {
        label: 'VIOLAÇÃO RBAC',
        bg: 'bg-orange-950/80 text-orange-300 border-orange-700',
        badge: 'ACESSO NEGADO'
      };
    }
    return {
      label: 'FALHA AUTENTICAÇÃO',
      bg: 'bg-slate-900 text-slate-300 border-slate-700',
      badge: 'BARRADO'
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[850px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 font-sans">
        
        {/* Terminal Window Header (Estilo macOS / Linux Terminal) */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            {/* Window Dots */}
            <div className="flex items-center space-x-1.5">
              <button 
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition shadow-sm"
                title="Fechar Terminal"
              />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            <div className="h-4 w-px bg-slate-700" />

            {/* Terminal Title */}
            <div className="flex items-center space-x-2 font-mono text-xs text-slate-300">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-white">root@cofre-soc:~$</span>
              <span className="text-slate-400">tail -f /var/log/security/threats.log</span>
            </div>
          </div>

          {/* Status e Ações Rápidas */}
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-full text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`} />
              <span className={autoRefresh ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                {autoRefresh ? 'STREAMING ATIVO' : 'PAUSADO'}
              </span>
            </div>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition ${
                autoRefresh 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                  : 'bg-emerald-950 border-emerald-700 text-emerald-300'
              }`}
            >
              {autoRefresh ? 'Pausar' : 'Retomar'}
            </button>

            <button
              onClick={() => carregarThreats(true)}
              disabled={loading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
              title="Atualizar Logs Agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Telemetria / Estatísticas dos Golpes */}
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-slate-200">Mitigações em Tempo Real:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
              Total Barrado: <strong className="text-white">{stats.total}</strong>
            </span>
            <span className="bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded text-rose-300">
              🚨 Força Bruta: <strong className="text-rose-200">{stats.brute_force}</strong>
            </span>
            <span className="bg-purple-950/60 border border-purple-800 px-2 py-0.5 rounded text-purple-300">
              💉 SQL Injection: <strong className="text-purple-200">{stats.sql_injection}</strong>
            </span>
            <span className="bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded text-amber-300">
              🎭 CPFs Falsos: <strong className="text-amber-200">{stats.cpf_falso}</strong>
            </span>
            <span className="bg-orange-950/60 border border-orange-800 px-2 py-0.5 rounded text-orange-300">
              ⛔ Violação RBAC: <strong className="text-orange-200">{stats.violacao_rbac}</strong>
            </span>
          </div>
        </div>

        {/* Toolbar de Controle e Simulação Didática */}
        <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          
          {/* Filtros de Categoria */}
          <div className="flex items-center space-x-1 overflow-x-auto text-xs font-mono pb-1 md:pb-0">
            <span className="text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtro:
            </span>
            {(['TODOS', 'BRUTE_FORCE', 'SQL_INJECTION', 'CPF_FALSO', 'RBAC'] as const).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`px-2 py-1 rounded text-[11px] whitespace-nowrap transition ${
                  filtroTipo === tipo
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tipo === 'TODOS' && 'Todos'}
                {tipo === 'BRUTE_FORCE' && 'Força Bruta'}
                {tipo === 'SQL_INJECTION' && 'SQL Injection'}
                {tipo === 'CPF_FALSO' && 'Fraude CPF'}
                {tipo === 'RBAC' && 'Acesso Indevido'}
              </button>
            ))}
          </div>

          {/* Testes / Simulações ao Vivo para o Professor */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Testar Golpe:
            </span>
            <button
              onClick={() => dispararSimulacao('SQL_INJECTION')}
              disabled={simulandoAtaque}
              className="px-2 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-200 rounded text-[11px] transition"
              title="Dispara injeção SQL (' OR '1'='1' --)"
            >
              💉 SQL Injection
            </button>
            <button
              onClick={() => dispararSimulacao('BRUTE_FORCE')}
              disabled={simulandoAtaque}
              className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded text-[11px] transition"
              title="Dispara rajada de requisições"
            >
              💥 Força Bruta
            </button>
            <button
              onClick={() => dispararSimulacao('CPF_FALSO')}
              disabled={simulandoAtaque}
              className="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200 rounded text-[11px] transition"
              title="Dispara CPF com checksum falso"
            >
              🎭 CPF Fraudulento
            </button>
            <button
              onClick={() => dispararSimulacao('PRIVILEGE_ESCALATION')}
              disabled={simulandoAtaque}
              className="px-2 py-1 bg-orange-950/80 hover:bg-orange-900 border border-orange-700 text-orange-200 rounded text-[11px] transition"
              title="Dispara violação de nível de autorização"
            >
              ⛔ Violação RBAC
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              onClick={copiarLogs}
              className="p-1 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-[11px] flex items-center gap-1 transition"
              title="Copiar logs em texto simples"
            >
              <Copy className="w-3 h-3" />
              <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={limparLogsVisao}
              className="p-1 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 rounded text-[11px] flex items-center gap-1 transition"
              title="Limpar tela do terminal"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Mensagem de Feedback de Simulação */}
        {mensagemSimulacao && (
          <div className="bg-emerald-950/90 border-b border-emerald-700/80 px-4 py-2 text-xs font-mono text-emerald-300 flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{mensagemSimulacao}</span>
          </div>
        )}

        {/* Terminal Body com Logs em Estilo Hacker/Console */}
        <div className="flex-1 bg-[#020617] overflow-y-auto p-4 font-mono text-xs space-y-2 select-text selection:bg-blue-900 selection:text-white">
          
          {/* Banner de Inicialização do Console */}
          <div className="pb-3 border-b border-slate-900 text-slate-500 text-[11px] leading-relaxed">
            <p className="text-emerald-400 font-semibold">
              [SISTEMA DE DETECÇÃO E RESPOSTA A AMEAÇAS (EDR / SIEM) ATIVO]
            </p>
            <p>Monitorando: SQLite Prepared Statements | Rate Limiting Engine | Módulo 11 Validador | RBAC Enforcement</p>
            <p className="text-slate-600">Exibindo registros de ataques, falhas de autenticação e acessos negados em tempo real.</p>
          </div>

          {/* Campo de Busca Rápida no Terminal */}
          <div className="relative my-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              placeholder="grep / filtrar logs por IP, comando, payload ou termo..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded px-8 py-1.5 text-slate-300 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Linhas de Logs */}
          {threatsFiltradas.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Shield className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
              <p>Nenhuma tentativa de golpe encontrada para os filtros selecionados.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Utilize os botões no topo para disparar um teste ao vivo ou tente errar a senha no formulário!
              </p>
            </div>
          ) : (
            threatsFiltradas.map((t, idx) => {
              const tag = getTagVisual(t.acao);
              return (
                <div
                  key={t.id || idx}
                  className="group p-2.5 rounded-lg bg-slate-950/60 border border-slate-900 hover:border-slate-700 hover:bg-slate-900/40 transition flex flex-col space-y-1.5"
                >
                  {/* Linha 1: Metadados principais */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 font-bold">[{t.data_hora}]</span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${tag.bg}`}>
                        {tag.label}
                      </span>
                      <span className="text-slate-400">
                        IP: <strong className="text-slate-200">{t.ip}</strong>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-rose-400 font-bold text-[10px] bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/80">
                        DEFESA: BARRADO ({t.resultado})
                      </span>
                      <span className="text-slate-600 text-[10px]">ID #{t.id}</span>
                    </div>
                  </div>

                  {/* Linha 2: Detalhes do Golpe e como foi Mitigado */}
                  <div className="text-slate-300 text-xs pl-2 border-l-2 border-slate-800">
                    <span className="text-emerald-400 font-bold">&gt;&gt;</span> {t.detalhes}
                  </div>

                  {/* Linha 3: Contexto do Atacante e Alvo */}
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                    <span>
                      Origem: <span className="text-slate-400">{t.usuario_nome}</span>
                    </span>
                    {t.usuario_cpf && t.usuario_cpf !== 'N/A' && (
                      <span>
                        CPF Fornecido: <span className="text-slate-400">{t.usuario_cpf}</span>
                      </span>
                    )}
                    {t.documento_titulo && (
                      <span>
                        Documento Alvo: <span className="text-amber-300/90">{t.documento_titulo}</span>
                      </span>
                    )}
                    <span>
                      Clearance Atacante: <span className="text-slate-400">{t.nivel_usuario}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Prompt de Comando Terminal no Fim da Tela */}
          <div className="pt-3 flex items-center space-x-2 text-slate-400 text-xs">
            <span className="text-emerald-400 font-bold">root@cofre-soc:~$</span>
            <span className="text-slate-300 animate-pulse">█</span>
            <span className="text-slate-600 text-[11px]">(Aguardando novos pacotes de rede ou tentativas de injeção...)</span>
          </div>

          <div ref={terminalEndRef} />
        </div>

        {/* Footer com Dicas de Explicação para o Professor */}
        <div className="bg-slate-950 border-t border-slate-800/80 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 shrink-0 font-mono">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Integridade da Trilha de Auditoria: 100% Persistido em SQLite (Tabela `auditoria`)</span>
          </div>
          <div className="text-slate-500 text-[10px]">
            Pressione <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">ESC</kbd> para fechar o terminal
          </div>
        </div>

      </div>
    </div>
  );
};
