import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ProjetosMockStore, projetosMockInterceptor } from './projetos-mock.interceptor';
import { ProjetoHttp, lerProjetoHttp } from './projeto-http';
import { ProjetosService } from './projetos.service';
import { PROJETOS_ARTBOARDS } from './projeto-artboards.mock';
import { provideRouter } from '@angular/router';
import { ProjetosApiService } from './projetos-api.service';
import { DetalheProjetoPage } from '../../features/detalhe-projeto/detalhe-projeto.page';

describe('Mock HTTP US13 por flag', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const flag = environment.mockApi;
  beforeEach(() => {
    environment.mockApi = true;
    spyOn(localStorage, 'getItem').and.returnValue(null);
    TestBed.configureTestingModule({ imports: [DetalheProjetoPage], providers: [provideRouter([]), provideHttpClient(withInterceptors([projetosMockInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient); backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { environment.mockApi = flag; backend.verify(); });
  it('POST responde 201 após 600ms, preserva endereço e não altera o original', fakeAsync(() => {
    let copia: ProjetoHttp | null = null;
    let status = 0;
    const original = structuredClone(TestBed.inject(ProjetosMockStore).projetos.get('p1')!);
    http.post<ProjetoHttp>('/api/v1/projects/p1/duplicar', {}, { observe: 'response' }).subscribe(r => { copia = r.body; status = r.status; });
    tick(599); expect(copia).toBeNull(); tick(1);
    expect(status).toBe(201); expect(copia!.nome).toBe(`${original.nome} (cópia)`);
    expect(copia!.origemId).toBe('p1'); expect(copia!.status).toBe('RASCUNHO'); expect(copia!.logradouro).toBe(original.logradouro);
    expect(TestBed.inject(ProjetosMockStore).projetos.get('p1')).toEqual(original);
    backend.expectNone('/api/v1/projects/p1/duplicar');
  }));
  it('PUT persiste em memória, GET lê e DELETE responde 204', fakeAsync(() => {
    let id = '';
    http.post<ProjetoHttp>('/api/v1/projects/p1/duplicar', {}).subscribe(p => { id = p.id; }); tick(600);
    http.put<ProjetoHttp>(`/api/v1/projects/${id}`, { nome: 'Editado' }).subscribe(); tick(600);
    http.get<ProjetoHttp>(`/api/v1/projects/${id}`).subscribe(p => expect(p.nome).toBe('Editado')); tick(600);
    http.delete(`/api/v1/projects/${id}`, { observe: 'response' }).subscribe(r => expect(r.status).toBe(204)); tick(600);
    http.get(`/api/v1/projects/${id}`).subscribe({ error: (e: HttpErrorResponse) => expect(e.status).toBe(404) }); tick(600);
  }));
  it('com a flag desligada, encaminha a mesma chamada para o backend HTTP', () => {
    environment.mockApi = false;
    http.post('/api/v1/projects/p1/duplicar', {}).subscribe();
    const req = backend.expectOne('/api/v1/projects/p1/duplicar'); expect(req.request.method).toBe('POST'); req.flush({ id: 'real' });
  });
  it('um aprovado mostra resultado e andamento, inclusive com cache legado', fakeAsync(() => {
    spyOn(localStorage, 'setItem');
    const legado = lerProjetoHttp(structuredClone(PROJETOS_ARTBOARDS.find(p => p.id === 'p3')!));
    const cacheLegado = { ...legado, nome: 'Nome preservado', dados: { ...legado.dados, nome: 'Nome preservado' }, resultado: null, enviadoEm: undefined, proximaEtapa: undefined };
    TestBed.inject(ProjetosService).atualizar(cacheLegado);
    http.get<ProjetoHttp>('/api/v1/projects/p3').subscribe(p => {
      expect(p.nome).toBe('Nome preservado'); expect(p.status).toBe('APROVADO');
      expect(p.resultado?.demandaTotal).toBe(152.4); expect(p.enviadoEm).toBeTruthy(); expect(p.proximaEtapa).toBe('Nenhuma pendência');
    }); tick(600);
    http.get<ProjetoHttp>('/api/v1/projects/p6').subscribe(p => {
      expect(p.resultado).toBeTruthy(); expect(p.enviadoEm).toBeTruthy(); expect(p.proximaEtapa).toBe('Nenhuma pendência');
    }); tick(600);
  }));
  it('não restaura resultado de um projeto editado que exige recálculo', fakeAsync(() => {
    spyOn(localStorage, 'setItem');
    const editado = lerProjetoHttp(structuredClone(PROJETOS_ARTBOARDS.find(p => p.id === 'p3')!));
    TestBed.inject(ProjetosService).atualizar({ ...editado, status: 'rascunho', resultado: null, resultadoInvalidado: true });
    http.get<ProjetoHttp>('/api/v1/projects/p3').subscribe(p => {
      expect(p.status).toBe('RASCUNHO'); expect(p.resultado).toBeNull(); expect(p.resultadoInvalidado).toBeTrue();
    }); tick(600);
  }));
  it('o detalhamento não repete GET quando o mock inicializa a carteira', fakeAsync(() => {
    spyOn(localStorage, 'setItem');
    const obter = spyOn(TestBed.inject(ProjetosApiService), 'obter').and.callThrough();
    const f = TestBed.createComponent(DetalheProjetoPage); f.componentRef.setInput('id', 'p1');
    f.detectChanges(); tick(600); f.detectChanges(); tick(600); f.detectChanges();
    expect(obter).toHaveBeenCalledTimes(1); expect(f.componentInstance.projeto()?.id).toBe('p1');
    f.destroy();
  }));
});
