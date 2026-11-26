import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { CalculoApi, EtapasApi } from '../../core/calculo/calculo.api';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { DetalheProjetoPage } from './detalhe-projeto.page';

const PROJETO = {
  id: 1, protocolo: 'PRJ-2026-0001', nome: 'Edifício Aurora', status: 'RASCUNHO', statusDescricao: 'Rascunho',
  tipoEdificacao: 'RESIDENCIAL_MULTIFAMILIAR', tipoEdificacaoDescricao: 'Residencial multifamiliar', tipoEnquadramento: 'RESIDENCIAL_MULTIFAMILIAR',
  cep: '50050000', endereco: 'Rua do Exemplo, 120', bairro: 'Boa Viagem', municipio: 'Recife', uf: 'PE',
  possuiComercial: false, possuiVe: true, possuiIncendio: false, responsavel: 'Maria Souza', crea: 'ART 123',
  dataSubmissao: '2026-10-06T09:00:00', updatedAt: '2026-10-06T10:30:00', espacosComerciais: [], etapas: [],
};
const ETAPAS: EtapasApi = {
  residencial: { tipologias: [{ areaUtilM2: 65, quantidadeUnidades: 24, smartStudio: false }, { areaUtilM2: 82, quantidadeUnidades: 16, smartStudio: false }] },
  areaComum: { cargas: [{ origem: 'CATALOGO', submodulo: 'AQUECIMENTO', tipoEquipamento: 'CHUVEIRO', descricao: 'Chuveiros (b)', quantidade: 4, potenciaNominalKw: 5.5, fatorPotencia: 1, fatorDemanda: 1, reserva: false }] },
  cargasEspeciais: { qtdPontosVe: 4, potenciaVeKw: 7.4, potenciaBombaIncendioCv: null, potenciaSolarInversorKw: null, medidorExclusivo: null },
};
const CALCULO: CalculoApi = {
  projectId: 1, protocolo: 'PRJ-2026-0001', status: 'CONCLUIDO', situacaoCalculo: 'CALCULADO', calculadoEm: '2026-10-05T21:40:12',
  resumoDemandas: { drf: 114.08, ds: 20.2, dc: 0, dve: 29.6, dmbi: 0, ded: 163.88, dqdg: 163.88 },
  enquadramento: { tipoFornecimento: 'BT_380_220V', limiteKva: 300, atendimentoMT: false, tipoEdificacao: 'RESIDENCIAL_MULTIFAMILIAR', tipoEnquadramento: 'RESIDENCIAL_MULTIFAMILIAR', motivoEnquadramento: null },
  dimensionamentoEntrada: null, barramentoQdg: null, alertas: [], seloConformidade: 'CONFORME',
};

function configurar() {
  TestBed.resetTestingModule(); // alguns testes abrem a página mais de uma vez
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  return TestBed.inject(HttpTestingController);
}

function abrir(http: HttpTestingController, projeto: object = PROJETO, resultado: CalculoApi | null = CALCULO): ComponentFixture<DetalheProjetoPage> {
  const f = TestBed.createComponent(DetalheProjetoPage);
  f.componentRef.setInput('id', '1');
  f.detectChanges();
  http.expectOne('/api/v1/projects/1').flush(projeto);
  http.expectOne('/api/v1/projects/1/etapas').flush(ETAPAS);
  const r = http.expectOne('/api/v1/projects/1/resultado');
  if (resultado) r.flush(resultado); else r.flush({ regra: 'nao_calculado' }, { status: 404, statusText: 'Not Found' });
  f.detectChanges();
  return f;
}

const botao = (f: ComponentFixture<DetalheProjetoPage>, texto: RegExp) =>
  (Array.from(f.nativeElement.querySelectorAll('.acoes button') as NodeListOf<HTMLButtonElement>)).find(b => texto.test(b.textContent ?? ''));

describe('Detalhamento do projeto', () => {
  it('mostra os dados vindos do back, sem valores fixos, e o cartão de demanda calculada', () => {
    const http = configurar();
    const f = abrir(http);
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('Edifício Aurora');
    expect(texto).toContain('Atualizado em 06/10/2026');
    expect(texto).toContain('PRJ-2026-0001');
    expect(texto).toContain('Maria Souza');
    expect(texto).toContain('50050-000');
    expect(texto).toContain('163,9');
    expect(texto).toContain('Calculado em 05/10/2026 conforme a DIS-NOR-053');
    expect(texto).toContain('Baixa tensão · 380/220 V');
    expect(texto).not.toContain('000,0');
    expect(texto).toContain('Grupo 1');
    expect(texto).toContain('Chuveiros (b): 4 × 5,5 kW');
    expect(texto).toContain('Pontos de carregamento: 4 × 7,4 kW');
    expect(texto).toContain('Motobombas de incêndio: não se aplica a este projeto');
    expect(texto).toContain('Nenhum espaço comercial informado');
    expect(texto).toContain('Nenhum valor informado'); // categorias de área comum sem itens
    expect(texto).not.toContain('1ª versão');
    http.verify();
  });

  it('RASCUNHO: EDITAR e DUPLICAR, sem aviso; EDITAR abre a etapa 1', () => {
    const http = configurar();
    const f = abrir(http);
    expect(botao(f, /duplicar/i)).toBeTruthy();
    expect(botao(f, /editar/i)).toBeTruthy();
    expect(f.nativeElement.querySelector('app-alert-banner.aviso')).toBeNull();
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    botao(f, /editar/i)!.click();
    expect(ir.calls.mostRecent().args).toEqual([['/projetos', '1', 'etapa-1'], { queryParams: {} }]);
    http.verify();
  });

  it('EM_ANALISE: somente leitura (só DUPLICAR) com aviso informativo', () => {
    const http = configurar();
    const f = abrir(http, { ...PROJETO, status: 'EM_ANALISE' });
    expect(botao(f, /editar/i)).toBeUndefined();
    expect(botao(f, /duplicar/i)).toBeTruthy();
    expect(f.nativeElement.textContent).toContain('Projeto em análise pela Neoenergia. Para alterar, aguarde o parecer ou duplique o projeto.');
    expect(f.nativeElement.textContent).toContain('Parecer da Neoenergia');
    http.verify();
  });

  it('APROVADO: só DUPLICAR, aviso de aprovado e andamento com data e "Ligação"', () => {
    const http = configurar();
    const f = abrir(http, { ...PROJETO, status: 'APROVADO' });
    expect(botao(f, /editar/i)).toBeUndefined();
    expect(botao(f, /duplicar/i)).toBeTruthy();
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('Projeto aprovado. Para alterar, duplique o projeto.');
    expect(texto).toContain('Aprovado em');
    expect(texto).toContain('Ligação');
    http.verify();
  });

  it('REPROVADO: EDITAR e DUPLICAR, com aviso de reprovado', () => {
    const http = configurar();
    const f = abrir(http, { ...PROJETO, status: 'REPROVADO' });
    expect(botao(f, /editar/i)).toBeTruthy();
    expect(botao(f, /duplicar/i)).toBeTruthy();
    expect(f.nativeElement.textContent).toContain('Projeto reprovado. Corrija os itens e calcule novamente.');
    expect(f.nativeElement.textContent).toContain('Corrigir e reenviar');
    http.verify();
  });

  it('NAO_CALCULADO: "Ainda não calculado" e CALCULAR DEMANDA que leva à Revisão (só se puder editar)', () => {
    const http = configurar();
    const f = abrir(http, PROJETO, null);
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('Ainda não calculado');
    const link = f.nativeElement.querySelector('.cartao--demanda a.btn') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/projetos/1/revisao');
    expect(texto).not.toContain('Ver resultado completo');
    http.verify();

    const http2 = configurar();
    const so = abrir(http2, { ...PROJETO, status: 'EM_ANALISE' }, null);
    expect(so.nativeElement.querySelector('.cartao--demanda a.btn')).toBeNull();
    expect(so.nativeElement.textContent).toContain('Ainda não calculado');
  });

  it('DESATUALIZADO: selo, valor antigo com a data antiga, texto e RECALCULAR; resultado completo continua disponível', () => {
    const http = configurar();
    const f = abrir(http, PROJETO, { ...CALCULO, situacaoCalculo: 'DESATUALIZADO' });
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('Desatualizado');
    expect(texto).toContain('163,9');
    expect(texto).toContain('Calculado em 05/10/2026');
    expect(texto).toContain('Os dados mudaram depois deste cálculo.');
    expect((f.nativeElement.querySelector('.recalcular') as HTMLAnchorElement).getAttribute('href')).toBe('/projetos/1/revisao');
    expect((f.nativeElement.querySelector('.ver-resultado') as HTMLAnchorElement).getAttribute('href')).toBe('/projetos/1/resultado');
    http.verify();
  });

  it('média tensão aparece no cartão de demanda', () => {
    const http = configurar();
    const f = abrir(http, PROJETO, { ...CALCULO, enquadramento: { ...CALCULO.enquadramento, tipoFornecimento: 'MT', atendimentoMT: true } });
    expect(f.nativeElement.textContent).toContain('Fornecimento: Média tensão');
    expect(f.nativeElement.querySelector('.detalhe--mt')).not.toBeNull();
  });

  it('linha "Enquadramento" só aparece quando o tipo derivado difere do escolhido', () => {
    const http = configurar();
    expect(abrir(http).nativeElement.textContent).not.toContain('Enquadramento');
    const http2 = configurar();
    const f = abrir(http2, { ...PROJETO, tipoEnquadramento: 'MISTO', espacosComerciais: [{ rotulo: 'Lojas e Vitrines', areaM2: 90, cargaInstaladaKw: 15 }] });
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('Edificação mista — possui espaços comerciais');
    expect(texto).toContain('Lojas e Vitrines · 90 m² · 15,0 kW');
  });

  it('DUPLICAR cria a cópia, abre a etapa 1 da cópia e DESFAZER remove a cópia e volta ao original', () => {
    const http = configurar();
    const f = abrir(http);
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    const snackbar = TestBed.inject(SnackbarService); const aviso = spyOn(snackbar, 'mostrar');
    botao(f, /duplicar/i)!.click();
    f.detectChanges();
    expect(botao(f, /duplicando/i)!.disabled).toBeTrue();
    http.expectOne({ method: 'POST', url: '/api/v1/projects/1/duplicate' }).flush({ ...PROJETO, id: 9, nome: 'Edifício Aurora (cópia)' });
    expect(ir.calls.mostRecent().args).toEqual([['/projetos', '9', 'etapa-1'], { queryParams: {} }]);
    expect(aviso.calls.mostRecent().args[0]).toBe('Projeto duplicado com sucesso.');
    const acao = aviso.calls.mostRecent().args[1]!;
    expect(acao.rotulo).toBe('DESFAZER');
    acao.executar();
    http.expectOne({ method: 'DELETE', url: '/api/v1/projects/9' }).flush(null);
    expect(ir.calls.mostRecent().args).toEqual([['/projetos', '1']]);
    http.verify();
  });

  it('projeto de outro usuário ou inexistente: "Projeto não encontrado"', () => {
    const http = configurar();
    const f = TestBed.createComponent(DetalheProjetoPage);
    f.componentRef.setInput('id', '1'); f.detectChanges();
    http.expectOne('/api/v1/projects/1').flush({ message: 'Acesso negado' }, { status: 403, statusText: 'Forbidden' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Projeto não encontrado');
    expect(f.nativeElement.querySelector('a[href="/meus-projetos"].btn')).not.toBeNull();
  });

  it('erro de API: mensagem com TENTAR NOVAMENTE', () => {
    const http = configurar();
    const f = TestBed.createComponent(DetalheProjetoPage);
    f.componentRef.setInput('id', '1'); f.detectChanges();
    http.expectOne('/api/v1/projects/1').flush('x', { status: 500, statusText: 'Server Error' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Não foi possível carregar este projeto.');
  });

  it('o esqueleto só aparece depois de 150 ms de carregamento', fakeAsync(() => {
    const http = configurar();
    const f = TestBed.createComponent(DetalheProjetoPage);
    f.componentRef.setInput('id', '1'); f.detectChanges();
    expect(f.nativeElement.querySelector('.esqueleto')).toBeNull();
    tick(160); f.detectChanges();
    expect(f.nativeElement.querySelector('.esqueleto')).not.toBeNull();
    http.match(() => true); f.destroy();
  }));
});
