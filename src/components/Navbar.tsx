import React from 'react';
import { Shield, Lock, FileText, Users, Activity, User as UserIcon, LogOut, } from 'lucide-react';
import { User } from '../types';
import { formatClassificationBadge } from '../utils/masks';

interface NavbarProps {
  user: User;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentTab,
  onSelectTab,
  onLogout,
}) => {
  const isAdmin = user.tipo === 'ADMINISTRADOR';
  const badge = formatClassificationBadge(user.nivel_autorizacao);

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Marca */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab(isAdmin ? 'dashboard' : 'documentos')}>
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-inner flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-none">
                COFRE DE DOCUMENTOS
              </span>
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                Sistema Seguro de Informação
              </span>
            </div>
          </div>

          {/* Menu Principal */}
          <nav className="hidden md:flex items-center space-x-1">
            {isAdmin && (
              <button
                id="nav-dashboard"
                onClick={() => onSelectTab('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center space-x-2 ${
                  currentTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            )}

            <button
              id="nav-documentos"
              onClick={() => onSelectTab('documentos')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center space-x-2 ${
                currentTab === 'documentos'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Documentos</span>
            </button>

            {isAdmin && (
              <button
                id="nav-usuarios"
                onClick={() => onSelectTab('usuarios')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center space-x-2 ${
                  currentTab === 'usuarios'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Usuários</span>
              </button>
            )}

            {isAdmin && (
              <button
                id="nav-auditoria"
                onClick={() => onSelectTab('auditoria')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center space-x-2 ${
                  currentTab === 'auditoria'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Auditoria</span>
              </button>
            )}

            <button
              id="nav-perfil"
              onClick={() => onSelectTab('perfil')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center space-x-2 ${
                currentTab === 'perfil'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Meu Perfil</span>
            </button>
          </nav>

          {/* Usuário logado & Ações */}
          <div className="flex items-center space-x-2 sm:space-x-3">

            <div className="hidden sm:flex flex-col items-end text-right border-l border-slate-700 pl-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-slate-100">{user.nome_completo}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badge.bg}`}>
                  {user.nivel_autorizacao}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{user.tipo}</span>
            </div>

            <button
              id="btn-logout"
              onClick={onLogout}
              className="bg-slate-800 hover:bg-rose-900/80 text-slate-200 hover:text-rose-100 px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center space-x-1.5 border border-slate-700 hover:border-rose-700"
              title="Encerrar Sessão Segura"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegação Mobile */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800 text-xs">
          {isAdmin && (
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`p-2 flex flex-col items-center ${currentTab === 'dashboard' ? 'text-blue-400' : 'text-slate-400'}`}
            >
              <Activity className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
          )}
          <button
            onClick={() => onSelectTab('documentos')}
            className={`p-2 flex flex-col items-center ${currentTab === 'documentos' ? 'text-blue-400' : 'text-slate-400'}`}
          >
            <FileText className="w-5 h-5" />
            <span>Documentos</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => onSelectTab('usuarios')}
              className={`p-2 flex flex-col items-center ${currentTab === 'usuarios' ? 'text-blue-400' : 'text-slate-400'}`}
            >
              <Users className="w-5 h-5" />
              <span>Usuários</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onSelectTab('auditoria')}
              className={`p-2 flex flex-col items-center ${currentTab === 'auditoria' ? 'text-blue-400' : 'text-slate-400'}`}
            >
              <Shield className="w-5 h-5" />
              <span>Auditoria</span>
            </button>
          )}
          <button
            onClick={() => onSelectTab('perfil')}
            className={`p-2 flex flex-col items-center ${currentTab === 'perfil' ? 'text-blue-400' : 'text-slate-400'}`}
          >
            <UserIcon className="w-5 h-5" />
            <span>Perfil</span>
          </button>
        </div>
      </div>
    </header>
  );
};
