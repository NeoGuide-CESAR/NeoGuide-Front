import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject, isDevMode } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { ConfigService } from '../../config/service/config.service';

export interface ResultadoCep { endereco: string; bairro: string; municipio: string; uf: string; naoEncontrado?: boolean; foraConcessao?: boolean; }
/** TODO NEO-11: configurar rota e adaptar resposta quando o contrato de CEP do back estiver disponível. */
export const ROTA_CEP = new InjectionToken<((cep: string) => string) | null>('ROTA_CEP', { providedIn: 'root', factory: () => null });
@Injectable({ providedIn: 'root' })
export class ConsultaCepService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly rota = inject(ROTA_CEP);
  consultar(cep: string): Observable<ResultadoCep> {
    if (this.rota) return this.http.get<ResultadoCep>(this.config.getApiUrl(this.rota(cep)), { withCredentials: true });
    if (!isDevMode()) return throwError(() => new Error('Rota de CEP não configurada.'));
    // ViaCEP é fallback apenas de desenvolvimento e não determina concessão.
    return this.http.get<{ logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean | string }>(`https://viacep.com.br/ws/${cep}/json/`).pipe(
      map(r => ({ endereco: r.logradouro ?? '', bairro: r.bairro ?? '', municipio: r.localidade ?? '', uf: r.uf ?? '', naoEncontrado: !!r.erro })),
    );
  }
}
