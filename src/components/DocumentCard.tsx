import React from 'react';
import { FileText, ShieldAlert, ShieldCheck, Eye, Edit3, Trash2, Calendar, FileCheck } from 'lucide-react';
import { DocumentItem } from '../types';
import { formatClassificationBadge, formatFileSize } from '../utils/masks';

interface DocumentCardProps {
  document: DocumentItem;
  userRole: string;
  onView: (doc: DocumentItem) => void;
  onEdit?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  userRole,
  onView,
  onEdit,
  onDelete,
}) => {
  const badge = formatClassificationBadge(document.classificacao);
  const isAuthorized = document.autorizado;
  const isAdmin = userRole === 'ADMINISTRADOR';

  return (
    <div
      id={`doc-card-${document.id}`}
      className={`bg-white rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
        isAuthorized ? 'border-slate-200 hover:border-blue-300' : 'border-rose-200 bg-rose-50/10'
      }`}
    >
      {/* Top Header do Card */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${isAuthorized ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${badge.bg}`}>
              {badge.label}
            </span>
          </div>

          {/* Indicador de Status de Acesso */}
          <div className="flex items-center">
            {isAuthorized ? (
              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Permitido</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Restrito</span>
              </span>
            )}
          </div>
        </div>

        {/* Título & Descrição */}
        <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1 mb-1">
          {document.titulo}
        </h3>
        <p className="text-slate-600 text-xs line-clamp-2 min-h-[32px] leading-relaxed">
          {document.descricao || 'Sem descrição adicional.'}
        </p>
      </div>

      {/* Rodapé e Ações */}
      <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto">
        <div className="text-[11px] text-slate-500 flex flex-col">
          <span className="flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{document.criado_em ? document.criado_em.split(' ')[0] : 'Hoje'}</span>
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {formatFileSize(document.arquivo_tamanho)} • {document.arquivo_tipo === 'application/pdf' ? 'PDF' : 'DOC'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {isAdmin && onEdit && (
            <button
              onClick={() => onEdit(document)}
              title="Editar Documento"
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          {isAdmin && onDelete && (
            <button
              onClick={() => onDelete(document)}
              title="Excluir Documento"
              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            id={`btn-view-${document.id}`}
            onClick={() => onView(document)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
              isAuthorized
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isAuthorized ? 'Visualizar' : 'Solicitar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
