import React, { useState, useEffect } from 'react';
import { X, FileText, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DocumentItem, ClassificationLevel } from '../types';

interface DocumentFormModalProps {
  documentToEdit: DocumentItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  documentToEdit,
  onClose,
  onSaved,
}) => {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [classificacao, setClassificacao] = useState<ClassificationLevel>('INTERNO');
  const [conteudoTexto, setConteudoTexto] = useState('');
  const [arquivoBase64, setArquivoBase64] = useState<string>('');
  const [arquivoNome, setArquivoNome] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (documentToEdit) {
      setTitulo(documentToEdit.titulo);
      setDescricao(documentToEdit.descricao || '');
      setClassificacao(documentToEdit.classificacao);
      setConteudoTexto(documentToEdit.conteudo_texto || '');
    }
  }, [documentToEdit]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.txt')) {
      setErro('Tipo de arquivo não permitido. Apenas PDF ou TXT são aceitos.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErro('O arquivo ultrapassa o tamanho máximo permitido de 10 MB.');
      return;
    }

    setArquivoNome(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      // Remove o prefixo data:*/*;base64,
      const base64Data = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
      setArquivoBase64(base64Data);
      setErro('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const tituloLimpo = titulo.trim();
    if (tituloLimpo.length < 3 || tituloLimpo.length > 150) {
      setErro('O título deve possuir entre 3 e 150 caracteres.');
      return;
    }

    if (descricao.length > 1000) {
      setErro('A descrição ultrapassa o limite permitido de 1.000 caracteres.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('cofre_token');

    try {
      const url = documentToEdit ? `/api/documents/${documentToEdit.id}` : '/api/documents';
      const method = documentToEdit ? 'PUT' : 'POST';

      const bodyPayload: any = {
        titulo: tituloLimpo,
        descricao: descricao.trim(),
        classificacao,
        conteudo_texto: conteudoTexto.trim()
      };

      if (!documentToEdit && arquivoBase64) {
        bodyPayload.arquivo_base64 = arquivoBase64;
        bodyPayload.arquivo_nome = arquivoNome;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (!res.ok || !data.sucesso) {
        setErro(data.erro || 'Falha ao salvar o documento.');
        setLoading(false);
        return;
      }

      onSaved();
    } catch (err) {
      setErro('Erro de conexão ao salvar documento.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold">
              {documentToEdit ? 'Editar Documento' : 'Cadastrar Novo Documento'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="p-3 mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{erro}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="doc-titulo" className="text-xs font-semibold text-slate-700">
                Título do Documento *
              </label>
              <span className="text-[10px] text-slate-400 font-mono">{titulo.length}/150</span>
            </div>
            <input
              id="doc-titulo"
              type="text"
              required
              minLength={3}
              maxLength={150}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Relatório Financeiro Anual"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="doc-classificacao" className="block text-xs font-semibold text-slate-700 mb-1">
              Nível de Classificação de Segurança *
            </label>
            <select
              id="doc-classificacao"
              required
              value={classificacao}
              onChange={(e) => setClassificacao(e.target.value as ClassificationLevel)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PUBLICO">PÚBLICO - Acesso irrestrito a todos</option>
              <option value="INTERNO">INTERNO - Apenas colaboradores da organização</option>
              <option value="CONFIDENCIAL">CONFIDENCIAL - Acesso restrito com marca d'água</option>
              <option value="SIGILOSO">SIGILOSO - Nível máximo com proteção reforçada</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="doc-descricao" className="text-xs font-semibold text-slate-700">
                Descrição Resumida
              </label>
              <span className="text-[10px] text-slate-400 font-mono">{descricao.length}/1000</span>
            </div>
            <textarea
              id="doc-descricao"
              rows={2}
              maxLength={1000}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Breve sumário dos tópicos cobertos pelo documento..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label htmlFor="doc-conteudo" className="block text-xs font-semibold text-slate-700 mb-1">
              Conteúdo do Documento (Visualização de Texto)
            </label>
            <textarea
              id="doc-conteudo"
              rows={4}
              value={conteudoTexto}
              onChange={(e) => setConteudoTexto(e.target.value)}
              placeholder="Digite ou cole aqui o conteúdo do documento para leitura imediata no cofre seguro..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-serif"
            />
          </div>

          {!documentToEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Anexo PDF Opcional (Máx: 10 MB)
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center bg-slate-50 hover:bg-slate-100 transition">
                <input
                  id="doc-file-upload"
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="doc-file-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-5 h-5 text-blue-600 mb-1" />
                  <span className="text-xs text-slate-600 font-medium">
                    {arquivoNome ? `Selecionado: ${arquivoNome}` : 'Clique para selecionar um arquivo PDF ou TXT'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    (Se não anexado, um PDF institucional será gerado automaticamente com o conteúdo)
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              id="btn-salvar-documento"
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{documentToEdit ? 'Atualizar Documento' : 'Salvar no Cofre'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
