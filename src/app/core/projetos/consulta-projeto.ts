import { Signal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ProjetoService } from './projeto.service';
import { ProjetoDetalhado } from './projeto.model';

export type EstadoConsultaProjeto = 'carregando' | 'pronto' | 'erro' | 'nao-encontrado';
interface Consulta { estado: EstadoConsultaProjeto; projeto: ProjetoDetalhado | null; }

/** Estado por página; cancela a leitura anterior quando muda :id ou a página é destruída. */
export function criarConsultaProjeto(id: Signal<string | undefined>) {
  const service = inject(ProjetoService);
  const tentativa = signal(0);
  const resposta = signal<Consulta>({ estado: 'carregando', projeto: null });
  const chave = computed(() => ({ id: id(), tentativa: tentativa() }));
  toObservable(chave).pipe(
    switchMap(chave => {
      if (!chave.id) return of<Consulta>({ estado: 'nao-encontrado', projeto: null });
      return service.obter(chave.id).pipe(
        map((projeto): Consulta => ({ estado: projeto ? 'pronto' : 'nao-encontrado', projeto })),
        startWith<Consulta>({ estado: 'carregando', projeto: null }),
        catchError((erro: HttpErrorResponse) => of<Consulta>({ estado: erro.status === 404 ? 'nao-encontrado' : 'erro', projeto: null })),
      );
    }), takeUntilDestroyed(),
  ).subscribe(valor => resposta.set(valor));
  return {
    estado: computed(() => resposta().estado), projeto: computed(() => resposta().projeto),
    recarregar: () => tentativa.update(n => n + 1),
  };
}
