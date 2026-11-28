import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConsultaCepService, ResultadoCep } from './consulta-cep.service';

describe('ConsultaCepService', () => {
  let service: ConsultaCepService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ConsultaCepService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta o back em /api/v1/cep/{cep} (também em produção) e converte a resposta', () => {
    let r: ResultadoCep | undefined;
    service.consultar('50050000').subscribe(v => (r = v));
    const req = http.expectOne('/api/v1/cep/50050000');
    expect(req.request.method).toBe('GET');
    req.flush({ cep: '50050-000', logradouro: 'Rua da Aurora', bairro: 'Boa Vista', cidade: 'Recife', uf: 'PE', atendidoNeoenergia: true });
    expect(r).toEqual({ endereco: 'Rua da Aurora', bairro: 'Boa Vista', municipio: 'Recife', uf: 'PE', foraConcessao: false });
  });

  it('CEP fora da área de concessão é sinalizado', () => {
    let r: ResultadoCep | undefined;
    service.consultar('01001000').subscribe(v => (r = v));
    http.expectOne('/api/v1/cep/01001000').flush({ logradouro: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP', atendidoNeoenergia: false });
    expect(r?.foraConcessao).toBeTrue();
  });

  it('404 vira "não encontrado" e outras falhas seguem como erro', () => {
    let r: ResultadoCep | undefined; let erro: unknown;
    service.consultar('99999999').subscribe(v => (r = v));
    http.expectOne('/api/v1/cep/99999999').flush({ message: 'CEP não encontrado' }, { status: 404, statusText: 'Not Found' });
    expect(r?.naoEncontrado).toBeTrue();

    service.consultar('50050000').subscribe({ error: e => (erro = e) });
    http.expectOne('/api/v1/cep/50050000').flush('x', { status: 503, statusText: 'Unavailable' });
    expect(erro).toBeTruthy();
  });
});
