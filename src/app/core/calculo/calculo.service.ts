import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize, shareReplay } from 'rxjs';

import { API_BASE } from '../api/api.config';
import { CalculoApi, EtapasApi, ValidacaoApi } from './calculo.api';

const RECURSO = `${API_BASE}/projects`;

/** Validação, cálculo, resultado e memorial. O front só exibe o que o back devolve. */
@Injectable({ providedIn: 'root' })
export class CalculoService {
  private readonly http = inject(HttpClient);
  /** Cálculo em andamento por projeto: recarregar a tela ou clicar de novo reaproveita a mesma chamada. */
  private readonly emAndamento = new Map<string, Observable<CalculoApi>>();

  validarNormativa(id: string): Observable<ValidacaoApi> {
    return this.http.get<ValidacaoApi>(`${RECURSO}/${id}/validacao-normativa`);
  }

  calcular(id: string): Observable<CalculoApi> {
    const atual = this.emAndamento.get(id);
    if (atual) return atual;
    const chamada = this.http.post<CalculoApi>(`${RECURSO}/${id}/calcular`, {}).pipe(
      finalize(() => this.emAndamento.delete(id)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.emAndamento.set(id, chamada);
    return chamada;
  }

  resultado(id: string): Observable<CalculoApi> {
    return this.http.get<CalculoApi>(`${RECURSO}/${id}/resultado`);
  }

  etapas(id: string): Observable<EtapasApi> {
    return this.http.get<EtapasApi>(`${RECURSO}/${id}/etapas`);
  }

  memorialPdf(id: string): Observable<Blob> {
    return this.http.get(`${RECURSO}/${id}/memorial-pdf`, { responseType: 'blob' });
  }
}
