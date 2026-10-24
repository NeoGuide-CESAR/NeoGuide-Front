import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ConfigService } from '../../config/service/config.service';

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
interface Sessao { usuario: Usuario; token: string; }
interface LoginResponse { token: string; usuario: { id: number; name: string; email: string; role: string }; }

/**
 * Serviço de autenticação.
 * Contrato NEO-04: token Bearer e usuário retornados pelo login do back.
 * Senhas nunca são persistidas. Sessões antigas do mock exigem novo login.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly sessao = signal<Sessao | null>(this.lerSessao());

  readonly usuario = computed(() => this.sessao()?.usuario ?? null);
  readonly autenticado = computed(() => this.sessao() !== null);
  readonly token = computed(() => this.sessao()?.token ?? null);
  readonly primeiroNome = computed(() => this.usuario()?.nome.split(' ')[0] ?? '');

  entrar(credenciais: Credenciais, _perfil: Usuario['perfil'] = 'projetista'): Observable<Usuario> {
    return this.http.post<LoginResponse>(this.config.getApiUrl('/api/v1/auth/login'), { login: credenciais.documento.trim(), password: credenciais.senha }).pipe(
      map(resposta => {
        if (!resposta.token || !resposta.usuario) throw new Error('Resposta de autenticação inválida.');
        const u = resposta.usuario;
        const usuario: Usuario = { id: String(u.id), nome: u.name, email: u.email, perfil: u.role === 'ROLE_ANALISTA' ? 'analista' : 'projetista' };
        this.salvarSessao({ usuario, token: resposta.token });
        return usuario;
      }),
      catchError((e: unknown) => throwError(() => new Error(e instanceof HttpErrorResponse
        ? e.status === 0 ? 'Não foi possível conectar ao servidor. Tente novamente.' : e.status === 401 ? 'CPF/CNPJ, e-mail ou senha incorretos.' : 'Não foi possível entrar. Tente novamente.'
        : 'Não foi possível entrar. Tente novamente.'))),
    );
  }
  atualizarUsuario(dados: Pick<Usuario, 'nome' | 'email'>): void {
    const atual = this.sessao();
    if (atual) this.salvarSessao({ ...atual, usuario: { ...atual.usuario, ...dados } });
  }

  sair(): void {
    try { sessionStorage.removeItem(CHAVE_SESSAO); } catch { /* sem storage */ }
    this.sessao.set(null);
  }

  private salvarSessao(sessao: Sessao): void {
    try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao)); } catch { /* sessão permanece apenas em memória */ }
    this.sessao.set(sessao);
  }

  private lerSessao(): Sessao | null {
    try {
      const bruto = sessionStorage.getItem(CHAVE_SESSAO);
      const salvo = bruto ? JSON.parse(bruto) as Sessao : null;
      return salvo && typeof salvo.token === 'string' && salvo.token && salvo.usuario?.id && typeof salvo.usuario.nome === 'string' && typeof salvo.usuario.email === 'string' ? salvo : null;
    } catch {
      return null;
    }
  }
}
