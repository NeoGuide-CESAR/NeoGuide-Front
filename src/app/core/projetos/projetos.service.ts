import { Injectable, computed, signal } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { PROJETOS_MOCK } from './projetos.mock';
import { ParametrosListagem, ResultadoListagem, calcularListagem } from './listagem';
import { Projeto, ResumoProjetos } from './projeto.model';

/** Atraso simulado da "API" de listagem, em ms. */
const LATENCIA_SIMULADA = 300;

/**
 * Carteira e listagem simuladas preexistentes. O fluxo HTTP de US13 fica em
 * ProjetosApiService; só atualiza esta carteira depois de uma resposta de sucesso.
 */
@Injectable({ providedIn: 'root' })
export class ProjetosService {
  private readonly _projetos = signal<Projeto[]>(
    this.carregar(),
  );

  readonly projetos = this._projetos.asReadonly();

  private carregar(): Projeto[] {
    try {
      const salvo = localStorage.getItem('neoguide.projetos');
      if (salvo) {
        const lista: unknown = JSON.parse(salvo);
        if (Array.isArray(lista) && lista.every(p => p && typeof p.id === 'string' && typeof p.nome === 'string' && ['rascunho', 'em_analise', 'aprovado', 'reprovado'].includes(p.status))) return lista;
      }
    } catch { /* Armazenamento indisponível: mantém a demonstração acessível. */ }
    return PROJETOS_MOCK.map(p => ({ ...p, enviadoEm: p.status === 'rascunho' ? undefined : p.atualizadoEm }));
  }

  atualizar(projeto: Projeto): void {
    const anterior = this._projetos().find(p => p.id === projeto.id);
    const lista = [{ ...anterior, ...projeto }, ...this._projetos().filter(p => p.id !== projeto.id)];
    this._projetos.set(lista);
    try { localStorage.setItem('neoguide.projetos', JSON.stringify(lista)); } catch { /* Cache opcional: a resposta HTTP já confirmou a operação. */ }
  }

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

  excluir(id: string): void {
    const lista = this._projetos().filter(p => p.id !== id);
    this._projetos.set(lista);
    try {
      localStorage.setItem('neoguide.projetos', JSON.stringify(lista));
      localStorage.removeItem(`neoguide.rascunho.${id}`);
    } catch { /* Sem cache, mantém o sucesso confirmado pelo servidor. */ }
  }
}
