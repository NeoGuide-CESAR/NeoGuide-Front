import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { PROJETOS_ARTBOARDS } from './projeto-artboards.mock';
import { lerProjetoHttp } from './projeto-http';
import { apresentarProjeto, ProjetoService } from './projeto.service';
import { apresentarEtapas } from './etapas-apresentacao';
import { ProjetoDetalhado } from './projeto.model';
import { KvaPipe } from '../../shared/projeto/kva.pipe';
import { ResultadoCalculoPage } from '../../features/resultado-calculo/resultado-calculo.page';

const jardim = () => apresentarProjeto(lerProjetoHttp(structuredClone(PROJETOS_ARTBOARDS.find(p => p.id === 'p1')!)));
const aurora = () => apresentarProjeto(lerProjetoHttp(structuredClone(PROJETOS_ARTBOARDS.find(p => p.id === 'p2')!)));

describe('Apresentação do detalhamento e resultado', () => {
  it('formata kVA em pt-BR, incluindo zero, sem inventar valores ausentes', () => {
    const pipe = new KvaPipe();
    expect(pipe.transform(152.4)).toBe('152,4 kVA');
    expect(pipe.transform(0)).toBe('0,0 kVA');
    expect(pipe.transform(null)).toBe('Não disponível');
    expect(pipe.transform(Number.NaN)).toBe('Não disponível');
  });
  it('preserva o total recebido, sem somar as demandas no front', () => {
    const p = jardim(); p.resultado!.demandaTotal = 152.4; p.resultado!.porEtapa.residencial = 100;
    expect(p.resultado!.demandaTotal).toBe(152.4);
    expect(apresentarEtapas(p)[1].demandas[0].valor).toBe(100);
    expect(apresentarEtapas(p)[0].demandas).toEqual([]);
    expect(apresentarEtapas(p)[4].demandas.length).toBe(2);
  });
  it('distingue dados vazios de partes que não se aplicam ao Aurora', () => {
    const p = aurora(); const etapas = apresentarEtapas(p);
    expect(etapas[2].linhas.find(l => l.rotulo === 'Fornos e fogões')!.valor).toBe('Nenhum valor informado');
    expect(etapas[4].linhas[1].valor).toBe('não se aplica a este projeto');
    expect(etapas[4].demandas[1].aplicavel).toBeFalse();
    expect(p.comercial.aplicavel).toBeTrue();
    expect(p.residencial.grupos.map(g => g.unidades)).toEqual([20, 12]);
  });
});

describe('Tela 22: leitura, estados e memorial', () => {
  let service: jasmine.SpyObj<ProjetoService>;
  beforeEach(() => {
    service = jasmine.createSpyObj('ProjetoService', ['obter']); service.obter.and.returnValue(of(jardim()));
    TestBed.configureTestingModule({ imports: [ResultadoCalculoPage], providers: [provideRouter([]), { provide: ProjetoService, useValue: service }] });
  });
  function abrir() {
    const f = TestBed.createComponent(ResultadoCalculoPage); f.componentRef.setInput('id', 'p1');
    f.detectChanges(); flushMicrotasks(); f.detectChanges(); return f;
  }
  it('renderiza cinco etapas com dados prontos e emite o pedido de memorial', fakeAsync(() => {
    const f = abrir(); const html: HTMLElement = f.nativeElement;
    expect(html.textContent).toContain('13/10/2026 às 21:40');
    expect(html.querySelectorAll('app-projeto-card').length).toBe(5);
    expect(html.querySelector('app-projeto-card')!.querySelector('.resultado-etapa__demanda')).toBeNull();
    const pedido = jasmine.createSpy('memorial'); f.componentInstance.gerarMemorial.subscribe(pedido);
    const botao = Array.from(html.querySelectorAll('button')).find(b => b.textContent?.includes('GERAR MEMORIAL'))!;
    botao.click(); expect(pedido).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'p1' }));
    expect(html.textContent).toContain('1ª VERSÃO'); f.destroy();
  }));
  it('não mostra resultado antigo quando o projeto foi invalidado', fakeAsync(() => {
    service.obter.and.returnValue(of({ ...jardim(), resultado: null, resultadoInvalidado: true }));
    const f = abrir(); const html: HTMLElement = f.nativeElement;
    expect(html.textContent).toContain('Resultado ainda não disponível');
    expect(html.querySelector('app-projeto-status')).toBeNull();
    expect(html.querySelector('.resultado-total')).toBeNull();
    expect(Array.from(html.querySelectorAll('button')).find(b => b.textContent?.includes('GERAR MEMORIAL'))!.disabled).toBeTrue();
    f.destroy();
  }));
  it('distingue erro de projeto não encontrado e permite tentar novamente', fakeAsync(() => {
    service.obter.and.returnValues(throwError(() => new HttpErrorResponse({ status: 500 })), of(jardim()));
    const f = abrir(); expect(f.nativeElement.textContent).toContain('Não foi possível carregar o projeto');
    f.componentInstance.consulta.recarregar(); f.detectChanges(); flushMicrotasks(); f.detectChanges();
    expect(f.componentInstance.projeto()?.id).toBe('p1'); f.destroy();
    service.obter.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const naoEncontrado = abrir(); expect(naoEncontrado.nativeElement.textContent).toContain('Projeto não encontrado'); naoEncontrado.destroy();
  }));
  it('cancela a leitura anterior ao mudar o id da rota', fakeAsync(() => {
    const primeira = new Subject<ProjetoDetalhado>(); const segunda = new Subject<ProjetoDetalhado>();
    service.obter.and.callFake(id => id === 'p1' ? primeira : segunda);
    const f = abrir(); expect(f.componentInstance.consulta.estado()).toBe('carregando');
    f.componentRef.setInput('id', 'p2'); f.detectChanges(); segunda.next(aurora()); f.detectChanges();
    primeira.next(jardim()); f.detectChanges(); expect(f.componentInstance.projeto()?.id).toBe('p2'); f.destroy();
  }));
});
