import React from 'react';
import { X, ShieldCheck, Lock, Eye, AlertTriangle, KeyRound, Database, FileCheck } from 'lucide-react';

interface SecurityGuideModalProps {
  onClose: () => void;
}

export const SecurityGuideModal: React.FC<SecurityGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Arquitetura de Segurança da Informação</h2>
              <p className="text-xs text-slate-400">Guia dos Níveis de Confidencialidade e Controles do Cofre</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-700 leading-relaxed">
          {/* 1. Hierarquia de Classificação */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>1. Hierarquia dos 4 Níveis de Confidencialidade</span>
            </h3>
            <p className="text-slate-600">
              O cofre implementa a hierarquia estrita: <strong>PÚBLICO &lt; INTERNO &lt; CONFIDENCIAL &lt; SIGILOSO</strong>. Quanto maior o nível, maior a restrição:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="font-bold text-emerald-800">1. PÚBLICO</span>
                <p className="text-[11px] text-emerald-700 font-sans mt-0.5">Acesso livre a todos os usuários autenticados.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <span className="font-bold text-blue-800">2. INTERNO</span>
                <p className="text-[11px] text-blue-700 font-sans mt-0.5">Apenas colaboradores. Usuários de nível Público têm acesso negado.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300">
                <span className="font-bold text-amber-900">3. CONFIDENCIAL</span>
                <p className="text-[11px] text-amber-800 font-sans mt-0.5">Exige clearance Confidencial ou Sigiloso. Protegido por marca d'água.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300">
                <span className="font-bold text-rose-900">4. SIGILOSO</span>
                <p className="text-[11px] text-rose-800 font-sans mt-0.5">Nível máximo. Marca d'água destacada e auditoria reforçada.</p>
              </div>
            </div>
          </div>

          {/* 2. Princípio da Não-Confiança nos Dados do Cliente */}
          <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>2. Validação Dupla e Proteção no Backend Python</span>
            </h3>
            <p className="text-slate-600">
              A interface fornece feedback visual e máscaras em tempo real, mas <strong>toda e qualquer validação é re-executada no Python antes de qualquer persistência</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>Cálculo matemático oficial de CPF por módulo 11 (rejeita números falsos ou duplicados).</li>
              <li>Formato de telefone brasileiro (DDD válido + 10 ou 11 dígitos).</li>
              <li>Consultas 100% parametrizadas (proteção contra SQL Injection).</li>
              <li>Sanitização de caminhos com UUID (proteção contra Path Traversal).</li>
            </ul>
          </div>

          {/* 3. Proteção e Visualização Controlada */}
          <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>3. Visualizador Protegido com Marca d'Água Dinâmica</span>
            </h3>
            <p className="text-slate-600">
              Ao abrir documentos Confidenciais ou Sigilosos:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>Botões de download e impressão são suprimidos.</li>
              <li>Seleção de texto e atalhos de cópia (Ctrl+C, Ctrl+P) são desabilitados.</li>
              <li>Uma marca d'água dinâmica com o <strong>Nome do Usuário</strong>, <strong>CPF</strong>, <strong>Data/Hora</strong> e <strong>IP</strong> é renderizada sobreposta ao conteúdo para rastreabilidade de vazamentos.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};
