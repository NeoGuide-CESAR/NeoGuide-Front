import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { API_BASE } from '../api/api.config';

export interface NormaApi {
  codigo: string;
  titulo: string;
  revisao: string;
  /** yyyy-MM-dd, lida do cabeçalho do PDF; nula quando não consta. */
  dataAprovacao: string | null;
  papel: 'PRINCIPAL' | 'COMPLEMENTAR';
  urlDocumento: string | null;
  resumo: string;
}

export interface TabelaNormaApi {
  ancora: string;
  titulo: string;
  referencia: string;
  paginaPdf: number | null;
  endpointCatalogo: string | null;
  /** Falso quando a tabela ainda não está no catálogo do back. */
  disponivel: boolean;
  etapasWizard: number[];
  usadaNoResultado: boolean;
  notasResumidas: string[];
}

export interface PremissaApi {
  codigo: string;
  texto: string;
  referencia: string;
}

/** Normas, tabelas e premissas da página "Normas técnicas". Leitura apenas; nada é guardado no navegador. */
@Injectable({ providedIn: 'root' })
export class NormasService {
  private readonly http = inject(HttpClient);
  private readonly emAndamento = new Map<string, Observable<unknown>>();

  normas(): Observable<NormaApi[]> {
    return this.ler<NormaApi[]>(`${API_BASE}/normas`);
  }

  tabelas(codigo: string): Observable<TabelaNormaApi[]> {
    return this.ler<TabelaNormaApi[]>(`${API_BASE}/normas/${codigo.toUpperCase()}/tabelas`);
  }

  premissas(): Observable<PremissaApi[]> {
    return this.ler<PremissaApi[]>(`${API_BASE}/normas/premissas`);
  }

  /** Linhas de uma tabela do catálogo, pelo endpoint informado pelo back. As respostas repetidas reaproveitam a chamada. */
  catalogo(endpoint: string): Observable<unknown> {
    return this.ler<unknown>(endpoint);
  }

  /** Reaproveita a chamada enquanto ela está em andamento ou concluída; uma falha libera a próxima tentativa. */
  private ler<T>(url: string): Observable<T> {
    const atual = this.emAndamento.get(url);
    if (atual) return atual as Observable<T>;
    const chamada = this.http.get<T>(url).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.emAndamento.set(url, chamada);
    // Em caso de erro, tira do cache para tentar de novo (TENTAR NOVAMENTE).
    chamada.subscribe({ error: () => this.emAndamento.delete(url) });
    return chamada;
  }
}
