import { HttpErrorResponse } from '@angular/common/http';

export type NivelAlerta = 'INFO' | 'ALERTA' | 'ERRO';
/** Etapas pelo nome usado no back; o número é o índice (base 0) do wizard. */
export type EtapaSlug = 'projeto' | 'residencial' | 'area-comum' | 'comercial' | 'cargas-especiais';

export const ETAPAS: { slug: EtapaSlug; indice: number; rotulo: string }[] = [
  { slug: 'projeto', indice: 0, rotulo: 'Projeto' },
  { slug: 'residencial', indice: 1, rotulo: 'Residencial' },
  { slug: 'area-comum', indice: 2, rotulo: 'Área comum' },
  { slug: 'comercial', indice: 3, rotulo: 'Comercial' },
  { slug: 'cargas-especiais', indice: 4, rotulo: 'VE e bomba de incêndio' },
];

export interface ItemValidacaoApi {
  codigo: string;
  nivel: NivelAlerta;
  mensagem: string;
  campo?: string | null;
  etapa?: EtapaSlug | null;
  /** Aba da área comum e índice do item em listas (base 0): levam ao ponto exato da correção. */
  aba?: string | null;
  item?: number | null;
  /** Texto do link principal (ex.: "Revisar espaços") e uma segunda ação possível. */
  rotuloAcao?: string | null;
  alternativa?: { rotulo: string; etapa: EtapaSlug; campo?: string | null } | null;
}

export interface ValidacaoApi {
  projectId: number;
  situacao: 'ERRO' | 'ATENCAO' | 'OK';
  quantidadeErros: number;
  quantidadeAlertas: number;
  /** INFO não conta como ponto de atenção. */
  totais: { erros: number; alertas: number; infos: number };
  itens: ItemValidacaoApi[];
}

export interface CalculoApi {
  projectId: number;
  protocolo: string;
  status: string;
  situacaoCalculo: 'CALCULADO' | 'DESATUALIZADO';
  calculadoEm: string | null;
  resumoDemandas: { drf: number; ds: number; dc: number; dve: number; dmbi: number; ded: number; dqdg: number };
  enquadramento: {
    tipoFornecimento: 'BT_380_220V' | 'MT'; limiteKva: number; atendimentoMT: boolean;
    /** Escolhido na etapa 1 e o derivado usado no limite de BT (residencial com espaços comerciais vira MISTO). */
    tipoEdificacao: string | null; tipoEnquadramento: string; motivoEnquadramento: string | null;
  };
  dimensionamentoEntrada: {
    disjuntorGeralA: number; circuitos: number; caboFaseMm2: string; caboNeutroMm2: string;
    eletrodutoEntrada: string; tabelaReferencia: string; correnteProjetoA: number | null;
  } | null;
  barramentoQdg: { secao: string; capacidadeA: number; tabelaReferencia: string } | null;
  alertas: { codigo: string; nivel: NivelAlerta; mensagem: string; campo?: string | null }[];
  seloConformidade: 'ATENDIMENTO_MT' | 'COM_ALERTAS' | 'CONFORME';
}

export interface EtapasApi {
  residencial: { tipologias: { areaUtilM2: number; quantidadeUnidades: number; smartStudio: boolean }[] };
  areaComum: { cargas: CargaAreaComumApi[] };
  cargasEspeciais: { qtdPontosVe: number | null; potenciaVeKw: number | null; potenciaBombaIncendioCv: number | null; potenciaSolarInversorKw: number | null; medidorExclusivo: boolean | null } | null;
}

export interface CargaAreaComumApi {
  origem: string | null; submodulo: string | null; tipoEquipamento: string | null; descricao: string | null;
  quantidade: number | null; potenciaNominalKw: number | null; fatorPotencia: number | null; fatorDemanda: number | null; reserva: boolean;
}

/** RFC 7807 do back (calcular e memorial): regra violada e itens a corrigir. */
export interface ProblemaCalculo {
  status: number;
  regra: string | null;
  detalhe: string;
  erros: ItemValidacaoApi[];
  semConexao: boolean;
}

export function lerProblema(erro: unknown): ProblemaCalculo {
  if (erro instanceof HttpErrorResponse) {
    const corpo = (erro.error && typeof erro.error === 'object' ? erro.error : {}) as { regra?: string; detail?: string; erros?: ItemValidacaoApi[] };
    return { status: erro.status, regra: corpo.regra ?? null, detalhe: corpo.detail ?? '', erros: corpo.erros ?? [], semConexao: erro.status === 0 };
  }
  // Tempo esgotado (RxJS timeout) ou falha desconhecida: tratar como indisponibilidade.
  return { status: 0, regra: null, detalhe: '', erros: [], semConexao: true };
}
