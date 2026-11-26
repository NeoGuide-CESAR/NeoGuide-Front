import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { PerfilApi } from '../../core/usuario/perfil.service';
import { PerfilPage, iniciais, mascaraTelefone } from './perfil.page';

const PERFIL: PerfilApi = {
  id: 1, nome: 'Maria Souza', email: 'maria@neoguide.com', cpfCnpj: '123.456.789-09', telefone: '81999998888',
  registroProfissional: 'CREA-PE 123456', perfil: 'PROJETISTA',
};

describe('Meu perfil', () => {
  beforeEach(() => {
    sessionStorage.setItem('neoguide.token', 'token-antigo');
    sessionStorage.setItem('neoguide.sessao', JSON.stringify({ id: '1', nome: 'Maria Souza', email: 'maria@neoguide.com', perfil: 'projetista' }));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  });
  afterEach(() => { sessionStorage.removeItem('neoguide.token'); sessionStorage.removeItem('neoguide.sessao'); });

  function abrir(): { f: ComponentFixture<PerfilPage>; http: HttpTestingController; c: PerfilPage } {
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(PerfilPage);
    f.detectChanges();
    http.expectOne('/api/v1/auth/me').flush(PERFIL);
    f.detectChanges();
    return { f, http, c: f.componentInstance };
  }
  const salvar = (f: ComponentFixture<PerfilPage>) => f.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement;
  const alterar = (f: ComponentFixture<PerfilPage>, c: PerfilPage, valores: Record<string, string>) => { c.form.patchValue(valores); f.detectChanges(); };

  it('carrega os dados; CPF/CNPJ é somente leitura; SALVAR começa desabilitado', () => {
    const { f, http, c } = abrir();
    expect((f.nativeElement.querySelector('#perfil-nome') as HTMLInputElement).value).toBe('Maria Souza');
    expect((f.nativeElement.querySelector('#perfil-telefone') as HTMLInputElement).value).toBe('(81) 99999-8888');
    const cpf = f.nativeElement.querySelector('#perfil-cpf') as HTMLInputElement;
    expect(cpf.value).toBe('123.456.789-09');
    expect(cpf.readOnly).toBeTrue();
    expect(cpf.getAttribute('aria-readonly')).toBe('true');
    expect(f.nativeElement.textContent).toContain('Para alterar, fale com o suporte.');
    expect(f.nativeElement.textContent).toContain('MS');
    expect(f.nativeElement.textContent).toContain('Projetista');
    expect(salvar(f).disabled).toBeTrue();
    expect(c.alterado()).toBeFalse();
    http.verify();
  });

  it('SALVAR só habilita com alteração válida', () => {
    const { f, c } = abrir();
    alterar(f, c, { nome: 'Maria' });
    expect(salvar(f).disabled).toBeTrue(); // sem sobrenome
    alterar(f, c, { nome: 'Maria de Souza' });
    expect(salvar(f).disabled).toBeFalse();
  });

  it('salva só os dados: PATCH sem CPF/CNPJ e sem senha; atualiza nome e iniciais no cabeçalho sem recarregar', () => {
    const { f, http, c } = abrir();
    const snackbar = TestBed.inject(SnackbarService); const aviso = spyOn(snackbar, 'mostrar');
    alterar(f, c, { nome: 'Ana Maria Lima', telefone: '(81) 98888-7777' });
    salvar(f).click();
    const req = http.expectOne({ method: 'PATCH', url: '/api/v1/auth/me' });
    expect(req.request.body).toEqual({ nome: 'Ana Maria Lima', telefone: '81988887777', email: 'maria@neoguide.com', registroProfissional: 'CREA-PE 123456' });
    expect('cpfCnpj' in req.request.body).toBeFalse();
    req.flush({ ...PERFIL, nome: 'Ana Maria Lima', telefone: '81988887777' });
    f.detectChanges();
    expect(TestBed.inject(AuthService).usuario()?.nome).toBe('Ana Maria Lima');
    expect(f.nativeElement.querySelector('.avatar').textContent).toContain('AL');
    expect(f.nativeElement.querySelector('.usuario').textContent).toContain('Ana Maria Lima');
    expect(aviso).toHaveBeenCalledWith('Alterações salvas.');
    expect(c.alterado()).toBeFalse();
    http.verify();
  });

  it('trocar o e-mail sem a senha atual: erro no campo e SALVAR desabilitado; com a senha, envia e troca o token', () => {
    const { f, http, c } = abrir();
    alterar(f, c, { email: 'nova@neoguide.com' });
    expect(salvar(f).disabled).toBeTrue();
    expect(f.nativeElement.textContent).toContain('Para trocar o e-mail, confirme sua senha atual.');
    expect((f.nativeElement.querySelector('label[for=perfil-senha-atual]') as HTMLElement).textContent).toContain('*');
    alterar(f, c, { senhaAtual: 'SenhaForte123' });
    expect(salvar(f).disabled).toBeFalse();
    salvar(f).click();
    const req = http.expectOne({ method: 'PATCH', url: '/api/v1/auth/me' });
    expect(req.request.body.senhaAtual).toBe('SenhaForte123');
    req.flush({ ...PERFIL, email: 'nova@neoguide.com', token: 'token-novo' });
    expect(TestBed.inject(AuthService).token()).toBe('token-novo');
    expect(TestBed.inject(AuthService).usuario()?.email).toBe('nova@neoguide.com');
    http.verify();
  });

  it('e-mail em uso (409) vira erro no campo e-mail', () => {
    const { f, http, c } = abrir();
    alterar(f, c, { email: 'joao@neoguide.com', senhaAtual: 'SenhaForte123' });
    salvar(f).click();
    http.expectOne('/api/v1/auth/me').flush({ regra: 'email_em_uso', campo: 'email', detail: 'Este e-mail já está em uso.' }, { status: 409, statusText: 'Conflict' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('#erro-email').textContent).toContain('Este e-mail já está em uso.');
    expect(f.componentInstance.salvando()).toBeFalse();
  });

  it('senha: erros no front (fraca, igual à atual, confirmação diferente) e os três campos passam a ser obrigatórios', () => {
    const { f, c } = abrir();
    alterar(f, c, { novaSenha: 'curta' });
    expect(c.erros()['senhaAtual']).toBe('Informe sua senha atual.');
    expect(c.erros()['novaSenha']).toBe('A nova senha precisa ter 8 caracteres, com letras e números.');
    expect(c.erros()['confirmar']).toBe('As senhas não coincidem.');
    alterar(f, c, { senhaAtual: 'SenhaForte123', novaSenha: 'SenhaForte123', confirmar: 'SenhaForte123' });
    expect(c.erros()['novaSenha']).toBe('A nova senha deve ser diferente da atual.');
    alterar(f, c, { novaSenha: 'Outra1234', confirmar: 'Outra12345' });
    expect(c.erros()['confirmar']).toBe('As senhas não coincidem.');
    expect(salvar(f).disabled).toBeTrue();
    alterar(f, c, { confirmar: 'Outra1234' });
    expect(c.valido()).toBeTrue();
    expect(salvar(f).disabled).toBeFalse();
  });

  it('senha atual incorreta (do back): erro no campo; troca de senha ok limpa os três campos', () => {
    const { f, http, c } = abrir();
    alterar(f, c, { senhaAtual: 'errada123', novaSenha: 'Outra1234', confirmar: 'Outra1234' });
    salvar(f).click();
    http.expectOne({ method: 'PUT', url: '/api/v1/auth/password' }).flush({ regra: 'senha_incorreta', campo: 'senhaAtual', detail: 'A senha atual está incorreta.' }, { status: 422, statusText: 'Unprocessable' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('#erro-senha-atual').textContent).toContain('A senha atual está incorreta.');

    alterar(f, c, { senhaAtual: 'SenhaForte123' });
    salvar(f).click();
    http.expectOne({ method: 'PUT', url: '/api/v1/auth/password' }).flush(null, { status: 204, statusText: 'No Content' });
    f.detectChanges();
    expect(c.form.getRawValue().senhaAtual).toBe('');
    expect(c.form.getRawValue().novaSenha).toBe('');
    expect(c.form.getRawValue().confirmar).toBe('');
    expect(c.alterado()).toBeFalse();
    http.verify();
  });

  it('sucesso parcial: dados salvos e senha recusada mantêm os dados e avisam', () => {
    const { f, http, c } = abrir();
    const snackbar = TestBed.inject(SnackbarService); const aviso = spyOn(snackbar, 'mostrar');
    alterar(f, c, { nome: 'Maria de Souza', senhaAtual: 'errada123', novaSenha: 'Outra1234', confirmar: 'Outra1234' });
    salvar(f).click();
    http.expectOne({ method: 'PATCH', url: '/api/v1/auth/me' }).flush({ ...PERFIL, nome: 'Maria de Souza' });
    http.expectOne({ method: 'PUT', url: '/api/v1/auth/password' }).flush({ regra: 'senha_incorreta', campo: 'senhaAtual', detail: 'A senha atual está incorreta.' }, { status: 422, statusText: 'Unprocessable' });
    f.detectChanges();
    expect(aviso).toHaveBeenCalledWith('Seus dados foram salvos, mas a senha não foi alterada.');
    expect(c.form.getRawValue().nome).toBe('Maria de Souza'); // os dados não voltam ao estado anterior
    expect(TestBed.inject(AuthService).usuario()?.nome).toBe('Maria de Souza');
    expect(f.nativeElement.querySelector('#erro-senha-atual').textContent).toContain('A senha atual está incorreta.');
  });

  it('CANCELAR pede confirmação quando há alterações e restaura os valores carregados', () => {
    const { f, c } = abrir();
    const confirmar = spyOn(window, 'confirm').and.returnValues(false, true);
    alterar(f, c, { nome: 'Outro Nome' });
    c.cancelar();
    expect(confirmar).toHaveBeenCalledWith('Descartar alterações?');
    expect(c.form.getRawValue().nome).toBe('Outro Nome');
    c.cancelar();
    expect(c.form.getRawValue().nome).toBe('Maria Souza');
    expect(c.alterado()).toBeFalse();
  });

  it('sair da página com alterações não salvas pergunta antes (guard de saída)', () => {
    const { f, c } = abrir();
    const confirmar = spyOn(window, 'confirm').and.returnValue(false);
    expect(c.podeSair()).toBeTrue();
    expect(confirmar).not.toHaveBeenCalled();
    alterar(f, c, { nome: 'Outro Nome' });
    expect(c.podeSair()).toBeFalse();
    expect(confirmar).toHaveBeenCalledWith('Descartar alterações?');
  });

  it('SAIR DA CONTA descarta a sessão e vai para o login', () => {
    const { f } = abrir();
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    (f.nativeElement.querySelector('.sair') as HTMLButtonElement).click();
    expect(TestBed.inject(AuthService).autenticado()).toBeFalse();
    expect(ir).toHaveBeenCalledWith(['/login']);
  });

  it('o ícone de olho mostra e oculta a senha, com aria-label', () => {
    const { f } = abrir();
    const campo = f.nativeElement.querySelector('#perfil-nova-senha') as HTMLInputElement;
    const olho = f.nativeElement.querySelectorAll('.olho')[1] as HTMLButtonElement;
    expect(campo.type).toBe('password');
    expect(olho.getAttribute('aria-label')).toBe('Mostrar senha');
    olho.click(); f.detectChanges();
    expect(campo.type).toBe('text');
    expect(olho.getAttribute('aria-label')).toBe('Ocultar senha');
  });

  it('erro ao carregar: mensagem com TENTAR NOVAMENTE', () => {
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(PerfilPage);
    f.detectChanges();
    http.expectOne('/api/v1/auth/me').flush('x', { status: 500, statusText: 'Server Error' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Não foi possível carregar seus dados.');
  });

  it('máscara de telefone e iniciais', () => {
    expect(mascaraTelefone('81999998888')).toBe('(81) 99999-8888');
    expect(mascaraTelefone('8133334444')).toBe('(81) 3333-4444');
    expect(mascaraTelefone('8')).toBe('(8');
    expect(iniciais('Maria Souza')).toBe('MS');
    expect(iniciais('Ana Maria Lima')).toBe('AL');
    expect(iniciais('Maria')).toBe('M');
    expect(iniciais('')).toBe('');
  });
});
