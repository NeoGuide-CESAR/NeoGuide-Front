import type { DadosProjeto } from './dados-projeto';
import type { ComplementosCalculo, EspacoComercial, GrupoResidencial } from './dados-calculo';

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
  enviadoEm?: string; // ISO 8601; ausente em rascunhos
  proximaEtapa?: string;
  resultadoInvalidado?: boolean;
  resultado?: ResultadoCalculo | null;
}

export interface EtapaResidencial { aplicavel: boolean; grupos: GrupoResidencial[]; }
export interface EtapaAreaComum { aplicavel: boolean; cargas: ComplementosCalculo['cargas']; }
export interface EtapaComercial { aplicavel: boolean; espacos: EspacoComercial[]; }
export interface EtapaVeiculoBomba {
  aplicavel: boolean;
  temVeiculo: boolean;
  temBomba: boolean;
  pontos: number | null;
  bombas: number | null;
  potenciaCv: number | null;
}
/** Valores prontos do serviço de cálculo. O front apenas apresenta estes números. */
export interface ResultadoCalculo {
  demandaTotal: number;
  calculadoEm: string;
  norma: string;
  porEtapa: {
    residencial: number | null;
    areaComum: number | null;
    comercial: number | null;
    veiculoBomba: number | null;
    veiculoEletrico: number | null;
    bombaIncendio: number | null;
  };
}
export interface ProjetoDetalhado extends Projeto {
  dados: DadosProjeto;
  residencial: EtapaResidencial;
  areaComum: EtapaAreaComum;
  comercial: EtapaComercial;
  veiculoBomba: EtapaVeiculoBomba;
  resultado: ResultadoCalculo | null;
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
