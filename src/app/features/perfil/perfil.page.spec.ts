import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PerfilProjetista } from '../../core/perfil/perfil.service';
import { PerfilPage } from './perfil.page';

const url = 'http://localhost:8080/api/v1/usuarios/me';
const perfil: PerfilProjetista = { id: 1, name: 'Maria Souza', email: 'maria@exemplo.com', empresa: 'Projetos Exemplo', crea: '123456-PE', role: 'ROLE_PROJETISTA' };

describe('Perfil do projetista — contrato NEO-39', () => {
  let f: ComponentFixture<PerfilPage>;
  let http: HttpTestingController;
  let auth: AuthService;
  let navegacao: jasmine.Spy;
  let sessaoAnterior: string | null;
  beforeEach(() => {
    sessaoAnterior = sessionStorage.getItem('neoguide.sessao');
    sessionStorage.setItem('neoguide.sessao', JSON.stringify({ token: 'token-teste', usuario: { id: '1', nome: perfil.name, email: perfil.email, perfil: 'projetista' } }));
    TestBed.configureTestingModule({ imports: [PerfilPage], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController); auth = TestBed.inject(AuthService);
    navegacao = spyOn(TestBed.inject(Router), 'navigateByUrl').and.returnValue(Promise.resolve(true));
    f = TestBed.createComponent(PerfilPage); f.detectChanges();
  });
  afterEach(() => {
    f.destroy(); http.verify();
    if (sessaoAnterior === null) sessionStorage.removeItem('neoguide.sessao'); else sessionStorage.setItem('neoguide.sessao', sessaoAnterior);
  });
  function carregar(): void { const req = http.expectOne(url); expect(req.request.method).toBe('GET'); expect(req.request.headers.get('Authorization')).toBe('Bearer token-teste'); req.flush(perfil); f.detectChanges(); }
  it('carrega do endpoint, exibe os campos acordados e impede editar o e-mail', () => {
    carregar(); const c = f.componentInstance;
    expect(c.form.getRawValue().empresa).toBe(perfil.empresa!); expect(c.form.controls.email.disabled).toBeTrue();
    expect(f.nativeElement.textContent).toContain('CREA'); expect(f.nativeElement.textContent).not.toContain('CPF/CNPJ'); expect(f.nativeElement.textContent).not.toContain('Telefone');
  });
  it('valida campos antes da requisição e permite senha vazia', () => {
    carregar(); const c = f.componentInstance; c.form.patchValue({ nome: ' ', empresa: 'A', crea: '1' }); c.salvar(); f.detectChanges();
    expect(c.mensagem('nome')).toBe('Informe seu nome completo.'); expect(c.mensagem('empresa')).toContain('2 a 150');
    http.expectNone(url); expect(c.mensagem('novaSenha')).toBe('');
  });
  it('salva somente campos alterados do contrato, atualiza a conta e não envia senha vazia', () => {
    carregar(); const c = f.componentInstance; c.form.patchValue({ nome: 'Maria Silva', empresa: '' }); c.salvar();
    const req = http.expectOne(url); expect(req.request.method).toBe('PATCH'); expect(req.request.body).toEqual({ name: 'Maria Silva', empresa: '' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-teste'); req.flush({ ...perfil, name: 'Maria Silva', empresa: '' }); f.detectChanges();
    expect(auth.usuario()?.nome).toBe('Maria Silva'); expect(c.sucesso()).toContain('sucesso'); http.expectNone(`${url}/senha`);
  });
  it('exibe erros de senha atual, força e confirmação sem enviar requisições', () => {
    carregar(); const c = f.componentInstance; c.form.patchValue({ novaSenha: 'abcdefgh', confirmacaoNovaSenha: 'diferente' }); c.salvar();
    expect(c.mensagem('senhaAtual')).toContain('senha atual'); expect(c.mensagem('novaSenha')).toContain('letra e um número'); expect(c.mensagem('confirmacaoNovaSenha')).toContain('não conferem'); http.expectNone(url);
  });
  it('troca a senha pelo PUT correto, sem PATCH desnecessário e limpa os três campos', () => {
    carregar(); const c = f.componentInstance;
    const senha = { senhaAtual: 'Antiga123', novaSenha: 'NovaSenha123', confirmacaoNovaSenha: 'NovaSenha123' };
    c.form.patchValue(senha); c.salvar(); const req = http.expectOne(`${url}/senha`);
    expect(req.request.method).toBe('PUT'); expect(req.request.body).toEqual(senha); http.expectNone(url);
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(c.form.getRawValue().novaSenha).toBe(''); expect(sessionStorage.getItem('neoguide.sessao')).not.toContain(senha.novaSenha);
  });
  it('mapeia erros do back para o campo correspondente', () => {
    carregar(); const c = f.componentInstance; c.form.patchValue({ crea: '99999' }); c.salvar();
    http.expectOne(url).flush({ message: 'Erro de validação', errors: { crea: 'CREA inválido' } }, { status: 400, statusText: 'Bad Request' }); f.detectChanges();
    expect(c.mensagem('crea')).toBe('CREA inválido'); expect(f.nativeElement.querySelector('#perfil-crea').getAttribute('aria-invalid')).toBe('true');
    c.form.controls.crea.setValue('123456'); expect(c.mensagem('crea')).not.toBe('CREA inválido'); expect(c.sucesso()).toBe('');
  });
  it('informa sucesso parcial e permite tentar novamente somente a senha', () => {
    carregar(); const c = f.componentInstance; c.form.patchValue({ nome: 'Maria Silva', senhaAtual: 'Antiga123', novaSenha: 'NovaSenha123', confirmacaoNovaSenha: 'NovaSenha123' }); c.salvar();
    http.expectOne(url).flush({ ...perfil, name: 'Maria Silva' });
    http.expectOne(`${url}/senha`).flush({ errors: { senhaAtual: 'Senha atual incorreta' } }, { status: 400, statusText: 'Bad Request' });
    expect(c.erroGeral()).toContain('dados foram salvos'); expect(c.sucesso()).toBe('');
    c.form.controls.senhaAtual.setValue('Correta123'); c.salvar(); http.expectNone(url);
    http.expectOne(`${url}/senha`).flush(null); expect(c.sucesso()).toContain('sucesso');
  });
  it('bloqueia envio duplicado e informa falha de rede sem apagar a edição', () => {
    carregar(); const c = f.componentInstance; c.form.controls.nome.setValue('Maria Silva'); c.salvar(); c.salvar();
    const req = http.expectOne(url); req.error(new ProgressEvent('error'));
    expect(c.form.controls.nome.value).toBe('Maria Silva'); expect(c.salvando()).toBeFalse(); expect(c.erroGeral()).toContain('Não foi possível salvar');
  });
  it('permite tentar carregar novamente após falha, sem mostrar formulário vazio como perfil', () => {
    http.expectOne(url).error(new ProgressEvent('error')); f.detectChanges();
    expect(f.componentInstance.perfil()).toBeNull(); expect(f.nativeElement.textContent).toContain('TENTAR NOVAMENTE');
    f.componentInstance.carregar(); carregar(); expect(f.componentInstance.perfil()?.name).toBe(perfil.name);
  });
  it('apaga o token e volta ao login ao sair ou receber 401', () => {
    http.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.autenticado()).toBeFalse(); expect(auth.token()).toBeNull(); expect(sessionStorage.getItem('neoguide.sessao')).toBeNull(); expect(navegacao).toHaveBeenCalledWith('/login');
  });
  it('cancelar descarta alterações e limpa as senhas', () => {
    carregar(); const c = f.componentInstance; c.form.patchValue({ nome: 'Outro nome', senhaAtual: 'NaoSalvar123' }); c.cancelar();
    expect(c.form.controls.nome.value).toBe(perfil.name); expect(c.form.controls.senhaAtual.value).toBe(''); expect(navegacao).toHaveBeenCalledWith('/inicio'); http.expectNone(url);
  });
});
