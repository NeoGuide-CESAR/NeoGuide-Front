import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, defer, finalize, map, tap } from 'rxjs';
import { ProjetosService } from './projetos.service';
import { ProjetoCompleto, ProjetoHttp, escreverProjetoHttp, lerProjetoHttp } from './projeto-http';
import { RascunhoCalculo } from './dados-calculo';

@Injectable({ providedIn: 'root' })
export class ProjetosApiService {
  private readonly http = inject(HttpClient);
  private readonly carteira = inject(ProjetosService);
  private readonly base = '/api/v1/projects';
  readonly duplicando = signal<string | null>(null);

  obter(id: string): Observable<ProjetoCompleto> {
    return this.http.get<ProjetoHttp>(this.url(id)).pipe(map(lerProjetoHttp), tap(p => this.carteira.atualizar(p)));
  }

  duplicar(id: string): Observable<ProjetoCompleto> {
    return defer(() => {
      if (this.duplicando()) return EMPTY;
      this.duplicando.set(id);
      return this.http.post<ProjetoHttp>(`${this.url(id)}/duplicar`, {}).pipe(
        map(lerProjetoHttp), tap(p => this.carteira.atualizar(p)),
        finalize(() => this.duplicando.set(null)),
      );
    });
  }

  salvar(projeto: ProjetoCompleto, rascunho: RascunhoCalculo): Observable<ProjetoCompleto> {
    return this.http.put<ProjetoHttp>(this.url(projeto.id), escreverProjetoHttp(projeto, rascunho)).pipe(
      map(lerProjetoHttp), tap(p => this.carteira.atualizar(p)),
    );
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(this.url(id)).pipe(tap(() => this.carteira.excluir(id)));
  }

  private url(id: string): string { return `${this.base}/${encodeURIComponent(id)}`; }
}
