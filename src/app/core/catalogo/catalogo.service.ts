import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, throwError, catchError } from 'rxjs';

import { API_BASE } from '../api/api.config';

/** Uma ocupação da DIS-NOR-030 Tabela 22 (CargaMinimaOcupacaoResponse do back). */
export interface OcupacaoComercial {
  codigo: string;
  rotulo: string;
  cargaMinimaWm2: number;
  fatorDemandaIlum: number;
  fatorPotencia: number;
  escalonado: boolean;
  regraNormativa: string | null;
}

/** Catálogos de referência do back. Ficam em memória da sessão (não usam armazenamento do navegador). */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private ocupacoes?: Observable<OcupacaoComercial[]>;

  /** Lista de finalidades da etapa comercial. Em caso de falha, o próximo acesso tenta de novo. */
  ocupacoesComerciais(): Observable<OcupacaoComercial[]> {
    this.ocupacoes ??= this.http.get<OcupacaoComercial[]>(`${API_BASE}/catalogo/cargas-minimas-ocupacao`).pipe(
      shareReplay(1),
      catchError((erro: unknown) => {
        this.ocupacoes = undefined;
        return throwError(() => erro);
      }),
    );
    return this.ocupacoes;
  }
}
