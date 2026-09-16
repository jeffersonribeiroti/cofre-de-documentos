import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DocumentCard } from './components/DocumentCard';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { DocumentFormModal } from './components/DocumentFormModal';
import { DashboardView } from './components/DashboardView';
import { AuditView } from './components/AuditView';
import { UsersView } from './components/UsersView';
import { ProfileView } from './components/ProfileView';
import { SecurityGuideModal } from './components/SecurityGuideModal';
import { SecurityTerminalModal } from './components/SecurityTerminalModal';
import { User, DocumentItem, WatermarkData } from './types';
import { Search, Filter, Plus, RotateCcw, Lock, ShieldCheck, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState('documentos');

  // Estados da Listagem de Documentos
  const [documentos, setDocumentos] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroClassificacao, setFiltroClassificacao] = useState('');
  const [filtroAcesso, setFiltroAcesso] = useState('TODOS');

  // Estados dos Modais
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [selectedWatermark, setSelectedWatermark] = useState<WatermarkData | null>(null);
  const [deniedInfo, setDeniedInfo] = useState<any>(null);
  const [docToEdit, setDocToEdit] = useState<DocumentItem | null>(null);
  const [showDocForm, setShowDocForm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  // Mensagens globais de feedback
  const [notificacao, setNotificacao] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const mostrarNotificacao = (texto: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setNotificacao({ tipo, texto });
    setTimeout(() => setNotificacao(null), 4000);
  };

  // Verifica sessão salva no localStorage ao iniciar
  const verificarSessao = async () => {
    const token = localStorage.getItem('cofre_token');
    if (!token) {
      setLoadingAuth(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setCurrentUser(data.usuario);
        if (data.usuario.tipo === 'ADMINISTRADOR') {
          setCurrentTab('dashboard');
        } else {
          setCurrentTab('documentos');
        }
      } else {
        localStorage.removeItem('cofre_token');
      }
    } catch (err) {
      localStorage.removeItem('cofre_token');
    } finally {
      setLoadingAuth(false);
    }
  };

  useEffect(() => {
    verificarSessao();
  }, []);

  // Carrega documentos do cofre
  const carregarDocumentos = async () => {
    if (!currentUser) return;
    setLoadingDocs(true);
    const token = localStorage.getItem('cofre_token');

    try {
      let url = '/api/documents?';
      if (pesquisa.trim()) url += `q=${encodeURIComponent(pesquisa.trim())}&`;
      if (filtroClassificacao) url += `classificacao=${encodeURIComponent(filtroClassificacao)}&`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setDocumentos(data.documentos);
      }
    } catch (err) {
      mostrarNotificacao('Erro ao carregar documentos do servidor.', 'erro');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      carregarDocumentos();
    }
  }, [currentUser, pesquisa, filtroClassificacao]);

  // Visualização com Verificação Central de Autorização no Backend
  const handleViewDocument = async (doc: DocumentItem) => {
    const token = localStorage.getItem('cofre_token');
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Ignora falha de parse caso o status 403 não venha em JSON puro
      }

      if (res.status === 403 || data?.acesso_negado || !doc.autorizado) {
        // Backend negou o acesso ou documento é restrito - Abre tela de bloqueio e não vaza conteúdo
        setSelectedDoc(null);
        setSelectedWatermark(null);
        setDeniedInfo({
          documento_titulo: data?.documento_titulo || doc.titulo,
          classificacao: data?.classificacao || doc.classificacao,
          nivel_usuario: data?.nivel_usuario || currentUser?.nivel_autorizacao || 'PUBLICO'
        });
        carregarDocumentos(); // Atualiza contadores
        return;
      }

      if (!res.ok || !data.sucesso) {
        mostrarNotificacao(data.erro || 'Não foi possível carregar o documento.', 'erro');
        return;
      }

      // Acesso permitido
      setDeniedInfo(null);
      setSelectedDoc(data.documento);
      setSelectedWatermark(data.marca_dagua);
    } catch (err) {
      if (!doc.autorizado) {
        // Em caso de erro de rede em documento restrito, sempre prioriza a proteção
        setSelectedDoc(null);
        setSelectedWatermark(null);
        setDeniedInfo({
          documento_titulo: doc.titulo,
          classificacao: doc.classificacao,
          nivel_usuario: currentUser?.nivel_autorizacao || 'PUBLICO'
        });
      } else {
        mostrarNotificacao('Falha na comunicação de segurança com o servidor.', 'erro');
      }
    }
  };

  // Exclusão de Documento (Administrador)
  const handleDeleteDocument = async (doc: DocumentItem) => {
    if (!window.confirm(`Confirma a exclusão definitiva do documento "${doc.titulo}"?`)) return;

    const token = localStorage.getItem('cofre_token');
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        mostrarNotificacao('Documento excluído com sucesso.');
        carregarDocumentos();
      } else {
        mostrarNotificacao(data.erro || 'Falha ao excluir documento.', 'erro');
      }
    } catch (err) {
      mostrarNotificacao('Erro ao comunicar com o servidor.', 'erro');
    }
  };

  // Logout com Invalidação de Sessão no Backend
  const handleLogout = async () => {
    const token = localStorage.getItem('cofre_token');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      // Continua logout local
    } finally {
      localStorage.removeItem('cofre_token');
      setCurrentUser(null);
      setSelectedDoc(null);
      setDeniedInfo(null);
      mostrarNotificacao('Sessão encerrada com sucesso.');
    }
  };

  // Restabelecer dados de demonstração
  const handleResetDemoData = async () => {
    if (!window.confirm('Deseja restaurar os documentos e usuários padrão de teste do cofre?')) return;
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        mostrarNotificacao('Dados de demonstração restaurados com sucesso.');
        carregarDocumentos();
      }
    } catch (err) {
      mostrarNotificacao('Falha ao restaurar dados de teste.', 'erro');
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mb-4"></div>
        <p className="font-mono text-xs tracking-wider">VERIFICANDO CREDENCIAIS DE SEGURANÇA...</p>
      </div>
    );
  }

  // Não Autenticado -> Exibe Tela de Login/Cadastro
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(token, user) => {
          setCurrentUser(user);
          if (user.tipo === 'ADMINISTRADOR') {
            setCurrentTab('dashboard');
          } else {
            setCurrentTab('documentos');
          }
          mostrarNotificacao(`Bem-vindo(a), ${user.nome_completo}!`);
        }}
      />
    );
  }

  // Documentos filtrados pelo tipo de acesso (Permitido vs Restrito)
  const docsExibidos = documentos.filter(doc => {
    if (filtroAcesso === 'PERMITIDO') return doc.autorizado;
    if (filtroAcesso === 'RESTRITO') return !doc.autorizado;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased">
      {/* Barra de Navegação Superior */}
      <Navbar
        user={currentUser}
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onLogout={handleLogout}
        onOpenGuide={() => setShowGuide(true)}
        onOpenTerminal={() => setShowTerminal(true)}
      />

      {/* Toast de Notificação */}
      {notificacao && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl border flex items-center space-x-2 text-xs font-semibold ${
              notificacao.tipo === 'sucesso'
                ? 'bg-slate-900 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950 text-rose-200 border-rose-700'
            }`}
          >
            {notificacao.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notificacao.texto}</span>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ABA: DASHBOARD (ADMINISTRADOR) */}
        {currentTab === 'dashboard' && currentUser.tipo === 'ADMINISTRADOR' && (
          <DashboardView
            onNavigateToDocs={(classif) => {
              if (classif) setFiltroClassificacao(classif);
              setCurrentTab('documentos');
            }}
            onNavigateToAudit={() => setCurrentTab('auditoria')}
            onOpenTerminal={() => setShowTerminal(true)}
          />
        )}

        {/* ABA: DOCUMENTOS */}
        {currentTab === 'documentos' && (
          <div className="space-y-6">
            {/* Header da Seção */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span>Documentos e Relatórios do Cofre</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Seu nível de autorização é <strong className="text-slate-800 uppercase">{currentUser.nivel_autorizacao}</strong>. Documentos com classificação superior são bloqueados no backend.
                </p>
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <button
                  onClick={handleResetDemoData}
                  title="Restaurar dados iniciais de demonstração"
                  className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Restaurar Testes</span>
                </button>

                {currentUser.tipo === 'ADMINISTRADOR' && (
                  <button
                    id="btn-cadastrar-documento"
                    onClick={() => {
                      setDocToEdit(null);
                      setShowDocForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Documento</span>
                  </button>
                )}
              </div>
            </div>

            {/* Barra de Pesquisa e Filtros */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-pesquisa-documentos"
                  type="text"
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  placeholder="Pesquisar por título ou descrição..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  id="select-filtro-classificacao"
                  value={filtroClassificacao}
                  onChange={(e) => setFiltroClassificacao(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas as Classificações</option>
                  <option value="PUBLICO">PÚBLICO</option>
                  <option value="INTERNO">INTERNO</option>
                  <option value="CONFIDENCIAL">CONFIDENCIAL</option>
                  <option value="SIGILOSO">SIGILOSO</option>
                </select>

                <select
                  id="select-filtro-acesso"
                  value={filtroAcesso}
                  onChange={(e) => setFiltroAcesso(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="PERMITIDO">Apenas Permitidos (Verde)</option>
                  <option value="RESTRITO">Apenas Restritos (Vermelho)</option>
                </select>
              </div>
            </div>

            {/* Grid de Cards de Documentos */}
            {loadingDocs ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
                Carregando documentos autorizados...
              </div>
            ) : docsExibidos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Nenhum documento encontrado</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Não há documentos correspondentes aos termos pesquisados ou filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {docsExibidos.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    userRole={currentUser.tipo}
                    onView={handleViewDocument}
                    onEdit={(d) => {
                      setDocToEdit(d);
                      setShowDocForm(true);
                    }}
                    onDelete={handleDeleteDocument}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: USUÁRIOS (ADMINISTRADOR) */}
        {currentTab === 'usuarios' && currentUser.tipo === 'ADMINISTRADOR' && (
          <UsersView />
        )}

        {/* ABA: AUDITORIA (ADMINISTRADOR) */}
        {currentTab === 'auditoria' && currentUser.tipo === 'ADMINISTRADOR' && (
          <AuditView onOpenTerminal={() => setShowTerminal(true)} />
        )}

        {/* ABA: MEU PERFIL */}
        {currentTab === 'perfil' && (
          <ProfileView user={currentUser} />
        )}
      </main>

      {/* Modais da Aplicação */}
      {(selectedDoc || deniedInfo) && (
        <DocumentViewerModal
          document={selectedDoc}
          watermark={selectedWatermark}
          deniedInfo={deniedInfo}
          currentUser={currentUser}
          onClose={() => {
            setSelectedDoc(null);
            setSelectedWatermark(null);
            setDeniedInfo(null);
          }}
        />
      )}

      {showDocForm && (
        <DocumentFormModal
          documentToEdit={docToEdit}
          onClose={() => {
            setShowDocForm(false);
            setDocToEdit(null);
          }}
          onSaved={() => {
            setShowDocForm(false);
            setDocToEdit(null);
            carregarDocumentos();
            mostrarNotificacao(docToEdit ? 'Documento atualizado com sucesso.' : 'Documento cadastrado no cofre com sucesso.');
          }}
        />
      )}

      {showGuide && (
        <SecurityGuideModal onClose={() => setShowGuide(false)} />
      )}

      {showTerminal && (
        <SecurityTerminalModal
          isOpen={showTerminal}
          onClose={() => setShowTerminal(false)}
        />
      )}
    </div>
  );
}

export default App;
