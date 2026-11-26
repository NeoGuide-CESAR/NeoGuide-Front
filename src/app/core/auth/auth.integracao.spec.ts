import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { AuthService, ErroAutenticacao } from './auth.service';

/** Resposta de exemplo de POST /api/v1/auth/login (formato do back). */
const RESPOSTA_LOGIN = {
  token: 'token-de-teste',
  tipo: 'Bearer',
  role: 'ROLE_PROJETISTA',
  usuario: { id: 2, name: 'Maria Silva', email: 'maria@neoguide.com', role: 'ROLE_PROJETISTA' },
};

describe('Integração auth: AuthService + authInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let auth: AuthService;
  let routerSpy: { navigate: jasmine.Spy; url: string };

  beforeEach(() => {
    sessionStorage.clear();
    routerSpy = { navigate: jasmine.createSpy('navigate').and.resolveTo(true), url: '/meus-projetos' };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('entrar envia login/password ao back e guarda usuário e token', () => {
    let usuarioObtido: { nome: string; perfil: string } | undefined;

    auth.entrar({ documento: '  maria@neoguide.com ', senha: 'maria123' }).subscribe((u) => (usuarioObtido = u));

    const req = http.expectOne('/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ login: 'maria@neoguide.com', password: 'maria123' });
    req.flush(RESPOSTA_LOGIN);

    expect(usuarioObtido).toEqual(jasmine.objectContaining({ nome: 'Maria Silva', perfil: 'projetista' }));
    expect(auth.autenticado()).toBeTrue();
    expect(auth.token()).toBe('token-de-teste');
    expect(sessionStorage.getItem('neoguide.token')).toBe('token-de-teste');
    expect(auth.primeiroNome()).toBe('Maria');
  });

  it('credenciais erradas geram a mensagem genérica da tela 11 e não autenticam', () => {
    let mensagem = '';
    auth.entrar({ documento: 'maria@neoguide.com', senha: 'errada' }).subscribe({ error: (e: Error) => (mensagem = e.message) });

    http.expectOne('/api/v1/auth/login').flush(
      { message: 'E-mail ou senha incorretos.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(mensagem).toBe('E-mail ou senha incorretos.');
    expect(auth.autenticado()).toBeFalse();
  });

  it('o interceptor anexa Bearer nas chamadas à API autenticada', () => {
    auth.entrar({ documento: 'maria@neoguide.com', senha: 'maria123' }).subscribe();
    http.expectOne('/api/v1/auth/login').flush(RESPOSTA_LOGIN);

    client.get('/api/v1/projects').subscribe();
    const req = http.expectOne('/api/v1/projects');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-teste');
    req.flush([]);
  });

  it('o interceptor não anexa o token ao proxy do Neo (/api/neo)', () => {
    auth.entrar({ documento: 'maria@neoguide.com', senha: 'maria123' }).subscribe();
    http.expectOne('/api/v1/auth/login').flush(RESPOSTA_LOGIN);

    client.get('/api/neo/sessoes').subscribe();
    const req = http.expectOne('/api/neo/sessoes');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('401 em rota protegida limpa a sessão e leva ao Estado B guardando a rota atual', () => {
    auth.entrar({ documento: 'maria@neoguide.com', senha: 'maria123' }).subscribe();
    http.expectOne('/api/v1/auth/login').flush(RESPOSTA_LOGIN);
    expect(auth.autenticado()).toBeTrue();

    client.get('/api/v1/projects').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/projects').flush(
      { codigo: 'sessao_expirada', message: 'Acesso não autorizado.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(auth.autenticado()).toBeFalse();
    expect(sessionStorage.getItem('neoguide.token')).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/sessao-expirada'], { queryParams: { returnUrl: '/meus-projetos' } });
  });

  it('401 no próprio login não dispara a sessão expirada (a tela mostra o erro)', () => {
    auth.entrar({ documento: 'x@y.com', senha: 'errada' }).subscribe({ error: () => undefined });
    http.expectOne('/api/v1/auth/login').flush({ message: 'E-mail ou senha incorretos.' }, { status: 401, statusText: 'Unauthorized' });

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('erro de login sem conexão vira ErroAutenticacao com status 0 (não é tratado como senha errada)', () => {
    let erro: ErroAutenticacao | undefined;
    auth.entrar({ documento: 'x@y.com', senha: 'abc' }).subscribe({ error: (e) => (erro = e) });
    http.expectOne('/api/v1/auth/login').error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(erro instanceof ErroAutenticacao).toBeTrue();
    expect(erro?.status).toBe(0);
  });

  it('cadastrar envia o corpo do back, cria a conta e entra com as mesmas credenciais', () => {
    let usuario: { nome: string } | undefined;
    auth
      .cadastrar({ nome: ' Ana Lima ', email: 'ana@neoguide.com', cpfCnpj: '', senha: 'senha1234', confirmacaoSenha: 'senha1234' })
      .subscribe((u) => (usuario = u));

    const registro = http.expectOne('/api/v1/auth/register');
    expect(registro.request.body).toEqual({
      name: 'Ana Lima',
      email: 'ana@neoguide.com',
      cpfCnpj: null,
      password: 'senha1234',
      confirmPassword: 'senha1234',
    });
    registro.flush({ id: 9, name: 'Ana Lima', email: 'ana@neoguide.com' }, { status: 201, statusText: 'Created' });

    const login = http.expectOne('/api/v1/auth/login');
    expect(login.request.body).toEqual({ login: 'ana@neoguide.com', password: 'senha1234' });
    login.flush({ ...RESPOSTA_LOGIN, usuario: { id: 9, name: 'Ana Lima', email: 'ana@neoguide.com', role: 'ROLE_PROJETISTA' } });

    expect(usuario?.nome).toBe('Ana Lima');
    expect(auth.autenticado()).toBeTrue();
  });

  it('cadastro recusado pelo back traz os erros de cada campo', () => {
    let erro: ErroAutenticacao | undefined;
    auth
      .cadastrar({ nome: 'A', email: 'x', senha: 'abc', confirmacaoSenha: 'abd' })
      .subscribe({ error: (e) => (erro = e) });

    http.expectOne('/api/v1/auth/register').flush(
      {
        status: 400,
        message: 'Dados inválidos',
        errors: { name: 'Deve ter no mínimo 3 caracteres', confirmPassword: 'As senhas não conferem' },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(erro?.status).toBe(400);
    expect(erro?.campos['name']).toBe('Deve ter no mínimo 3 caracteres');
    expect(erro?.campos['confirmPassword']).toBe('As senhas não conferem');
    expect(auth.autenticado()).toBeFalse();
  });
});
