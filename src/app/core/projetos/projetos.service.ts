import { Injectable, computed, signal } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { PROJETOS_MOCK } from './projetos.mock';
import { ParametrosListagem, ResultadoListagem, calcularListagem } from './listagem';
import { Projeto, ResumoProjetos } from './projeto.model';

/** Atraso simulado da "API" de listagem, em ms. */
const LATENCIA_SIMULADA = 300;

/**
 * Dados SIMULADOS. Quando a API existir, troque `listar`, `duplicar` e `excluir`
 * por chamadas HTTP (ex.: GET /api/projetos com os parâmetros da listagem)
 * e mantenha o mesmo contrato.
 */
@Injectable({ providedIn: 'root' })
export class ProjetosService {
  private readonly _projetos = signal<Projeto[]>(
    PROJETOS_MOCK.map((p) => ({ ...p, enviadoEm: p.status === 'rascunho' ? undefined : p.atualizadoEm })),
  );

  readonly projetos = this._projetos.asReadonly();

  readonly recentes = computed(() =>
    [...this._projetos()]
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
      .slice(0, 3),
  );

  readonly resumo = computed<ResumoProjetos>(() => {
    const r: ResumoProjetos = { rascunho: 0, em_analise: 0, aprovado: 0, reprovado: 0 };
    for (const p of this._projetos()) r[p.status]++;
    return r;
  });

  /** Último rascunho mexido — alimenta o card "Continuar cálculo". */
  readonly rascunhoEmAndamento = computed(() =>
    this.recentes().find((p) => p.status === 'rascunho') ?? null,
  );

  /** Listagem paginada com busca, status e ordenação. Os totais dos chips respeitam a busca. */
  listar(parametros: ParametrosListagem): Observable<ResultadoListagem> {
    return defer(() => of(calcularListagem(this._projetos(), parametros))).pipe(delay(LATENCIA_SIMULADA));
  }

  /** Cria uma cópia em rascunho no topo da lista e devolve o id da cópia. */
  duplicar(id: string): string | null {
    const original = this._projetos().find((p) => p.id === id);
    if (!original) return null;
    const hoje = new Date().toISOString().slice(0, 10);
    const copia: Projeto = {
      ...original,
      id: `${original.id}-copia-${Date.now()}`,
      nome: `Cópia de ${original.nome}`,
      status: 'rascunho',
      atualizadoEm: hoje,
      criadoEm: hoje,
      enviadoEm: undefined,
      etapaAtual: undefined,
      totalEtapas: undefined,
    };
    this._projetos.update((lista) => [copia, ...lista]);
    return copia.id;
  }

  excluir(id: string): void {
    this._projetos.update((lista) => lista.filter((p) => p.id !== id));
  }
}
