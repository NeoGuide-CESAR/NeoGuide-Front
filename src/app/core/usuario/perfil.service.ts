import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE } from '../api/api.config';

export interface PerfilApi {
  id: number;
  nome: string;
  email: string;
  cpfCnpj: string | null;
  telefone: string | null;
  registroProfissional: string | null;
  perfil: 'PROJETISTA' | 'ANALISTA';
  /** Só vem quando o e-mail foi alterado. */
  token?: string | null;
}

export interface AlteracaoPerfil {
  nome: string;
  telefone: string | null;
  email: string;
  registroProfissional: string;
  /** Só é enviada quando o e-mail muda. */
  senhaAtual?: string;
}

/** Erro RFC 7807 do back com o campo do formulário. */
export interface ErroDePerfil {
  status: number;
  regra: string | null;
  campo: string | null;
  detalhe: string;
}

export function lerErroDePerfil(erro: unknown): ErroDePerfil {
  if (erro instanceof HttpErrorResponse) {
    const corpo = (erro.error && typeof erro.error === 'object' ? erro.error : {}) as { regra?: string; campo?: string; detail?: string };
    return { status: erro.status, regra: corpo.regra ?? null, campo: corpo.campo ?? null, detalhe: corpo.detail ?? '' };
  }
  return { status: 0, regra: null, campo: null, detalhe: '' };
}

/** Meu perfil: GET/PATCH /auth/me e PUT /auth/password. Nada é guardado no navegador. */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);

  obter(): Observable<PerfilApi> {
    return this.http.get<PerfilApi>(`${API_BASE}/auth/me`);
  }

  atualizar(corpo: AlteracaoPerfil): Observable<PerfilApi> {
    return this.http.patch<PerfilApi>(`${API_BASE}/auth/me`, corpo);
  }

  alterarSenha(senhaAtual: string, novaSenha: string): Observable<void> {
    return this.http.put<void>(`${API_BASE}/auth/password`, { senhaAtual, novaSenha });
  }
}
