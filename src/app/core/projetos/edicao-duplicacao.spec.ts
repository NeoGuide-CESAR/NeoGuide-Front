import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProjetosService } from './projetos.service';
import { ProjetosApiService } from './projetos-api.service';
import { DuplicarProjetoService } from './duplicar-projeto.service';
import { DuplicacaoContextoService } from './duplicacao-contexto.service';
import { chaveEndereco, mesmoEndereco } from './endereco-projeto';
import { ProjetoHttp, lerProjetoHttp } from './projeto-http';
import { complementosVazios } from './dados-calculo';
import { ConsultaCepService } from './consulta-cep.service';
import { SnackbarService } from '../ui/snackbar.service';
import { CalculoDemandaPage } from '../../features/calculo-demanda/calculo-demanda.page';

const original: ProjetoHttp = {
  id: 'p1', nome: 'Residencial Jardim', status: 'APROVADO', cep: '50000100', logradouro: 'Av. Exemplo, 450',
  bairro: 'Boa Viagem', municipio: 'Recife', uf: 'PE', tipoEdificacao: 'Residencial multifamiliar',
  temVe: false, temBomba: false, complementos: complementosVazios(),
};
const copia: ProjetoHttp = { ...original, id: 'copia', nome: `${original.nome} (cópia)`, status: 'RASCUNHO', origemId: 'p1' };

describe('Comparação do endereço US13', () => {
  it('ignora acentos, pontuação, caixa, espaços e hífen do CEP', () => {
    expect(mesmoEndereco({ cep: '50000-100', endereco: 'Av. São João, 450 / B' }, { cep: '50000100', endereco: 'AV SAO JOAO 450 B' })).toBeTrue();
  });
  it('distingue CEP, número, complemento e logradouro diferentes', () => {
    const a = { cep: '50000100', endereco: 'Av. Exemplo, 450 B' };
    for (const b of [{ ...a, cep: '50000101' }, { ...a, endereco: 'Av. Exemplo, 451 B' }, { ...a, endereco: 'Av. Exemplo, 450 A' }]) {
      expect(chaveEndereco(a)).not.toBe(chaveEndereco(b));
    }
  });
});

describe('HTTP de duplicação US13', () => {
  let api: ProjetosApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    spyOn(localStorage, 'setItem'); spyOn(localStorage, 'removeItem');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    api = TestBed.inject(ProjetosApiService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('faz um único POST no duplo clique e usa o projeto retornado com 201', () => {
    const resultado = jasmine.createSpy('resultado');
    api.duplicar('p1').subscribe(resultado); api.duplicar('p1').subscribe(resultado);
    expect(api.duplicando()).toBe('p1');
    const req = http.expectOne('/api/v1/projects/p1/duplicar'); expect(req.request.method).toBe('POST');
    req.flush(copia, { status: 201, statusText: 'Created' });
    expect(resultado).toHaveBeenCalledTimes(1); expect(resultado.calls.first().args[0].id).toBe('copia');
    expect(api.duplicando()).toBeNull();
  });
  it('libera nova tentativa depois de erro e não insere uma cópia inexistente', () => {
    api.duplicar('p1').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/projects/p1/duplicar').flush({}, { status: 500, statusText: 'Error' });
    expect(api.duplicando()).toBeNull();
    expect(TestBed.inject(ProjetosService).projetos().some(p => p.id === 'copia')).toBeFalse();
    api.duplicar('p1').subscribe(); http.expectOne('/api/v1/projects/p1/duplicar').flush(copia);
  });
  it('não transforma sucesso HTTP em erro se o cache local estiver indisponível', () => {
    (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceeded');
    const sucesso = jasmine.createSpy('sucesso'); const erro = jasmine.createSpy('erro');
    api.duplicar('p1').subscribe({ next: sucesso, error: erro });
    http.expectOne('/api/v1/projects/p1/duplicar').flush(copia, { status: 201, statusText: 'Created' });
    expect(sucesso).toHaveBeenCalled(); expect(erro).not.toHaveBeenCalled();
  });
  it('só remove a cópia da carteira depois de DELETE bem sucedido', () => {
    const carteira = TestBed.inject(ProjetosService); carteira.atualizar(lerProjetoHttp(copia));
    api.excluir('copia').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/projects/copia').flush({}, { status: 500, statusText: 'Error' });
    expect(carteira.projetos().some(p => p.id === 'copia')).toBeTrue();
    api.excluir('copia').subscribe(); const req = http.expectOne('/api/v1/projects/copia');
    expect(req.request.method).toBe('DELETE'); req.flush(null, { status: 204, statusText: 'No Content' });
    expect(carteira.projetos().some(p => p.id === 'copia')).toBeFalse();
  });
  it('navega com id retornado, query param e preserva exatamente a URL anterior', fakeAsync(() => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/meus-projetos?status=rascunho&pagina=2');
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);
    TestBed.inject(DuplicarProjetoService).executar('p1');
    http.expectOne('/api/v1/projects/p1/duplicar').flush(copia, { status: 201, statusText: 'Created' });
    expect(navegar).toHaveBeenCalledWith(['/projetos', 'copia', 'calculo'], { queryParams: { duplicadoDe: 'p1' } });
    expect(TestBed.inject(DuplicacaoContextoService).carregar('copia')?.retorno).toBe('/meus-projetos?status=rascunho&pagina=2');
    flushMicrotasks();
  }));
});

describe('Edição da cópia US13', () => {
  let api: jasmine.SpyObj<ProjetosApiService>;
  let snackbar: jasmine.SpyObj<SnackbarService>;
  beforeEach(() => {
    spyOn(sessionStorage, 'getItem').and.returnValue(null); spyOn(sessionStorage, 'setItem');
    api = jasmine.createSpyObj('ProjetosApiService', ['obter', 'salvar', 'excluir']);
    api.obter.and.callFake((id: string) => of(lerProjetoHttp(id === 'p1' ? original : copia)));
    api.salvar.and.returnValue(of(lerProjetoHttp(copia))); api.excluir.and.returnValue(of(undefined));
    snackbar = jasmine.createSpyObj('SnackbarService', ['mostrar']);
    Object.assign(snackbar, { atual: () => null });
    TestBed.configureTestingModule({ imports: [CalculoDemandaPage], providers: [provideRouter([]),
      { provide: ProjetosApiService, useValue: api }, { provide: SnackbarService, useValue: snackbar },
      { provide: ConsultaCepService, useValue: { consultar: () => of(null) } },
    ] });
  });
  function abrir() {
    const f = TestBed.createComponent(CalculoDemandaPage);
    f.componentRef.setInput('id', 'copia'); f.componentRef.setInput('duplicadoDe', 'p1');
    f.detectChanges(); flushMicrotasks(); f.detectChanges(); flushMicrotasks(); f.detectChanges();
    return f;
  }
  it('carrega original pelo query param e mostra snackbar por 10 segundos', fakeAsync(() => {
    const f = abrir(); expect(api.obter).toHaveBeenCalledWith('p1');
    expect(snackbar.mostrar).toHaveBeenCalledWith('Projeto duplicado com sucesso.', jasmine.objectContaining({ rotulo: 'DESFAZER' }), 10000);
    expect(f.nativeElement.querySelector('h1').textContent).toContain('(cópia)'); f.destroy();
  }));
  it('só salva com MANTER e não pergunta novamente pelo mesmo endereço', fakeAsync(() => {
    const f = abrir(); const c = f.componentInstance; c.salvar(c.dados());
    expect(api.salvar).not.toHaveBeenCalled(); expect(f.nativeElement.querySelector('dialog').open).toBeTrue();
    expect(document.activeElement?.textContent).toContain('ALTERAR ENDEREÇO');
    c.manterEndereco(); expect(api.salvar).toHaveBeenCalledTimes(1);
    c.salvar(c.dados()); expect(api.salvar).toHaveBeenCalledTimes(2); f.destroy();
  }));
  it('ALTERAR e ESC não salvam e retornam o foco ao CEP', fakeAsync(() => {
    const f = abrir(); const c = f.componentInstance;
    c.salvar(c.dados()); c.cancelarEndereco(); f.detectChanges(); flushMicrotasks(); f.detectChanges();
    expect(api.salvar).not.toHaveBeenCalled(); expect(document.activeElement?.id).toBe('projeto-cep');
    c.salvar(c.dados()); f.nativeElement.querySelector('dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(api.salvar).not.toHaveBeenCalled(); expect(f.nativeElement.querySelector('dialog').open).toBeFalse(); f.destroy();
  }));
  it('endereço diferente salva direto', fakeAsync(() => {
    const f = abrir(); f.componentInstance.salvar({ ...f.componentInstance.dados(), endereco: 'Outra rua, 10' });
    expect(api.salvar).toHaveBeenCalledTimes(1); expect(f.nativeElement.querySelector('dialog').open).toBeFalse(); f.destroy();
  }));
  it('usa origemId quando não há query param', fakeAsync(() => {
    const f = TestBed.createComponent(CalculoDemandaPage); f.componentRef.setInput('id', 'copia');
    f.detectChanges(); flushMicrotasks(); f.detectChanges();
    expect(api.obter).toHaveBeenCalledWith('p1'); expect(f.componentInstance.original()?.id).toBe('p1'); f.destroy();
  }));
  it('DESFAZER faz DELETE e volta com replaceUrl; erro mantém a cópia', fakeAsync(() => {
    const f = abrir(); const router = TestBed.inject(Router); const navegar = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    TestBed.inject(DuplicacaoContextoService).salvar('copia', { originalId: 'p1', retorno: '/meus-projetos?pagina=2&ordem=az' });
    api.excluir.and.returnValue(throwError(() => new Error('falhou'))); f.componentInstance.desfazerDuplicacao();
    expect(navegar).not.toHaveBeenCalled();
    expect(snackbar.mostrar).toHaveBeenCalledWith('Não foi possível desfazer. A cópia continua em Meus Projetos.');
    api.excluir.and.returnValue(of(undefined)); f.componentInstance.desfazerDuplicacao();
    expect(api.excluir).toHaveBeenCalledWith('copia');
    expect(navegar).toHaveBeenCalledWith('/meus-projetos?pagina=2&ordem=az', { replaceUrl: true }); flushMicrotasks(); f.destroy();
  }));
});
