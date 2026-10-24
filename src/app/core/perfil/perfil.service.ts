import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from '../../config/service/config.service';

export interface PerfilProjetista { id: number; name: string; email: string; empresa: string | null; crea: string | null; role: string; }
export interface AtualizarPerfil { name?: string; empresa?: string; crea?: string; }
export interface AlterarSenha { senhaAtual: string; novaSenha: string; confirmacaoNovaSenha: string; }

/** NEO-39, UsuarioController na develop do back. Não envia campos fora do contrato. */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly config = inject(ConfigService);
  private get url(): string { return this.config.getApiUrl('/api/v1/usuarios/me'); }
  private get opcoes() {
    const headers: Record<string, string> = {};
    const token = this.auth.token(); if (token) headers['Authorization'] = `Bearer ${token}`;
    return { headers };
  }
  carregar(): Observable<PerfilProjetista> { return this.http.get<PerfilProjetista>(this.url, this.opcoes); }
  salvar(dados: AtualizarPerfil): Observable<PerfilProjetista> {
    const corpo: AtualizarPerfil = {};
    if (dados.name !== undefined) corpo.name = dados.name;
    if (dados.empresa !== undefined) corpo.empresa = dados.empresa;
    if (dados.crea !== undefined) corpo.crea = dados.crea;
    return this.http.patch<PerfilProjetista>(this.url, corpo, this.opcoes);
  }
  alterarSenha(dados: AlterarSenha): Observable<void> { return this.http.put<void>(`${this.url}/senha`, dados, this.opcoes); }
}
