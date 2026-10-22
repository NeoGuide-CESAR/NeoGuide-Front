export type StatusProjeto = 'rascunho' | 'em_analise' | 'aprovado' | 'reprovado';

export interface Projeto {
  id: string;
  nome: string;
  atualizadoEm: string; // ISO 8601
  status: StatusProjeto;
  etapaAtual?: number;
  totalEtapas?: number;
  tipoEdificacao?: string;
  endereco?: string;
  unidadesConsumidoras?: number;
  criadoEm?: string; // ISO 8601
  proximaEtapa?: string;
}

export interface ResumoProjetos {
  rascunho: number;
  em_analise: number;
  aprovado: number;
  reprovado: number;
}

export const STATUS_INFO: Record<StatusProjeto, { rotulo: string; icone: string }> = {
  rascunho: { rotulo: 'Rascunho', icone: 'edit_note' },
  em_analise: { rotulo: 'Em análise', icone: 'schedule' },
  aprovado: { rotulo: 'Aprovado', icone: 'check_circle' },
  reprovado: { rotulo: 'Reprovado', icone: 'cancel' },
};
