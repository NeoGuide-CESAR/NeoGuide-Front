import { HttpErrorResponse } from '@angular/common/http';

import { DadosProjeto } from './dados-projeto';
import { EspacoComercial } from './dados-calculo';
import { FiltroStatus, OrdemProjetos, ResultadoListagem } from './listagem';
import { Projeto, ResumoProjetos, StatusProjeto } from './projeto.model';

/** Espaço comercial como o back devolve (CommercialUnitItemResponse). */
export interface EspacoComercialApi {
  id?: number | null;
  ordem?: number | null;
  ocupacaoCodigo?: string | null;
  rotulo?: string | null;
  areaM2?: number | null;
  cargaInstaladaKw?: number | null;
  cargaMinimaKw?: number | null;
  demandaCalculadaKva?: number | null;
  alerta?: string | null;
}

/** Resposta do pré-cálculo da etapa comercial (PreCalculoEtapaResponse do back). */
export interface PreCalculoEtapaApi {
  etapa: string;
  potenciaTotalInstaladaKw: number;
  demandaComercialDcKva: number;
  espacos: EspacoComercialApi[];
}

/** Pré-cálculo que a tela mostra: o Dc vem do back, o front não calcula. */
export interface PreCalculoComercial {
  dcKva: number;
  espacos: { alerta: string | null; dcKva: number | null }[];
}

/** Estado de uma etapa do wizard, decidido no servidor. */
export type EstadoEtapaApi = 'CONCLUIDA' | 'ATUAL' | 'DISPONIVEL' | 'BLOQUEADA' | 'NAO_SE_APLICA';
export interface EtapaEstadoApi { numero: number; nome: string; estado: EstadoEtapaApi; }

/** Formato de ProjectResponse (back, NeoGuide-Back). */
export interface ProjetoApi {
  id: number;
  protocolo: string;
  nome: string;
  status: string;
  statusDescricao: string;
  tipoEdificacao?: string | null;
  tipoEdificacaoDescricao?: string | null;
  uf?: string | null;
  municipio?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cep?: string | null;
  tensaoFornecimento?: string | null;
  responsavel?: string | null;
  crea?: string | null;
  possuiComercial: boolean;
  possuiVe: boolean;
  possuiIncendio: boolean;
  etapaAtual?: number | null;
  dataSubmissao?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  espacosComerciais?: EspacoComercialApi[] | null;
  /** Estado de cada etapa (1 a 5) e tipo usado no enquadramento BT/MT, calculados no servidor. */
  etapas?: EtapaEstadoApi[] | null;
  tipoEnquadramento?: string | null;
}

/** Página do Spring (Page<T>). `number` é a página em base 0. */
export interface PaginaApi<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

/** TotaisProjetosResponse (back). */
export interface TotaisApi {
  todos: number;
  rascunho: number;
  emAnalise: number;
  aguardandoCorrecao: number;
  aprovado: number;
  reprovado: number;
}

export const TOTAL_ETAPAS = 6;

/** Situação do back -> grupo exibido no front. "Aguardando correção" fica no grupo Reprovado (ver statusDescricao). */
const STATUS_DA_API: Record<string, StatusProjeto> = {
  RASCUNHO: 'rascunho',
  EM_ANALISE: 'em_analise',
  AGUARDANDO_CORRECAO: 'reprovado',
  APROVADO: 'aprovado',
  REPROVADO: 'reprovado',
};

/** Filtro do front -> situações do back. "Reprovado" inclui "Aguardando correção". */
const SITUACOES_DO_FILTRO: Record<FiltroStatus, string[]> = {
  todos: [],
  rascunho: ['RASCUNHO'],
  em_analise: ['EM_ANALISE'],
  aprovado: ['APROVADO'],
  reprovado: ['REPROVADO', 'AGUARDANDO_CORRECAO'],
};

/** Ordenação do front -> sort do Spring (campos da entidade). */
export const ORDEM_DA_API: Record<OrdemProjetos, string> = {
  recentes: 'updatedAt,desc',
  antigos: 'updatedAt,asc',
  az: 'titulo,asc',
};

/** Nome do tipo no formulário -> valor do enum no back. */
const TIPO_DA_API: Record<string, string> = {
  'Residencial multifamiliar': 'RESIDENCIAL_MULTIFAMILIAR',
  Comercial: 'COMERCIAL',
  'Uso misto (residencial e comercial)': 'MISTO',
};

const ETAPAS_NOMES = [
  'Projeto',
  'Unidades residenciais',
  'Área comum',
  'Espaços comerciais',
  'VE e bomba de incêndio',
  'Revisão e cálculo',
];

export function situacoesDoFiltro(status: FiltroStatus): string[] {
  return SITUACOES_DO_FILTRO[status];
}

export function paraProjeto(p: ProjetoApi): Projeto {
  const etapa = p.etapaAtual ?? 1;
  const rascunho = p.status === 'RASCUNHO';
  return {
    id: String(p.id),
    nome: p.nome,
    status: STATUS_DA_API[p.status] ?? 'rascunho',
    rotuloStatus: p.statusDescricao,
    atualizadoEm: (p.updatedAt ?? p.createdAt ?? '').slice(0, 10),
    criadoEm: (p.createdAt ?? '').slice(0, 10),
    enviadoEm: rascunho ? undefined : (p.dataSubmissao ?? '').slice(0, 10) || undefined,
    tipoEdificacao: p.tipoEdificacaoDescricao ?? undefined,
    endereco: [p.endereco, p.bairro, p.municipio].filter(Boolean).join(' · ') || undefined,
    etapaAtual: etapa,
    totalEtapas: TOTAL_ETAPAS,
    proximaEtapa: rascunho ? ETAPAS_NOMES[Math.min(etapa, ETAPAS_NOMES.length) - 1] : undefined,
  };
}

export function paraPagina(pagina: PaginaApi<ProjetoApi>, paginaAtual: number): Pick<ResultadoListagem, 'itens' | 'total' | 'pagina' | 'totalPaginas'> {
  return {
    itens: pagina.content.map(paraProjeto),
    total: pagina.totalElements,
    pagina: paginaAtual,
    totalPaginas: Math.max(1, pagina.totalPages),
  };
}

/** Indicadores de status (grupos do front). */
export function paraResumo(t: TotaisApi): ResumoProjetos {
  return {
    rascunho: t.rascunho,
    em_analise: t.emAnalise,
    aprovado: t.aprovado,
    reprovado: t.reprovado + t.aguardandoCorrecao,
  };
}

/** Chips de Meus Projetos (grupos do front). */
export function paraTotaisFiltro(t: TotaisApi): Record<FiltroStatus, number> {
  return { todos: t.todos, ...paraResumo(t), };
}

/** Formulário do wizard -> corpo aceito por POST e PATCH /projects. */
export function paraPayloadProjeto(d: DadosProjeto) {
  return {
    titulo: d.nome.trim(),
    tipoEdificacao: TIPO_DA_API[d.tipoEdificacao] ?? null,
    possuiComercial: d.tipoEdificacao !== 'Residencial multifamiliar' && d.tipoEdificacao !== '',
    possuiVe: d.temVe,
    possuiIncendio: d.temBomba,
    // Tensão padrão de baixa tensão enquanto o passo 1 não coleta esse dado.
    tensaoFornecimento: '380_220V',
    municipio: d.municipio.trim(),
    uf: d.uf || null,
    cep: d.cep || null,
    endereco: d.endereco.trim() || null,
    bairro: d.bairro.trim() || null,
  };
}

/** Espaços comerciais do formulário -> corpo do PUT etapa-comercial (e do pré-cálculo). */
export function paraEspacosApi(espacos: EspacoComercial[]) {
  return espacos.map(e => ({ ocupacaoCodigo: e.ocupacao, areaM2: e.area, cargaInstaladaKw: e.carga }));
}

/** Espaços comerciais gravados -> formulário da etapa 4, na ordem do back. */
export function paraEspacosComerciais(p: ProjetoApi): EspacoComercial[] {
  return (p.espacosComerciais ?? []).map(e => ({
    ocupacao: e.ocupacaoCodigo ?? '',
    area: e.areaM2 ?? null,
    carga: e.cargaInstaladaKw ?? null,
  }));
}

/** Resposta do pré-cálculo -> valores que a tela exibe. */
export function paraPreCalculo(r: PreCalculoEtapaApi): PreCalculoComercial {
  return {
    dcKva: r.demandaComercialDcKva,
    espacos: (r.espacos ?? []).map(e => ({ alerta: e.alerta ?? null, dcKva: e.demandaCalculadaKva ?? null })),
  };
}

/** ProjetoApi -> dados do formulário do passo 1 (para abrir um projeto existente no wizard). */
export function paraDadosProjeto(p: ProjetoApi): DadosProjeto {
  return {
    nome: p.nome,
    tipoEdificacao: (p.tipoEdificacaoDescricao ?? '') as DadosProjeto['tipoEdificacao'],
    cep: p.cep ?? '',
    endereco: p.endereco ?? '',
    bairro: p.bairro ?? '',
    municipio: p.municipio ?? '',
    uf: p.uf ?? '',
    temVe: p.possuiVe,
    temBomba: p.possuiIncendio,
  };
}

/** Mensagem legível de um erro HTTP do back (campo `message`), com texto padrão de conexão. */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir a operação. Tente novamente.'): string {
  if (erro instanceof HttpErrorResponse) {
    if (erro.status === 0) return 'Não foi possível conectar ao servidor. Tente novamente.';
    const mensagem = (erro.error as { message?: string } | null)?.message;
    if (mensagem) return mensagem;
  }
  return padrao;
}
