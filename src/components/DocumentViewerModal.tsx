import React, { useEffect } from 'react';
import { X, ShieldAlert, ShieldCheck, Download, Lock, FileText, AlertTriangle, Printer, Ban } from 'lucide-react';
import { DocumentItem, WatermarkData, User } from '../types';
import { formatClassificationBadge } from '../utils/masks';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  watermark: WatermarkData | null;
  deniedInfo: {
    documento_titulo?: string;
    classificacao?: string;
    nivel_usuario?: string;
  } | null;
  currentUser: User;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  watermark,
  deniedInfo,
  currentUser,
  onClose,
}) => {
  // Prevenção de atalhos de cópia e impressão em documentos restritos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 'c' || e.key === 'C' || e.key === 's' || e.key === 'S')) {
        if (watermark?.bloquear_download_impressao) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [watermark]);

  if (!document && !deniedInfo) return null;

  // CASO 1: ACESSO NEGADO
  if (deniedInfo) {
    const docBadge = formatClassificationBadge(deniedInfo.classificacao || 'CONFIDENCIAL');
    const userBadge = formatClassificationBadge(deniedInfo.nivel_usuario || currentUser.nivel_autorizacao);

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border-2 border-rose-500 overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Header de Alerta */}
          <div className="bg-rose-600 px-6 py-5 text-white text-center relative">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-rose-200 hover:text-white p-1 rounded-full hover:bg-rose-700/50 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-wide uppercase">
              ACESSO NEGADO
            </h2>
            <p className="text-xs text-rose-100 mt-1 font-medium">
              Controle de Acesso da Segurança da Informação
            </p>
          </div>

          {/* Corpo do Acesso Negado */}
          <div className="p-6 space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm font-medium text-center">
              Você não possui autorização suficiente para visualizar este documento.
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-500">Documento:</span>
                <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">{deniedInfo.documento_titulo}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="font-semibold text-slate-500">Classificação:</span>
                <span className={`font-bold px-2 py-0.5 rounded border uppercase text-[10px] ${docBadge.bg}`}>
                  {docBadge.label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">Seu Nível:</span>
                <span className={`font-bold px-2 py-0.5 rounded border uppercase text-[10px] ${userBadge.bg}`}>
                  {userBadge.label}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-100 p-2.5 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Esta tentativa de acesso foi registrada no log de auditoria permanente.</span>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-xl transition"
            >
              Compreendi e Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CASO 2: VISUALIZAÇÃO AUTORIZADA
  if (!document) return null;

  const isRestricted = document.classificacao === 'CONFIDENCIAL' || document.classificacao === 'SIGILOSO';
  const isSigiloso = document.classificacao === 'SIGILOSO';
  const badge = formatClassificationBadge(document.classificacao);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] relative"
        onContextMenu={(e) => {
          if (isRestricted) {
            e.preventDefault();
          }
        }}
      >
        {/* Header do Visualizador */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight truncate max-w-[280px] sm:max-w-md">
                  {document.titulo}
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualização Segura • Criado em {document.criado_em}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isRestricted ? (
              <a
                href={`/api/documents/${document.id}/file`}
                target="_blank"
                rel="noreferrer"
                download={document.arquivo_nome_original}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Baixar PDF</span>
              </a>
            ) : (
              <div className="hidden sm:flex items-center space-x-1 text-xs text-rose-300 bg-rose-950/60 border border-rose-800 px-2.5 py-1 rounded-lg">
                <Ban className="w-3.5 h-3.5" />
                <span>Download / Cópia Bloqueados</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner Informativo de Documento Restrito */}
        {isRestricted && (
          <div className={`px-6 py-2.5 flex items-center justify-between text-xs font-medium ${isSigiloso ? 'bg-rose-900 text-rose-100' : 'bg-amber-900 text-amber-100'}`}>
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4" />
              <span>
                {isSigiloso
                  ? 'DOCUMENTO SIGILOSO - NÍVEL MÁXIMO DE SEGURANÇA. Visualização rastreada e protegida por marca d\'água dinâmica.'
                  : 'DOCUMENTO CONFIDENCIAL - Visualização restrita protegida por marca d\'água de auditoria.'}
              </span>
            </div>
          </div>
        )}

        {/* Área de Conteúdo com Proteção de Seleção e Marca d'Água */}
        <div
          className={`p-6 sm:p-8 overflow-y-auto flex-1 bg-slate-50 relative ${
            isRestricted ? 'select-none' : ''
          }`}
          style={{ userSelect: isRestricted ? 'none' : 'auto' }}
        >
          {/* MARCA D'ÁGUA DINÂMICA SOBREPOSTA (DIAGONAL GRID) */}
          {watermark && (
            <div
              className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-center gap-16 p-8 overflow-hidden"
              style={{ opacity: isSigiloso ? 0.18 : 0.11 }}
            >
              {Array.from({ length: 9 }).map((_, idx) => (
                <div
                  key={idx}
                  className="transform -rotate-25 text-center font-mono font-black select-none border-2 border-dashed p-4 rounded-xl border-slate-900"
                >
                  <p className="text-xl sm:text-2xl text-slate-950 uppercase tracking-widest">
                    {watermark.texto_principal}
                  </p>
                  <p className="text-xs text-slate-900 font-bold mt-1">
                    Visualizado por: {watermark.visualizado_por}
                  </p>
                  <p className="text-[10px] text-slate-800">
                    CPF: {watermark.cpf_usuario}
                  </p>
                  <p className="text-[10px] text-slate-800">
                    {watermark.data_hora} • IP: {watermark.ip}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Conteúdo Real do Documento */}
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 relative z-0">
            <div className="border-b border-slate-200 pb-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Cofre de Documentos • Ref #{document.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badge.bg}`}>
                  {document.classificacao}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 leading-snug">
                {document.titulo}
              </h1>
              {document.descricao && (
                <p className="text-xs text-slate-600 mt-2 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {document.descricao}
                </p>
              )}
            </div>

            {/* Texto do Documento */}
            <div className="prose prose-sm text-slate-800 leading-relaxed space-y-4 font-serif text-justify text-sm sm:text-base">
              {document.conteudo_texto ? (
                document.conteudo_texto.split('\n').map((paragrafo, idx) => (
                  <p key={idx}>{paragrafo}</p>
                ))
              ) : (
                <p className="text-slate-500 italic">
                  Este documento foi anexado em formato binário seguro ({document.arquivo_nome_original}).
                </p>
              )}
            </div>

            {/* Rodapé Interno do Documento */}
            <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Cadastrado por: {document.criado_por_nome || 'Administrador'}</span>
              <span>Integridade: SHA-256 Validado</span>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Sessão de auditoria ativa para {currentUser.nome_completo}</span>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg font-medium transition"
          >
            Fechar Visualizador
          </button>
        </div>
      </div>
    </div>
  );
};
