import React from 'react';
import { User as UserIcon, Shield, CheckCircle2, XCircle, Key, Phone, Calendar, Lock } from 'lucide-react';
import { User } from '../types';
import { formatClassificationBadge } from '../utils/masks';

interface ProfileViewProps {
  user: User;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const badge = formatClassificationBadge(user.nivel_autorizacao);

  const niveis = [
    { nivel: 'PUBLICO', nome: 'Público', desc: 'Acesso livre a manuais institucionais e regulamentos abertos', pode: ['PUBLICO', 'INTERNO', 'CONFIDENCIAL', 'SIGILOSO'].includes(user.nivel_autorizacao) },
    { nivel: 'INTERNO', nome: 'Interno', desc: 'Diretrizes corporativas, políticas de conduta e comunicados da equipe', pode: ['INTERNO', 'CONFIDENCIAL', 'SIGILOSO'].includes(user.nivel_autorizacao) },
    { nivel: 'CONFIDENCIAL', nome: 'Confidencial', desc: 'Relatórios financeiros, contratos comerciais e SLAs de parceiros', pode: ['CONFIDENCIAL', 'SIGILOSO'].includes(user.nivel_autorizacao) },
    { nivel: 'SIGILOSO', nome: 'Sigiloso', desc: 'Planejamento estratégico, fusões, aquisições e auditorias restritas', pode: user.nivel_autorizacao === 'SIGILOSO' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <span>Meu Perfil e Credenciais de Segurança</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Informações cadastrais, nível de autorização (Clearance) e políticas ativas de proteção da informação.
        </p>
      </div>

      {/* Card de Informações Cadastrais */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-md border border-slate-800">
              {user.nome.charAt(0)}{user.sobrenome.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{user.nome_completo}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs font-semibold text-slate-500 uppercase">{user.tipo}</span>
                <span className="text-slate-300">•</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badge.bg}`}>
                  {badge.label}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {user.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Grade de Dados do Usuário */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block text-[10px]">
              CPF do Titular
            </span>
            <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
              {user.cpf_formatado}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block text-[10px]">
              Telefone de Contato
            </span>
            <span className="text-sm font-mono font-bold text-slate-900 mt-1 block">
              {user.telefone_formatado}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block text-[10px]">
              Sessão de Segurança
            </span>
            <span className="text-sm font-semibold text-emerald-700 mt-1 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Token Criptográfico Ativo</span>
            </span>
          </div>
        </div>
      </div>

      {/* Matriz de Clearance / Hierarquia de Acesso */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>Matriz de Acesso aos Níveis de Informação</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Com base no seu nível de autorização (<strong className="text-slate-700">{user.nivel_autorizacao}</strong>), confira os documentos que você tem permissão para visualizar:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {niveis.map((item) => (
            <div
              key={item.nivel}
              className={`p-4 rounded-xl border flex items-start space-x-3 transition ${
                item.pode
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="mt-0.5">
                {item.pode ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-slate-400 shrink-0" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-900 uppercase">
                    {item.nome}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.2 rounded ${item.pode ? 'text-emerald-700 bg-emerald-100' : 'text-slate-500 bg-slate-200'}`}>
                    {item.pode ? 'Acesso Permitido' : 'Acesso Negado'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
