import React, { useState, useEffect } from 'react';
import { Lock, Shield, KeyRound, UserCheck, AlertCircle, CheckCircle2, XCircle, ArrowRight, UserPlus, Eye, EyeOff, FileText, X, Scale, ShieldAlert, Clock, Ban, ShieldCheck } from 'lucide-react';
import { maskCPF, maskPhone, validateCPFMath, checkPasswordStrength } from '../utils/masks';
import { TERMOS_DE_USO_COMPLETO, POLITICA_DE_PRIVACIDADE_COMPLETA } from '../data/legalText';

interface LoginViewProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Estados de Login
  const [loginCPF, setLoginCPF] = useState('');
  const [loginSenha, setLoginSenha] = useState('');

  // Estados de Cadastro
  const [regNome, setRegNome] = useState('');
  const [regSobrenome, setRegSobrenome] = useState('');
  const [regCPF, setRegCPF] = useState('');
  const [regTelefone, setRegTelefone] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirmacao, setRegConfirmacao] = useState('');
  const [regTermsAccepted, setRegTermsAccepted] = useState(false);
  const [regPrivacyAccepted, setRegPrivacyAccepted] = useState(false);

  // Modal de Documentos Legais
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [legalDocContent, setLegalDocContent] = useState<{ titulo: string; versao: string; data_vigencia: string; conteudo: string } | null>(null);
  const [loadingLegal, setLoadingLegal] = useState(false);

  // Estado de Bloqueio por Rate Limiting (Botões OFF até o timer zerar)
  const [bloqueioSegundos, setBloqueioSegundos] = useState<number>(0);
  const [limiteRestauradoAviso, setLimiteRestauradoAviso] = useState(false);

  // Countdown timer para decrementar os segundos de bloqueio a cada segundo
  useEffect(() => {
    if (bloqueioSegundos <= 0) return;

    const interval = setInterval(() => {
      setBloqueioSegundos((prev) => {
        if (prev <= 1) {
          setErrorMessage('');
          setLimiteRestauradoAviso(true);
          setTimeout(() => setLimiteRestauradoAviso(false), 5000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [bloqueioSegundos]);

  const passwordRules = checkPasswordStrength(regSenha);
  const isCpfValid = validateCPFMath(regCPF);
  const passwordsMatch = regSenha && regSenha === regConfirmacao;

  const abrirModalLegal = async (tipo: 'terms' | 'privacy') => {
    setActiveLegalModal(tipo);
    // Define imediatamente o texto completo oficial
    const documentoPadrao = tipo === 'terms' ? TERMOS_DE_USO_COMPLETO : POLITICA_DE_PRIVACIDADE_COMPLETA;
    setLegalDocContent(documentoPadrao);
    setLoadingLegal(false);

    // Opcionalmente atualiza com a versão mais recente da API se disponível
    try {
      const endpoint = tipo === 'terms' ? '/api/legal/terms' : '/api/legal/privacy';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data && data.conteudo) {
          setLegalDocContent({
            titulo: data.titulo || documentoPadrao.titulo,
            versao: data.versao || documentoPadrao.versao,
            data_vigencia: data.data_vigencia || documentoPadrao.data_vigencia,
            conteudo: data.conteudo
          });
        }
      }
    } catch {
      // Já possui o texto completo pré-carregado
    }
  };

  const concordarModalLegal = () => {
    if (activeLegalModal === 'terms') {
      setRegTermsAccepted(true);
    } else if (activeLegalModal === 'privacy') {
      setRegPrivacyAccepted(true);
    }
    setActiveLegalModal(null);
  };

  // Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginCPF.trim() || !loginSenha.trim()) {
      setErrorMessage('Preencha o CPF e a senha.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: loginCPF, senha: loginSenha })
      });

      const data = await res.json();
      if (!res.ok || !data.sucesso) {
        if (res.status === 429) {
          const segundos = data.retry_after || (() => {
            const match = data.erro?.match(/(\d+)\s*segundos/);
            return match ? parseInt(match[1], 10) : 59;
          })();
          setBloqueioSegundos(segundos);
          setErrorMessage(data.erro || `Muitas tentativas consecutivas. Cooldown de segurança ativo por ${segundos}s.`);
        } else {
          setErrorMessage(data.erro || 'CPF ou senha inválidos.');
        }
        setLoading(false);
        return;
      }

      // Salva token no localStorage para persistência de sessão
      localStorage.setItem('cofre_token', data.token);
      onLoginSuccess(data.token, data.usuario);
    } catch (err) {
      setErrorMessage('Não foi possível conectar ao servidor seguro.');
      setLoading(false);
    }
  };

  // Cadastro de Novo Usuário
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regNome.trim() || !regSobrenome.trim() || !regCPF.trim() || !regTelefone.trim() || !regSenha.trim() || !regConfirmacao.trim()) {
      setErrorMessage('Preencha todos os campos obrigatórios.');
      return;
    }

    if (!isCpfValid) {
      setErrorMessage('CPF inválido. Verifique os dígitos informados.');
      return;
    }

    if (!passwordRules.isValid) {
      setErrorMessage('A senha não atende a todos os requisitos mínimos de segurança.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Senha e confirmação não são iguais.');
      return;
    }

    if (!regTermsAccepted || !regPrivacyAccepted) {
      setErrorMessage('É obrigatório ler e aceitar expressamente os Termos de Uso e a Política de Privacidade (LGPD).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: regNome,
          sobrenome: regSobrenome,
          cpf: regCPF,
          telefone: regTelefone,
          senha: regSenha,
          confirmacao_senha: regConfirmacao,
          terms_accepted: regTermsAccepted,
          privacy_accepted: regPrivacyAccepted
        })
      });

      const data = await res.json();
      if (!res.ok || !data.sucesso) {
        setErrorMessage(data.erro || 'Não foi possível cadastrar o usuário.');
        setLoading(false);
        return;
      }

      setSuccessMessage('Cadastro realizado com sucesso! Você já pode fazer login.');
      setIsRegistering(false);
      setLoginCPF(regCPF);
      setLoginSenha('');
      setRegNome('');
      setRegSobrenome('');
      setRegCPF('');
      setRegTelefone('');
      setRegSenha('');
      setRegConfirmacao('');
      setRegTermsAccepted(false);
      setRegPrivacyAccepted(false);
      setLoading(false);
    } catch (err) {
      setErrorMessage('Falha ao comunicar com o servidor.');
      setLoading(false);
    }
  };

  // Preenchimento rápido para demonstração
  const handlePreencherCredenciais = (cpf: string, senha: string) => {
    setLoginCPF(cpf);
    setLoginSenha(senha);
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Elementos visuais sutis de fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Cabeçalho */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/20 text-white mb-4 border border-blue-400/30">
            <Lock className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            COFRE DE DOCUMENTOS
          </h1>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            Armazenamento Seguro e Visualização Controlada de Informações
          </p>
        </div>

        {/* Banner Especial de Bloqueio por Força Bruta (Rate Limiting Ativo) */}
        {bloqueioSegundos > 0 && (
          <div className="mt-6 mx-4 sm:mx-0 p-4 bg-rose-950/90 border-2 border-rose-600 rounded-2xl shadow-xl shadow-rose-950/50 text-rose-100 flex flex-col space-y-2.5 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="font-bold text-sm tracking-wide text-white">DEFESA ATIVA: ACESSO TEMPORARIAMENTE SUSPENSO</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-rose-900/90 border border-rose-500 px-2.5 py-1 rounded-full font-mono text-xs font-bold text-rose-200">
                <Clock className="w-3.5 h-3.5 text-rose-300 animate-spin" />
                <span>{bloqueioSegundos}s</span>
              </div>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              Múltiplas tentativas incorretas consecutivas detectadas. Por segurança, <strong>todos os botões de envio e contas foram desligados</strong>. Eles serão reativados automaticamente assim que o cronômetro zerar.
            </p>
            {/* Barra visual de tempo decrescente */}
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-rose-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, (bloqueioSegundos / 60) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Notificação de Restauração de Acesso (Botões Ligados) */}
        {limiteRestauradoAviso && bloqueioSegundos === 0 && (
          <div className="mt-6 mx-4 sm:mx-0 p-3.5 bg-emerald-950/90 border border-emerald-600 rounded-xl flex items-center space-x-3 text-emerald-200 text-sm shadow-md animate-in fade-in">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">Tempo de segurança esgotado! Os botões e o acesso foram <strong>religados com sucesso</strong>.</span>
          </div>
        )}

        {/* Mensagens de Feedback */}
        {errorMessage && bloqueioSegundos === 0 && (
          <div className="mt-6 mx-4 sm:mx-0 p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-xl flex items-center space-x-3 text-rose-200 text-sm shadow-sm animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-6 mx-4 sm:mx-0 p-3.5 bg-emerald-950/80 border border-emerald-800/80 rounded-xl flex items-center space-x-3 text-emerald-200 text-sm shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulário Principal */}
        <div className="mt-6 sm:mx-0 mx-4">
          <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-8 text-slate-100">
            {!isRegistering ? (
              /* TELA DE LOGIN */
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="border-b border-slate-800 pb-4 mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <KeyRound className="w-5 h-5 text-blue-400" />
                    <span>Autenticação de Usuário</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Informe seu CPF e senha cadastrados para entrar no cofre.
                  </p>
                </div>

                <div>
                  <label htmlFor="login-cpf" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    CPF
                  </label>
                  <input
                    id="login-cpf"
                    type="text"
                    required
                    maxLength={14}
                    disabled={bloqueioSegundos > 0}
                    value={loginCPF}
                    onChange={(e) => setLoginCPF(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="login-senha" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="login-senha"
                      type={showPassword ? 'text' : 'password'}
                      required
                      maxLength={128}
                      disabled={bloqueioSegundos > 0}
                      value={loginSenha}
                      onChange={(e) => setLoginSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      disabled={bloqueioSegundos > 0}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white disabled:opacity-40"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-entrar"
                    type="submit"
                    disabled={loading || bloqueioSegundos > 0}
                    className={`w-full font-semibold py-2.5 px-4 rounded-lg shadow-lg transition flex items-center justify-center space-x-2 ${
                      bloqueioSegundos > 0
                        ? 'bg-rose-950/80 border-2 border-rose-600/80 text-rose-300 cursor-not-allowed shadow-rose-950/40'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 disabled:opacity-50'
                    }`}
                  >
                    {bloqueioSegundos > 0 ? (
                      <div className="flex items-center space-x-2">
                        <Ban className="w-4 h-4 text-rose-400" />
                        <span>BOTÃO BLOQUEADO ({bloqueioSegundos}s)</span>
                      </div>
                    ) : loading ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    ) : (
                      <>
                        <span>Entrar no Cofre</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-800 text-center">
                  <button
                    type="button"
                    disabled={bloqueioSegundos > 0}
                    onClick={() => {
                      if (bloqueioSegundos > 0) return;
                      setIsRegistering(true);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className={`text-sm font-medium inline-flex items-center space-x-1.5 ${
                      bloqueioSegundos > 0 ? 'text-slate-600 cursor-not-allowed pointer-events-none' : 'text-blue-400 hover:text-blue-300'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Não possui cadastro? Criar conta</span>
                  </button>
                </div>
              </form>
            ) : (
              /* TELA DE CADASTRO */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="border-b border-slate-800 pb-3 mb-3">
                  <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <UserPlus className="w-5 h-5 text-blue-400" />
                    <span>Cadastro de Novo Usuário</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Preencha com dados válidos. Todos os campos são obrigatórios.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-nome" className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome *
                    </label>
                    <input
                      id="reg-nome"
                      type="text"
                      required
                      maxLength={100}
                      value={regNome}
                      onChange={(e) => setRegNome(e.target.value)}
                      placeholder="Ex: Carlos"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-sobrenome" className="block text-xs font-semibold text-slate-300 mb-1">
                      Sobrenome *
                    </label>
                    <input
                      id="reg-sobrenome"
                      type="text"
                      required
                      maxLength={100}
                      value={regSobrenome}
                      onChange={(e) => setRegSobrenome(e.target.value)}
                      placeholder="Ex: Silva"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="reg-cpf" className="block text-xs font-semibold text-slate-300">
                      CPF *
                    </label>
                    {regCPF.length === 14 && (
                      <span className={`text-[11px] font-medium flex items-center space-x-1 ${isCpfValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isCpfValid ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{isCpfValid ? 'CPF Válido' : 'CPF Inválido'}</span>
                      </span>
                    )}
                  </div>
                  <input
                    id="reg-cpf"
                    type="text"
                    required
                    maxLength={14}
                    value={regCPF}
                    onChange={(e) => setRegCPF(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 ${
                      regCPF.length === 14 ? (isCpfValid ? 'border-emerald-600 focus:ring-emerald-500' : 'border-rose-600 focus:ring-rose-500') : 'border-slate-700 focus:ring-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="reg-telefone" className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone *
                  </label>
                  <input
                    id="reg-telefone"
                    type="text"
                    required
                    maxLength={15}
                    value={regTelefone}
                    onChange={(e) => setRegTelefone(maskPhone(e.target.value))}
                    placeholder="(81) 99999-9999"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="reg-senha" className="block text-xs font-semibold text-slate-300 mb-1">
                    Senha *
                  </label>
                  <input
                    id="reg-senha"
                    type="password"
                    required
                    maxLength={128}
                    value={regSenha}
                    onChange={(e) => setRegSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Requisitos Visuais de Senha */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 text-xs">
                  <p className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider mb-1">Requisitos de Segurança da Senha:</p>
                  <div className={`flex items-center space-x-1.5 ${passwordRules.minLength ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {passwordRules.minLength ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 text-center">•</span>}
                    <span>Mínimo de 8 caracteres</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${passwordRules.hasUpper ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {passwordRules.hasUpper ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 text-center">•</span>}
                    <span>Pelo menos uma letra maiúscula</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${passwordRules.hasLower ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {passwordRules.hasLower ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 text-center">•</span>}
                    <span>Pelo menos uma letra minúscula</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${passwordRules.hasNumber ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {passwordRules.hasNumber ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 text-center">•</span>}
                    <span>Pelo menos um número</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${passwordRules.hasSpecial ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>
                    {passwordRules.hasSpecial ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 text-center">•</span>}
                    <span>Pelo menos um caractere especial (!@#$%&*)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="reg-confirmacao" className="block text-xs font-semibold text-slate-300">
                      Confirmação da Senha *
                    </label>
                    {regConfirmacao && (
                      <span className={`text-[11px] font-medium ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {passwordsMatch ? '✓ Senhas conferem' : '✕ Senhas diferentes'}
                      </span>
                    )}
                  </div>
                  <input
                    id="reg-confirmacao"
                    type="password"
                    required
                    maxLength={128}
                    value={regConfirmacao}
                    onChange={(e) => setRegConfirmacao(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Aceite Obrigatório de Termos de Uso e LGPD */}
                <div className="pt-2 border-t border-slate-800 space-y-2.5">
                  <div className="flex items-start space-x-2.5">
                    <input
                      id="check-terms"
                      type="checkbox"
                      checked={regTermsAccepted}
                      onChange={(e) => setRegTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                    <label htmlFor="check-terms" className="text-xs text-slate-300 leading-tight select-none">
                      Li e concordo com os{' '}
                      <button
                        type="button"
                        onClick={() => abrirModalLegal('terms')}
                        className="text-blue-400 hover:text-blue-300 underline font-semibold focus:outline-none"
                      >
                        Termos de Uso
                      </button>{' '}
                      da plataforma institucional. *
                    </label>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <input
                      id="check-privacy"
                      type="checkbox"
                      checked={regPrivacyAccepted}
                      onChange={(e) => setRegPrivacyAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                    <label htmlFor="check-privacy" className="text-xs text-slate-300 leading-tight select-none">
                      Concordo com a{' '}
                      <button
                        type="button"
                        onClick={() => abrirModalLegal('privacy')}
                        className="text-blue-400 hover:text-blue-300 underline font-semibold focus:outline-none"
                      >
                        Política de Privacidade (LGPD)
                      </button>{' '}
                      e o tratamento de dados para segurança do cofre. *
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-cadastrar-usuario"
                    type="submit"
                    disabled={loading || !passwordRules.isValid || !isCpfValid || !passwordsMatch || !regTermsAccepted || !regPrivacyAccepted}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    ) : (
                      <>
                        <span>Concluir Cadastro</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      setErrorMessage('');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    ← Voltar para a tela de Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Card de Demonstração / Testes Rápidos */}
        <div className="mt-8 mx-4 sm:mx-0 bg-slate-900/90 rounded-xl border border-slate-800 p-4 text-slate-300">
          <div className="flex items-center justify-between text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4" />
              <span>Contas de Teste Pré-Configuradas (1-Clique)</span>
            </div>
            {bloqueioSegundos > 0 && (
              <span className="text-[10px] text-rose-400 font-mono bg-rose-950 px-2 py-0.5 rounded border border-rose-800 animate-pulse">
                OFF ({bloqueioSegundos}s)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            {bloqueioSegundos > 0
              ? 'Todos os botões de autenticação foram temporariamente desativados pela proteção de força bruta.'
              : 'Selecione uma das contas de teste para validar os diferentes níveis de autorização do cofre:'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              disabled={bloqueioSegundos > 0}
              onClick={() => handlePreencherCredenciais('111.444.777-35', 'Admin@2026')}
              className={`p-2 rounded-lg border text-left transition flex flex-col ${
                bloqueioSegundos > 0
                  ? 'bg-slate-950/50 border-slate-900 opacity-40 cursor-not-allowed pointer-events-none'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-blue-500'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Carlos Silva</span>
                <span className="bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded text-[10px] font-bold">ADMIN / SIGILOSO</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">CPF: 111.444.777-35</span>
            </button>

            <button
              disabled={bloqueioSegundos > 0}
              onClick={() => handlePreencherCredenciais('444.777.111-07', 'Usuario@2026')}
              className={`p-2 rounded-lg border text-left transition flex flex-col ${
                bloqueioSegundos > 0
                  ? 'bg-slate-950/50 border-slate-900 opacity-40 cursor-not-allowed pointer-events-none'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-blue-500'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Ana Pereira</span>
                <span className="bg-rose-900/60 text-rose-300 px-1.5 py-0.5 rounded text-[10px] font-bold">SIGILOSO</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">CPF: 444.777.111-07</span>
            </button>

            <button
              disabled={bloqueioSegundos > 0}
              onClick={() => handlePreencherCredenciais('333.666.999-57', 'Usuario@2026')}
              className={`p-2 rounded-lg border text-left transition flex flex-col ${
                bloqueioSegundos > 0
                  ? 'bg-slate-950/50 border-slate-900 opacity-40 cursor-not-allowed pointer-events-none'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-blue-500'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Maria Oliveira</span>
                <span className="bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">CONFIDENCIAL</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">CPF: 333.666.999-57</span>
            </button>

            <button
              disabled={bloqueioSegundos > 0}
              onClick={() => handlePreencherCredenciais('222.555.888-46', 'Usuario@2026')}
              className={`p-2 rounded-lg border text-left transition flex flex-col ${
                bloqueioSegundos > 0
                  ? 'bg-slate-950/50 border-slate-900 opacity-40 cursor-not-allowed pointer-events-none'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-blue-500'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">João Santos</span>
                <span className="bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold">INTERNO</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">CPF: 222.555.888-46</span>
            </button>

            <button
              disabled={bloqueioSegundos > 0}
              onClick={() => handlePreencherCredenciais('555.888.222-00', 'Usuario@2026')}
              className={`p-2 rounded-lg border text-left transition flex flex-col sm:col-span-2 ${
                bloqueioSegundos > 0
                  ? 'bg-slate-950/50 border-slate-900 opacity-40 cursor-not-allowed pointer-events-none'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-blue-500'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">Lucas Mendes</span>
                <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">PÚBLICO</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">CPF: 555.888.222-00 (Acesso restrito apenas ao manual público)</span>
            </button>
          </div>

        </div>
      </div>

      {/* Modal de Documentos Legais (Termos de Uso e Política de Privacidade) */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Cabeçalho do Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {legalDocContent?.titulo || (activeLegalModal === 'terms' ? 'Termos de Uso Institucionais' : 'Política de Privacidade')}
                  </h3>
                  <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                    <span>Versão: <strong className="text-slate-200">{legalDocContent?.versao || '1.2'}</strong></span>
                    <span>•</span>
                    <span>Vigência: <strong className="text-slate-200">{legalDocContent?.data_vigencia || '2026'}</strong></span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveLegalModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Documento */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              {loadingLegal ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-xs">Carregando instrumento legal institucional...</p>
                </div>
              ) : (
                <div className="whitespace-pre-line font-mono text-xs sm:text-xs leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800 text-slate-300 select-text">
                  {legalDocContent?.conteudo}
                </div>
              )}
            </div>

            {/* Rodapé com Botões */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Conformidade com a Lei Geral de Proteção de Dados (LGPD)</span>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveLegalModal(null)}
                  className="w-1/2 sm:w-auto px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={concordarModalLegal}
                  className="w-1/2 sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Li e Concordo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
