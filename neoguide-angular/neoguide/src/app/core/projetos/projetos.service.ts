import { Injectable, computed, signal } from '@angular/core';
import { Projeto, ResumoProjetos } from './projeto.model';

/**
 * Dados SIMULADOS iguais aos do moodboard.
 * Quando a API existir, carregue com HttpClient (ex.: GET /api/projetos?limite=3)
 * e preencha o signal `_projetos`.
 */
@Injectable({ providedIn: 'root' })
export class ProjetosService {
  private readonly _projetos = signal<Projeto[]>([
    { id: 'p1', nome: 'Residencial Jardim', atualizadoEm: '2026-10-07', status: 'rascunho', etapaAtual: 3, totalEtapas: 6 },
    { id: 'p2', nome: 'Edifício Aurora', atualizadoEm: '2026-10-06', status: 'em_analise' },
    { id: 'p3', nome: 'Edifício Atlântico', atualizadoEm: '2026-09-22', status: 'reprovado' },
    { id: 'p4', nome: 'Condomínio Mirante', atualizadoEm: '2026-09-10', status: 'aprovado' },
    { id: 'p5', nome: 'Sala Comercial Boa Vista', atualizadoEm: '2026-09-02', status: 'rascunho', etapaAtual: 1, totalEtapas: 6 },
  ]);

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
}
