import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

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

export interface DadosCadastro {
  nome: string;
  email: string;
  cpfCnpj?: string;
  senha: string;
  confirmacaoSenha: string;
}

/**
 * Erro de autenticação ou cadastro.
 * `status`: 0 sem conexão, 400 validação (`campos` traz o erro de cada campo do back), 401 credenciais, 409 conflito.
 */
export class ErroAutenticacao extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly campos: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ErroAutenticacao';
  }
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
const MENSAGEM_SEM_CONEXAO = 'Não foi possível conectar ao servidor. Verifique se o sistema está no ar e tente novamente.';
const MENSAGEM_PADRAO = 'Não foi possível concluir a operação. Tente novamente.';

/**
 * Serviço de autenticação, ligado ao back (POST /api/v1/auth/login e /auth/register).
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
   * Entra com CPF/CNPJ ou e-mail e senha. Erros chegam como ErroAutenticacao.
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
        catchError((erro: HttpErrorResponse) => throwError(() => erroDeResposta(erro, 'login'))),
      );
  }

  /**
   * Cria a conta de projetista (POST /api/v1/auth/register) e já entra com as mesmas credenciais.
   * Se a conta for criada mas o login falhar, o erro do login é propagado.
   */
  cadastrar(dados: DadosCadastro): Observable<Usuario> {
    const corpo = {
      name: dados.nome.trim(),
      email: dados.email.trim(),
      cpfCnpj: dados.cpfCnpj?.trim() || null,
      password: dados.senha,
      confirmPassword: dados.confirmacaoSenha,
    };
    return this.http.post(`${API_BASE}/auth/register`, corpo).pipe(
      catchError((erro: HttpErrorResponse) => throwError(() => erroDeResposta(erro, 'cadastro'))),
      switchMap(() => this.entrar({ documento: dados.email, senha: dados.senha })),
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

  /** Atualiza nome e e-mail da sessão (e o token, se o back trocou) sem recarregar a página. */
  atualizarSessao(parcial: Partial<Pick<Usuario, 'nome' | 'email'>>, novoToken?: string | null): void {
    const atual = this._usuario();
    if (!atual) return;
    this.salvarSessao({ ...atual, ...parcial }, novoToken ?? this._token() ?? '');
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

/** Converte a resposta de erro do back (ErrorResponse: message e errors por campo) em ErroAutenticacao. */
function erroDeResposta(erro: HttpErrorResponse, contexto: 'login' | 'cadastro'): ErroAutenticacao {
  if (erro.status === 0) return new ErroAutenticacao(MENSAGEM_SEM_CONEXAO, 0);
  const corpo = (erro.error ?? {}) as { message?: string; errors?: Record<string, string> };
  if (erro.status === 401) return new ErroAutenticacao(MENSAGEM_CREDENCIAIS, 401);
  const campos = corpo.errors ?? {};
  const mensagem = corpo.message || (contexto === 'cadastro' ? 'Não foi possível criar a conta.' : MENSAGEM_PADRAO);
  return new ErroAutenticacao(mensagem, erro.status, campos);
}
