import { ParamMap, Params } from '@angular/router';
import { Projeto, StatusProjeto } from './projeto.model';

export type FiltroStatus = 'todos' | StatusProjeto;
export type OrdemProjetos = 'recentes' | 'antigos' | 'az';

export const TAMANHOS_PAGINA = [10, 20, 50];
const TAMANHO_PADRAO = 10;

/** Valores usados na URL (ex.: ?status=em-analise). */
const STATUS_NA_URL: Record<FiltroStatus, string> = {
  todos: 'todos',
  rascunho: 'rascunho',
  em_analise: 'em-analise',
  aprovado: 'aprovado',
  reprovado: 'reprovado',
};

export interface ParametrosListagem {
  busca: string;
  status: FiltroStatus;
  ordem: OrdemProjetos;
  pagina: number;
  tamanho: number;
}

/** Resultado de uma página de Meus Projetos. Filtros, ordenação e paginação são feitos no servidor. */
export interface ResultadoListagem {
  itens: Projeto[];
  /** Contagens respeitam a busca, mas não o filtro de status. */
  totais: Record<FiltroStatus, number>;
  /** Total com busca e status aplicados. */
  total: number;
  /** Total de projetos da carteira, sem nenhum filtro. */
  totalGeral: number;
  pagina: number;
  totalPaginas: number;
}

/** Lê a query string, corrigindo valores inválidos para o padrão. */
export function lerParametros(mapa: ParamMap): ParametrosListagem {
  const statusBruto = mapa.get('status');
  const status = (Object.keys(STATUS_NA_URL) as FiltroStatus[]).find((s) => STATUS_NA_URL[s] === statusBruto) ?? 'todos';

  const ordemBruta = mapa.get('ordem');
  const ordem: OrdemProjetos = ordemBruta === 'antigos' || ordemBruta === 'az' ? ordemBruta : 'recentes';

  const pagina = Math.max(1, Math.floor(Number(mapa.get('pagina'))) || 1);

  const tamanhoBruto = Number(mapa.get('tamanho'));
  const tamanho = TAMANHOS_PAGINA.includes(tamanhoBruto) ? tamanhoBruto : TAMANHO_PADRAO;

  return { busca: mapa.get('busca') ?? '', status, ordem, pagina, tamanho };
}

/** Valor da query string para um status; "todos" some da URL. */
export function statusParaUrl(status: FiltroStatus): string | null {
  return status === 'todos' ? null : STATUS_NA_URL[status];
}

/** Parâmetros que voltam para a URL: `null` remove a chave (valores padrão não aparecem). */
export function paraQueryParams(parametros: ParametrosListagem): Params {
  return {
    busca: parametros.busca.trim() || null,
    status: statusParaUrl(parametros.status),
    ordem: parametros.ordem === 'recentes' ? null : parametros.ordem,
    pagina: parametros.pagina === 1 ? null : parametros.pagina,
    tamanho: parametros.tamanho === TAMANHO_PADRAO ? null : parametros.tamanho,
  };
}
