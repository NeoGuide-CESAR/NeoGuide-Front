import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { API_BASE } from '../api/api.config';

export interface ResultadoCep { endereco: string; bairro: string; municipio: string; uf: string; naoEncontrado?: boolean; foraConcessao?: boolean; }

/** Resposta do back em GET /api/v1/cep/{cep} (o back consulta o ViaCEP e informa a área de concessão). */
interface CepApi { cep?: string; logradouro?: string; bairro?: string; cidade?: string; uf?: string; atendidoNeoenergia?: boolean; }

/** Permite trocar a rota (testes ou outro ambiente). Sem valor, usa a rota do back. */
export const ROTA_CEP = new InjectionToken<((cep: string) => string) | null>('ROTA_CEP', { providedIn: 'root', factory: () => null });

@Injectable({ providedIn: 'root' })
export class ConsultaCepService {
  private readonly http = inject(HttpClient);
  private readonly rota = inject(ROTA_CEP);

  consultar(cep: string): Observable<ResultadoCep> {
    const url = this.rota ? this.rota(cep) : `${API_BASE}/cep/${cep}`;
    return this.http.get<CepApi>(url).pipe(
      map((r): ResultadoCep => ({
        endereco: r.logradouro ?? '',
        bairro: r.bairro ?? '',
        municipio: r.cidade ?? '',
        uf: r.uf ?? '',
        // O back só informa "atendido"; ausente (resposta antiga) não bloqueia o preenchimento.
        foraConcessao: r.atendidoNeoenergia === false,
      })),
      // CEP inexistente (404) é um resultado; qualquer outra falha segue como erro (o formulário mostra "falha").
      catchError((e: HttpErrorResponse) => e.status === 404
        ? of({ endereco: '', bairro: '', municipio: '', uf: '', naoEncontrado: true })
        : throwError(() => e)),
    );
  }
}
