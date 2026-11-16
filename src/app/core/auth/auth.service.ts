import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { API_BASE } from '../api/api.config';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: 'projetista' | 'analista';
}

export interface Credenciais {
  documento: string; // CPF, CNPJ ou e-mail (o back aceita os três no campo `login`)
  senha: string;
}

/** Resposta de POST /api/v1/auth/login (LoginResponse do back). */
interface RespostaLogin {
  token: string;
  tipo: string;
  role: string;
  usuario: { id: number; name: string; email: string; role: string };
}

const CHAVE_SESSAO = 'neoguide.sessao';
const CHAVE_TOKEN = 'neoguide.token';

const MENSAGEM_CREDENCIAIS = 'E-mail ou senha incorretos.';
const MENSAGEM_SEM_CONEXAO = 'Não foi possível conectar ao servidor. Tente novamente.';
const MENSAGEM_PADRAO = 'Não foi possível entrar. Tente novamente.';

/**
 * Serviço de autenticação, ligado ao back (POST /api/v1/auth/login).
 *
 * Política do token (decisão registrada em docs/AUDITORIA-INTEGRACAO.md, pergunta P14):
 * JWT em sessionStorage. Some ao fechar a aba. Não usa localStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _usuario = signal<Usuario | null>(this.lerSessao());
  private readonly _token = signal<string | null>(this.lerToken());

  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null && this._token() !== null);
  readonly primeiroNome = computed(() => this._usuario()?.nome.split(' ')[0] ?? '');

  /** Token atual, lido pelo interceptor HTTP. */
  token(): string | null {
    return this._token();
  }

  /**
   * Entra com CPF/CNPJ ou e-mail e senha. Erros chegam como Error com a mensagem para a tela
   * (credenciais: "E-mail ou senha incorretos.", sem indicar o campo errado).
   * O perfil vem da role do servidor; o parâmetro só vale se a role não for reconhecida.
   */
  entrar(credenciais: Credenciais, perfil: Usuario['perfil'] = 'projetista'): Observable<Usuario> {
    return this.http
      .post<RespostaLogin>(`${API_BASE}/auth/login`, {
        login: credenciais.documento.trim(),
        password: credenciais.senha,
      })
      .pipe(
        map((resposta) => {
          const usuario: Usuario = {
            id: String(resposta.usuario.id),
            nome: resposta.usuario.name,
            email: resposta.usuario.email,
            perfil: perfilDaRole(resposta.role) ?? perfil,
          };
          this.salvarSessao(usuario, resposta.token);
          return usuario;
        }),
        catchError((erro: HttpErrorResponse) => throwError(() => new Error(mensagemDoErro(erro)))),
      );
  }

  sair(): void {
    try {
      sessionStorage.removeItem(CHAVE_SESSAO);
      sessionStorage.removeItem(CHAVE_TOKEN);
    } catch {
      /* sem storage */
    }
    this._token.set(null);
    this._usuario.set(null);
  }

  private salvarSessao(usuario: Usuario, token: string): void {
    try {
      sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuario));
      sessionStorage.setItem(CHAVE_TOKEN, token);
    } catch {
      /* sem storage: a sessão vale só nesta página */
    }
    this._token.set(token);
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

  private lerToken(): string | null {
    try {
      return sessionStorage.getItem(CHAVE_TOKEN);
    } catch {
      return null;
    }
  }
}

function perfilDaRole(role: string | null | undefined): Usuario['perfil'] | null {
  if (role === 'ROLE_ANALISTA') return 'analista';
  if (role === 'ROLE_PROJETISTA') return 'projetista';
  return null;
}

function mensagemDoErro(erro: HttpErrorResponse): string {
  if (erro.status === 0) return MENSAGEM_SEM_CONEXAO;
  if (erro.status === 401) return MENSAGEM_CREDENCIAIS;
  const mensagem = (erro.error as { message?: string } | null)?.message;
  return mensagem || MENSAGEM_PADRAO;
}
