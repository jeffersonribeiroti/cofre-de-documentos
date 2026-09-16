import React, { useState, useEffect } from 'react';
import { Shield, Search, Filter, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditViewProps {
}

export const AuditView: React.FC<AuditViewProps> = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroResultado, setFiltroResultado] = useState('');
  const [busca, setBusca] = useState('');

  const carregarLogs = async () => {
    setLoading(true);
    const token = localStorage.getItem('cofre_token');
    try {
      let url = '/api/audit?';
      if (filtroAcao) url += `acao=${encodeURIComponent(filtroAcao)}&`;
      if (filtroResultado) url += `resultado=${encodeURIComponent(filtroResultado)}&`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Falha ao carregar auditoria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, [filtroAcao, filtroResultado]);

  const logsFiltrados = logs.filter(log => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      log.usuario_nome?.toLowerCase().includes(termo) ||
      log.usuario_cpf_formatado?.toLowerCase().includes(termo) ||
      log.documento_titulo?.toLowerCase().includes(termo) ||
      log.acao?.toLowerCase().includes(termo) ||
      log.detalhes?.toLowerCase().includes(termo)
    );
  });

  const getAcaoBadge = (acao: string) => {
    switch (acao) {
      case 'LOGIN':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">LOGIN</span>;
      case 'LOGIN_FALHA':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">FALHA LOGIN</span>;
      case 'LOGOUT':
        return <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">LOGOUT</span>;
      case 'VISUALIZACAO_DOCUMENTO':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">VISUALIZAÇÃO</span>;
      case 'ACESSO_NEGADO':
      case 'ACESSO_NEGADO_ARQUIVO':
      case 'ACESSO_NEGADO_DASHBOARD':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> ACESSO NEGADO</span>;
      case 'CRIACAO_DOCUMENTO':
        return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded">CRIAÇÃO DOC</span>;
      case 'EDICAO_DOCUMENTO':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">EDIÇÃO DOC</span>;
      case 'EXCLUSAO_DOCUMENTO':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">EXCLUSÃO DOC</span>;
      case 'CRIACAO_USUARIO':
        return <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded">NOVO USUÁRIO</span>;
      case 'EDICAO_USUARIO':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">EDIÇÃO USUÁRIO</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">{acao}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <span>Trilha de Auditoria do Sistema</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registro imutável de autenticações, visualizações, criações e tentativas de violação de acesso.
          </p>
        </div>
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={carregarLogs}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar Trilha</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por usuário, CPF, documento ou detalhes..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtroAcao}
            onChange={(e) => setFiltroAcao(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Ações</option>
            <option value="LOGIN">Login Realizado</option>
            <option value="LOGIN_FALHA">Falha de Autenticação</option>
            <option value="VISUALIZACAO_DOCUMENTO">Visualização Autorizada</option>
            <option value="ACESSO_NEGADO">Tentativa Acesso Negado</option>
            <option value="CRIACAO_DOCUMENTO">Criação de Documento</option>
            <option value="EDICAO_DOCUMENTO">Edição de Documento</option>
            <option value="EXCLUSAO_DOCUMENTO">Exclusão de Documento</option>
            <option value="CRIACAO_USUARIO">Criação de Usuário</option>
            <option value="LOGOUT">Logout</option>
          </select>

          <select
            value={filtroResultado}
            onChange={(e) => setFiltroResultado(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Resultados</option>
            <option value="SUCESSO">Apenas SUCESSO (Verde)</option>
            <option value="NEGADO">Apenas NEGADO (Vermelho)</option>
          </select>
        </div>
      </div>

      {/* Tabela de Auditoria */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Resultado</th>
                <th className="py-3 px-4">Detalhes</th>
                <th className="py-3 px-4">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {logsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Nenhum registro de auditoria encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                logsFiltrados.map((log) => {
                  const isNegado = log.resultado === 'NEGADO';
                  return (
                    <tr key={log.id} className={`hover:bg-slate-50 transition ${isNegado ? 'bg-rose-50/20' : ''}`}>
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap text-slate-700">
                        {log.data_hora}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{log.usuario_nome}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.usuario_cpf_formatado}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getAcaoBadge(log.acao)}
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate">
                        {log.documento_titulo ? (
                          <div>
                            <span className="font-medium text-slate-800">{log.documento_titulo}</span>
                            {log.classificacao_documento && (
                              <span className="text-[10px] text-slate-400 block uppercase">
                                Nível: {log.classificacao_documento}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.resultado === 'SUCESSO' ? (
                          <span className="inline-flex items-center space-x-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>SUCESSO</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px]">
                            <XCircle className="w-3 h-3" />
                            <span>NEGADO</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-[240px] truncate text-slate-600">
                        {log.detalhes || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {log.ip || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
