import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserCheck, UserX, Edit2, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { User, ClassificationLevel, UserType } from '../types';
import { formatClassificationBadge, maskCPF, maskPhone, validateCPFMath, checkPasswordStrength } from '../utils/masks';

export const UsersView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Estados do formulário de usuário
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [tipo, setTipo] = useState<UserType>('USUARIO');
  const [nivel, setNivel] = useState<ClassificationLevel>('INTERNO');
  const [formErro, setFormErro] = useState('');
  const [formSucesso, setFormSucesso] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordRules = checkPasswordStrength(senha);
  const isCpfValid = validateCPFMath(cpf);

  const carregarUsuarios = async () => {
    setLoading(true);
    const token = localStorage.getItem('cofre_token');
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setUsers(data.usuarios);
      }
    } catch (err) {
      console.error('Falha ao obter usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const abrirCriacao = () => {
    setUserToEdit(null);
    setNome('');
    setSobrenome('');
    setCpf('');
    setTelefone('');
    setSenha('');
    setConfirmacaoSenha('');
    setTipo('USUARIO');
    setNivel('INTERNO');
    setFormErro('');
    setFormSucesso('');
    setShowModal(true);
  };

  const abrirEdicao = (u: User) => {
    setUserToEdit(u);
    setNome(u.nome);
    setSobrenome(u.sobrenome);
    setCpf(u.cpf_formatado);
    setTelefone(u.telefone_formatado);
    setSenha('');
    setConfirmacaoSenha('');
    setTipo(u.tipo);
    setNivel(u.nivel_autorizacao);
    setFormErro('');
    setFormSucesso('');
    setShowModal(true);
  };

  const handleToggleStatus = async (user: User) => {
    const novoStatus = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    const confirmMsg = `Deseja realmente alterar o status de ${user.nome_completo} para ${novoStatus}?`;
    if (!window.confirm(confirmMsg)) return;

    const token = localStorage.getItem('cofre_token');
    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: novoStatus })
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        carregarUsuarios();
      } else {
        alert(data.erro || 'Falha ao alterar status do usuário.');
      }
    } catch (err) {
      alert('Erro de conexão ao alterar status.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErro('');
    setFormSucesso('');

    if (!nome.trim() || !sobrenome.trim() || !telefone.trim()) {
      setFormErro('Preencha os campos obrigatórios.');
      return;
    }

    if (!userToEdit) {
      if (!isCpfValid) {
        setFormErro('CPF informado é matematicamente inválido.');
        return;
      }
      if (!passwordRules.isValid) {
        setFormErro('A senha não cumpre os requisitos de complexidade.');
        return;
      }
      if (senha !== confirmacaoSenha) {
        setFormErro('A confirmação da senha não confere.');
        return;
      }
    } else {
      if (senha) {
        if (!passwordRules.isValid) {
          setFormErro('A nova senha não atende aos requisitos mínimos.');
          return;
        }
        if (senha !== confirmacaoSenha) {
          setFormErro('Senhas digitadas não são iguais.');
          return;
        }
      }
    }

    setSubmitting(true);
    const token = localStorage.getItem('cofre_token');

    try {
      const url = userToEdit ? `/api/users/${userToEdit.id}` : '/api/users';
      const method = userToEdit ? 'PUT' : 'POST';

      const payload: any = {
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        telefone: telefone.trim(),
        tipo,
        nivel_autorizacao: nivel,
        status: userToEdit ? userToEdit.status : 'ATIVO'
      };

      if (!userToEdit) {
        payload.cpf = cpf;
        payload.senha = senha;
        payload.confirmacao_senha = confirmacaoSenha;
      } else if (senha) {
        payload.senha = senha;
        payload.confirmacao_senha = confirmacaoSenha;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.sucesso) {
        setFormErro(data.erro || 'Falha ao salvar usuário.');
        setSubmitting(false);
        return;
      }

      setShowModal(false);
      carregarUsuarios();
    } catch (err) {
      setFormErro('Erro de comunicação com o servidor seguro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Gerenciamento de Usuários</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Controle de credenciais, tipos de conta e níveis de autorização (Clearance).
          </p>
        </div>
        <button
          id="btn-novo-usuario"
          onClick={abrirCriacao}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Usuário</span>
        </button>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Nome Completo</th>
                <th className="py-3 px-4">CPF</th>
                <th className="py-3 px-4">Telefone</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Nível de Autorização</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Carregando usuários do cofre...
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const badge = formatClassificationBadge(u.nivel_autorizacao);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {u.nome_completo}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {u.cpf_formatado}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {u.telefone_formatado}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${u.tipo === 'ADMINISTRADOR' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {u.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {u.status === 'ATIVO' ? (
                          <span className="inline-flex items-center space-x-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                            <UserCheck className="w-3 h-3" />
                            <span>ATIVO</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-[10px]">
                            <UserX className="w-3 h-3" />
                            <span>INATIVO</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => abrirEdicao(u)}
                          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Editar Dados do Usuário"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1 rounded transition ${u.status === 'ATIVO' ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                          title={u.status === 'ATIVO' ? 'Desativar Usuário' : 'Ativar Usuário'}
                        >
                          {u.status === 'ATIVO' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">
                  {userToEdit ? `Editar Usuário: ${userToEdit.nome_completo}` : 'Cadastrar Novo Usuário no Cofre'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {formErro && (
              <div className="p-3 mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formErro}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sobrenome *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={sobrenome}
                    onChange={(e) => setSobrenome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {!userToEdit && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CPF * (Validação Matemática)</label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone *</label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={telefone}
                  onChange={(e) => setTelefone(maskPhone(e.target.value))}
                  placeholder="(81) 99999-9999"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Perfil *</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as UserType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USUARIO">USUÁRIO</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nível de Autorização *</label>
                  <select
                    value={nivel}
                    onChange={(e) => setNivel(e.target.value as ClassificationLevel)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PUBLICO">PÚBLICO</option>
                    <option value="INTERNO">INTERNO</option>
                    <option value="CONFIDENCIAL">CONFIDENCIAL</option>
                    <option value="SIGILOSO">SIGILOSO</option>
                  </select>
                </div>
              </div>

              {/* Campos de Senha */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {userToEdit ? 'Definir Nova Senha (deixe em branco para manter)' : 'Senha de Acesso *'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="password"
                    required={!userToEdit}
                    maxLength={128}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="password"
                    required={!userToEdit || !!senha}
                    maxLength={128}
                    value={confirmacaoSenha}
                    onChange={(e) => setConfirmacaoSenha(e.target.value)}
                    placeholder="Confirmação"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
