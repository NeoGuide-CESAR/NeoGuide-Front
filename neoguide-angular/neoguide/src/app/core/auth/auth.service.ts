import { Injectable, computed, signal } from '@angular/core';
import { Observable, of, throwError, delay } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: 'projetista' | 'analista';
}

export interface Credenciais {
  documento: string; // CPF, CNPJ ou e-mail
  senha: string;
}

const CHAVE_SESSAO = 'neoguide.sessao';

/**
 * Serviço de autenticação.
 * O login aqui é SIMULADO: quando o time de back entregar o endpoint,
 * troque o corpo de `entrar()` por:
 *   return this.http.post<{ token: string; usuario: Usuario }>('/api/auth/login', credenciais)
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _usuario = signal<Usuario | null>(this.lerSessao());

  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);
  readonly primeiroNome = computed(() => this._usuario()?.nome.split(' ')[0] ?? '');

  entrar(credenciais: Credenciais, perfil: Usuario['perfil'] = 'projetista'): Observable<Usuario> {
    // --- MOCK: remova quando a API existir ---
    if (credenciais.senha.length < 6) {
      return throwError(() => new Error(perfil === 'analista' ? 'Matrícula, e-mail ou senha incorretos.' : 'CPF/CNPJ, e-mail ou senha incorretos.')).pipe(delay(600));
    }
    const usuario: Usuario = {
      id: '1',
      nome: 'Maria Souza',
      email: credenciais.documento.includes('@') ? credenciais.documento : perfil === 'analista' ? 'maria@neoenergia.com' : 'maria@projetos.com.br',
      perfil,
    };
    return of(usuario).pipe(
      delay(600),
      tap((u) => this.salvarSessao(u)),
    );
  }

  sair(): void {
    try { sessionStorage.removeItem(CHAVE_SESSAO); } catch { /* sem storage */ }
    this._usuario.set(null);
  }

  private salvarSessao(usuario: Usuario): void {
    try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuario)); } catch { /* sem storage */ }
    this._usuario.set(usuario);
  }

  private lerSessao(): Usuario | null {
    try {
      const bruto = sessionStorage.getItem(CHAVE_SESSAO);
      return bruto ? (JSON.parse(bruto) as Usuario) : null;
    } catch {
      return null;
    }
  }
}
