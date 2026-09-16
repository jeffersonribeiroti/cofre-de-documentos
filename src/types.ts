export type ClassificationLevel = 'PUBLICO' | 'INTERNO' | 'CONFIDENCIAL' | 'SIGILOSO';
export type UserType = 'ADMINISTRADOR' | 'USUARIO';
export type UserStatus = 'ATIVO' | 'INATIVO';

export interface User {
  id: number;
  nome: string;
  sobrenome: string;
  nome_completo: string;
  cpf_formatado: string;
  telefone_formatado: string;
  tipo: UserType;
  nivel_autorizacao: ClassificationLevel;
  status: UserStatus;
  terms_accepted?: boolean;
  privacy_accepted?: boolean;
  terms_version?: string;
  privacy_version?: string;
  accepted_at?: string;
  criado_em?: string;
}

export interface LegalDocument {
  id: string;
  titulo: string;
  versao: string;
  data_vigencia: string;
  conteudo: string;
}

export interface LegalMetadata {
  terms_version: string;
  privacy_version: string;
  lgpd_compliant: boolean;
  dpo_contact: string;
  updated_at: string;
}

export interface DocumentItem {
  id: number;
  titulo: string;
  descricao: string;
  classificacao: ClassificationLevel;
  arquivo_nome_original: string;
  arquivo_tamanho: number;
  arquivo_tipo: string;
  conteudo_texto?: string;
  criado_por_nome?: string;
  criado_em: string;
  atualizado_em?: string;
  autorizado?: boolean;
  nivel_documento_peso?: number;
  nivel_usuario_peso?: number;
}

export interface WatermarkData {
  texto_principal: string;
  visualizado_por: string;
  cpf_usuario: string;
  data_hora: string;
  ip: string;
  nivel_protecao: 'PADRAO' | 'ELEVADO' | 'MAXIMO';
  bloquear_download_impressao: boolean;
}

export interface AuditLog {
  id: number;
  usuario_id?: number;
  usuario_nome: string;
  usuario_cpf_formatado: string;
  acao: string;
  documento_id?: number;
  documento_titulo?: string;
  classificacao_documento?: string;
  nivel_usuario?: string;
  resultado: 'SUCESSO' | 'NEGADO' | 'ERRO';
  detalhes?: string;
  ip: string;
  data_hora: string;
}

export interface DashboardMetrics {
  total_usuarios: number;
  total_documentos: number;
  docs_publicos: number;
  docs_internos: number;
  docs_confidenciais: number;
  docs_sigilosos: number;
  total_acessos: number;
  total_acessos_negados: number;
}
