import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_BASE } from '../api/api.config';
import { DadosProjeto } from './dados-projeto';
import { EspacoComercial } from './dados-calculo';
import { FiltroStatus, ParametrosListagem, ResultadoListagem } from './listagem';
import {
  ORDEM_DA_API,
  PaginaApi,
  PreCalculoEtapaApi,
  PreCalculoComercial,
  ProjetoApi,
  TotaisApi,
  paraDadosProjeto,
  paraEspacosApi,
  paraEspacosComerciais,
  paraPagina,
  paraPayloadProjeto,
  paraPreCalculo,
  paraProjeto,
  paraResumo,
  paraTotaisFiltro,
  situacoesDoFiltro,
} from './projetos.api';
import { Projeto, ResumoProjetos } from './projeto.model';

const RECURSO = `${API_BASE}/projects`;
const RESUMO_VAZIO: ResumoProjetos = { rascunho: 0, em_analise: 0, aprovado: 0, reprovado: 0 };

/** Projeto carregado para o wizard. */
export interface ProjetoCarregado {
  dados: DadosProjeto;
  espacosComerciais: EspacoComercial[];
  /** Resposta bruta do back (protocolo, responsável, ART e rótulos dos espaços). */
  api: ProjetoApi;
}

/**
 * Projetos do usuário logado (API /api/v1/projects).
 * Indicadores, recentes e rascunho em andamento ficam em sinais, atualizados por `atualizarPainel()`.
 */
@Injectable({ providedIn: 'root' })
export class ProjetosService {
  private readonly http = inject(HttpClient);

  private readonly _resumo = signal<ResumoProjetos>(RESUMO_VAZIO);
  private readonly _recentes = signal<Projeto[]>([]);
  private readonly _rascunho = signal<Projeto | null>(null);
  /** Projetos já carregados nesta sessão (para mostrar o nome em outras telas). */
  private readonly _conhecidos = signal<Projeto[]>([]);

  readonly resumo = this._resumo.asReadonly();
  readonly recentes = this._recentes.asReadonly();
  readonly rascunhoEmAndamento = this._rascunho.asReadonly();
  readonly projetos = this._conhecidos.asReadonly();

  /** Recarrega os indicadores e os blocos da Home. Em caso de falha, mantém o último estado. */
  atualizarPainel(): void {
    forkJoin({
      totais: this.totais(),
      recentes: this.pagina({ busca: '', status: 'todos', ordem: 'recentes', pagina: 1, tamanho: 3 }),
      rascunho: this.pagina({ busca: '', status: 'rascunho', ordem: 'recentes', pagina: 1, tamanho: 1 }),
    }).subscribe({
      next: ({ totais, recentes, rascunho }) => {
        this._resumo.set(paraResumo(totais));
        const itensRecentes = recentes.content.map(paraProjeto);
        this._recentes.set(itensRecentes);
        this._rascunho.set(rascunho.content[0] ? paraProjeto(rascunho.content[0]) : null);
        this.memorizar(itensRecentes);
      },
      error: () => undefined,
    });
  }

  /** Página de Meus Projetos: busca, status, ordenação e paginação no servidor; totais por chip. */
  listar(parametros: ParametrosListagem): Observable<ResultadoListagem> {
    const busca = parametros.busca.trim();
    return forkJoin({
      pagina: this.pagina(parametros),
      totaisBusca: this.totais(busca),
      totaisGeral: busca ? this.totais() : of(null),
    }).pipe(
      map(({ pagina, totaisBusca, totaisGeral }) => {
        const dados = paraPagina(pagina, parametros.pagina);
        this.memorizar(dados.itens);
        return {
          ...dados,
          totais: paraTotaisFiltro(totaisBusca),
          totalGeral: (totaisGeral ?? totaisBusca).todos,
        };
      }),
    );
  }

  /** Carrega um projeto existente: dados do passo 1 e espaços comerciais gravados (etapa 4). */
  buscar(id: string): Observable<ProjetoCarregado> {
    return this.http.get<ProjetoApi>(`${RECURSO}/${id}`).pipe(map(p => ({
      dados: paraDadosProjeto(p),
      espacosComerciais: paraEspacosComerciais(p),
      api: p,
    })));
  }

  /** Grava a lista inteira de espaços comerciais (etapa 4). A lista enviada substitui a anterior no back. */
  salvarComercial(id: string, espacos: EspacoComercial[]): Observable<void> {
    return this.http.put(`${RECURSO}/${id}/etapa-comercial`, { espacos: paraEspacosApi(espacos) }).pipe(map(() => undefined));
  }

  /** Registra a etapa mais adiantada alcançada (1 a 6). É o que conclui etapas opcionais avançadas sem preencher. */
  registrarEtapa(id: string, etapa: number): Observable<void> {
    return this.http.put(`${RECURSO}/${id}/etapa-atual`, { etapa }).pipe(map(() => undefined));
  }

  /** Grava as tipologias residenciais (etapa 2). A lista enviada substitui a anterior. */
  salvarResidencial(id: string, tipologias: { areaUtilM2: number; quantidadeUnidades: number; smartStudio: boolean }[]): Observable<void> {
    return this.http.put(`${RECURSO}/${id}/etapa-residencial`, { tipologias }).pipe(map(() => undefined));
  }

  /** Grava as cargas da área comum (etapa 3). A lista enviada substitui a anterior. */
  salvarAreaComum(id: string, cargas: unknown[]): Observable<void> {
    return this.http.put(`${RECURSO}/${id}/etapa-area-comum`, { cargas }).pipe(map(() => undefined));
  }

  /** Grava VE e motobomba de incêndio (etapa 5). */
  salvarEspeciais(id: string, corpo: { qtdPontosVe: number | null; potenciaVeKw: number | null; potenciaBombaIncendioCv: number | null; medidorExclusivo: boolean | null }): Observable<void> {
    return this.http.put(`${RECURSO}/${id}/etapa-cargas-especiais`, corpo).pipe(map(() => undefined));
  }

  /** Demanda comercial estimada para a tela, calculada no back. Não grava nada. */
  preCalcularComercial(espacos: EspacoComercial[]): Observable<PreCalculoComercial> {
    return this.http.post<PreCalculoEtapaApi>(`${API_BASE}/simulacao/pre-calculo-etapa`, {
      etapa: 'comercial',
      espacos: paraEspacosApi(espacos),
    }).pipe(map(paraPreCalculo));
  }

  /** Cria o projeto (passo 1 concluído). Devolve o id do projeto criado. */
  criar(dados: DadosProjeto): Observable<string> {
    return this.http.post<{ id: number }>(RECURSO, paraPayloadProjeto(dados)).pipe(map((r) => String(r.id)));
  }

  /** Atualiza os dados do passo 1 de um projeto existente. */
  atualizar(id: string, dados: DadosProjeto): Observable<void> {
    return this.http.patch<ProjetoApi>(`${RECURSO}/${id}`, paraPayloadProjeto(dados)).pipe(map(() => undefined));
  }

  /** Duplica o projeto (com as etapas) e devolve a cópia, em rascunho. */
  duplicar(id: string): Observable<Projeto> {
    return this.http.post<ProjetoApi>(`${RECURSO}/${id}/duplicate`, {}).pipe(map(paraProjeto));
  }

  /** Exclui um projeto em rascunho (o back recusa as demais situações). */
  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${RECURSO}/${id}`);
  }

  private pagina(p: ParametrosListagem): Observable<PaginaApi<ProjetoApi>> {
    let params = new HttpParams()
      .set('page', String(p.pagina - 1))
      .set('size', String(p.tamanho))
      .set('sort', ORDEM_DA_API[p.ordem]);
    const busca = p.busca.trim();
    if (busca) params = params.set('search', busca);
    const situacoes = situacoesDoFiltro(p.status as FiltroStatus);
    if (situacoes.length) params = params.set('status', situacoes.join(','));
    return this.http.get<PaginaApi<ProjetoApi>>(RECURSO, { params });
  }

  private totais(busca = ''): Observable<TotaisApi> {
    const params = busca ? new HttpParams().set('search', busca) : undefined;
    return this.http.get<TotaisApi>(`${RECURSO}/totais`, { params });
  }

  /** Guarda os projetos vistos, sem duplicar, para o nome aparecer em outras telas. */
  private memorizar(novos: Projeto[]): void {
    this._conhecidos.update((atuais) => {
      const porId = new Map(atuais.map((p) => [p.id, p]));
      for (const p of novos) porId.set(p.id, p);
      return [...porId.values()];
    });
  }
}
