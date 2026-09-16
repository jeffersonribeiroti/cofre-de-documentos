import React, { useEffect, useState } from 'react';
import { Users, FileText, Globe, Building2, Lock, ShieldAlert, Activity, ShieldCheck, ArrowUpRight, Terminal } from 'lucide-react';
import { DashboardMetrics } from '../types';

interface DashboardViewProps {
  onNavigateToDocs: (classificacao?: string) => void;
  onNavigateToAudit: () => void;
  onOpenTerminal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToDocs,
  onNavigateToAudit,
  onOpenTerminal,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarMetricas = async () => {
    const token = localStorage.getItem('cofre_token');
    try {
      const res = await fetch('/api/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setMetrics(data.metricas);
      }
    } catch (err) {
      console.error('Falha ao obter métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarMetricas();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mr-3"></div>
        Carregando indicadores de segurança...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Activity className="w-6 h-6 text-blue-600" />
            <span>Dashboard Administrativo</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visão consolidada do cofre de documentos, autorizações e eventos de segurança.
          </p>
        </div>
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {onOpenTerminal && (
            <button
              onClick={onOpenTerminal}
              className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold text-emerald-400 bg-slate-950 border border-emerald-500/50 hover:border-emerald-400 px-3 py-1.5 rounded-lg hover:bg-slate-900 transition shadow-sm group"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Terminal de Golpes (SOC)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
          )}
          <button
            onClick={onNavigateToAudit}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
          >
            <span>Ver Trilha de Auditoria</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Usuários */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total de Usuários
            </span>
            <span className="text-3xl font-black text-slate-900 mt-1 block">
              {metrics?.total_usuarios || 0}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Contas cadastradas no cofre
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card Documentos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total de Documentos
            </span>
            <span className="text-3xl font-black text-slate-900 mt-1 block">
              {metrics?.total_documentos || 0}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Armazenamento protegido
            </span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Card Total de Acessos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total de Acessos
            </span>
            <span className="text-3xl font-black text-emerald-600 mt-1 block">
              {metrics?.total_acessos || 0}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Visualizações registradas
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card Acessos Negados */}
        <div
          onClick={onOpenTerminal}
          className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between ${
            onOpenTerminal ? 'cursor-pointer hover:border-rose-300 hover:shadow-md transition' : ''
          }`}
          title={onOpenTerminal ? 'Clique para abrir o Terminal de Tentativas de Golpes' : undefined}
        >
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Acessos Negados
              </span>
              {onOpenTerminal && (
                <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded">
                  SOC
                </span>
              )}
            </div>
            <span className="text-3xl font-black text-rose-600 mt-1 block">
              {metrics?.total_acessos_negados || 0}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {onOpenTerminal ? 'Ver logs no Terminal →' : 'Bloqueios por nível insuficiente'}
            </span>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Distribuição por Classificação da Informação */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Lock className="w-4 h-4 text-blue-600" />
          <span>Documentos por Nível de Classificação</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* PÚBLICO */}
          <div
            onClick={() => onNavigateToDocs('PUBLICO')}
            className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition flex items-center justify-between"
          >
            <div>
              <div className="flex items-center space-x-1.5 text-emerald-800 font-bold text-xs">
                <Globe className="w-4 h-4" />
                <span>PÚBLICO</span>
              </div>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">
                {metrics?.docs_publicos || 0}
              </span>
              <span className="text-[10px] text-emerald-700">Acesso livre a qualquer usuário</span>
            </div>
            <span className="text-xs text-emerald-600 font-semibold">Ver →</span>
          </div>

          {/* INTERNO */}
          <div
            onClick={() => onNavigateToDocs('INTERNO')}
            className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer transition flex items-center justify-between"
          >
            <div>
              <div className="flex items-center space-x-1.5 text-blue-800 font-bold text-xs">
                <Building2 className="w-4 h-4" />
                <span>INTERNO</span>
              </div>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                {metrics?.docs_internos || 0}
              </span>
              <span className="text-[10px] text-blue-700">Colaboradores autorizados</span>
            </div>
            <span className="text-xs text-blue-600 font-semibold">Ver →</span>
          </div>

          {/* CONFIDENCIAL */}
          <div
            onClick={() => onNavigateToDocs('CONFIDENCIAL')}
            className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition flex items-center justify-between"
          >
            <div>
              <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs">
                <Lock className="w-4 h-4" />
                <span>CONFIDENCIAL</span>
              </div>
              <span className="text-2xl font-black text-amber-950 mt-1 block">
                {metrics?.docs_confidenciais || 0}
              </span>
              <span className="text-[10px] text-amber-800">Protegido com marca d'água</span>
            </div>
            <span className="text-xs text-amber-700 font-semibold">Ver →</span>
          </div>

          {/* SIGILOSO */}
          <div
            onClick={() => onNavigateToDocs('SIGILOSO')}
            className="p-4 rounded-xl border border-rose-300 bg-rose-50/50 hover:bg-rose-50 cursor-pointer transition flex items-center justify-between"
          >
            <div>
              <div className="flex items-center space-x-1.5 text-rose-900 font-bold text-xs">
                <ShieldAlert className="w-4 h-4" />
                <span>SIGILOSO</span>
              </div>
              <span className="text-2xl font-black text-rose-950 mt-1 block">
                {metrics?.docs_sigilosos || 0}
              </span>
              <span className="text-[10px] text-rose-800">Nível máximo de restrição</span>
            </div>
            <span className="text-xs text-rose-700 font-semibold">Ver →</span>
          </div>
        </div>
      </div>
    </div>
  );
};
