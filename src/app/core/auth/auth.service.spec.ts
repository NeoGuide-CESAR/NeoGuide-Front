import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('Autenticação NEO-04', () => {
  let anterior: string | null;
  let http: HttpTestingController;
  beforeEach(() => {
    anterior = sessionStorage.getItem('neoguide.sessao'); sessionStorage.removeItem('neoguide.sessao');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); if (anterior === null) sessionStorage.removeItem('neoguide.sessao'); else sessionStorage.setItem('neoguide.sessao', anterior); });
  it('envia login/password, armazena token retornado e usa o papel real do servidor', () => {
    const service = TestBed.inject(AuthService);
    service.entrar({ documento: 'maria@exemplo.com', senha: 'Senha1234' }).subscribe();
    const req = http.expectOne('http://localhost:8080/api/v1/auth/login');
    expect(req.request.body).toEqual({ login: 'maria@exemplo.com', password: 'Senha1234' });
    req.flush({ token: 'token-teste', usuario: { id: 1, name: 'Maria Souza', email: 'maria@exemplo.com', role: 'ROLE_ANALISTA' } });
    expect(service.usuario()?.perfil).toBe('analista'); expect(service.token()).toBe('token-teste'); expect(sessionStorage.getItem('neoguide.sessao')).not.toContain('Senha1234');
    service.sair(); expect(service.token()).toBeNull(); expect(sessionStorage.getItem('neoguide.sessao')).toBeNull();
  });
  it('não aceita sessão antiga do mock sem token', () => {
    sessionStorage.setItem('neoguide.sessao', JSON.stringify({ id: '1', nome: 'Mock', email: 'mock@exemplo.com', perfil: 'projetista' }));
    expect(TestBed.inject(AuthService).autenticado()).toBeFalse();
  });
  it('não autentica quando o servidor rejeita as credenciais', () => {
    const service = TestBed.inject(AuthService); const erro = jasmine.createSpy('erro');
    service.entrar({ documento: 'maria@exemplo.com', senha: 'Incorreta123' }).subscribe({ error: erro });
    http.expectOne('http://localhost:8080/api/v1/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(service.autenticado()).toBeFalse(); expect(erro).toHaveBeenCalled();
  });
});
