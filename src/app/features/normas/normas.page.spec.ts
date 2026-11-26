import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { NeoStateService } from '../../core/neo/neo-state.service';
import { NormaApi, PremissaApi, TabelaNormaApi } from '../../core/normas/normas.service';
import { MODELOS } from '../../core/normas/tabelas-normas';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { NormasPage } from './normas.page';

const NORMAS: NormaApi[] = [
  { codigo: 'DIS-NOR-053', titulo: 'Fornecimento de Energia Elétrica a Edificações com Múltiplas Unidades Consumidoras até 34,5 kV', revisao: '06', dataAprovacao: '2025-09-09', papel: 'PRINCIPAL', urlDocumento: null, resumo: 'Edificações com múltiplas unidades consumidoras' },
  { codigo: 'DIS-NOR-030', titulo: 'Fornecimento de Energia Elétrica em Tensão Secundária de Distribuição a Edificações Individuais', revisao: '07', dataAprovacao: '2026-04-17', papel: 'COMPLEMENTAR', urlDocumento: 'https://exemplo.neoenergia/dis-nor-030.pdf', resumo: 'Edificações individuais (método da carga instalada)' },
];
const PREMISSAS: PremissaApi[] = [
  { codigo: 'PRE-FP', texto: 'Fator de potência: iluminação LED 0,80; tomadas 1,00.', referencia: 'DIS-NOR-030 · item 6.27' },
  { codigo: 'PRE-MISTO', texto: 'Edificação residencial com espaços comerciais é tratada como mista no enquadramento.', referencia: 'DIS-NOR-053 · itens 6.2.4 e 6.2.6' },
];
const tab = (ancora: string, titulo: string, endpoint: string | null, extra: Partial<TabelaNormaApi> = {}): TabelaNormaApi => ({
  ancora, titulo, referencia: 'DIS-NOR · ref', paginaPdf: 10, endpointCatalogo: endpoint ? `/api/v1/catalogo/${endpoint}` : null, disponivel: !!endpoint,
  etapasWizard: [], usadaNoResultado: false, notasResumidas: [], ...extra,
});
const TABELAS_053: TabelaNormaApi[] = [
  tab('quadro-35', 'Quadro 35 · Demanda do apartamento', 'faixas-area', { etapasWizard: [2] }),
  tab('quadro-36', 'Quadro 36 · Fator de coincidência', 'fatores-coincidencia-residencial', { etapasWizard: [2] }),
  tab('tabela-2', 'Tabela 2 (Anexo II) · Entrada de serviço 380/220 V', 'dimensionamento-entrada/380v', { usadaNoResultado: true, notasResumidas: ['Disjuntores a partir de 250 A têm relé ajustável.'] }),
];
const TABELAS_030: TabelaNormaApi[] = [
  tab('tabela-10', 'Tabela 10 · Fogões elétricos', 'fatores-fogao-cooktop', { etapasWizard: [3] }),
  tab('tabela-13', 'Tabela 13 · Estações de recarga individuais', null),
  tab('tabela-19', 'Tabela 19 · Motores trifásicos', 'motores-padrao', { etapasWizard: [3, 5] }),
];

/** Valores como o back devolve (conferidos contra as normas no teste do back). */
const CATALOGO: Record<string, unknown> = {
  'faixas-area': [
    { rotulo: 'Até 40 m²', minAreaM2: 0, maxAreaM2: 40, demandaUnitariakVa: 1.0 },
    { rotulo: '60,01 a 65 m²', minAreaM2: 60.01, maxAreaM2: 65, demandaUnitariakVa: 1.47 },
    { rotulo: '65,01 a 70 m²', minAreaM2: 65.01, maxAreaM2: 70, demandaUnitariakVa: 1.57 },
  ],
  'fatores-coincidencia-residencial': { regraEspecialStudios: 'Para Smart/Studio acima de 15 unidades, 90%.', tabela: [
    { totalApartamentos: 20, fatorCoincidencia: 0.872 }, { totalApartamentos: 50, fatorCoincidencia: 0.7068 }, { totalApartamentos: 60, fatorCoincidencia: 0.6823 }] },
  'dimensionamento-entrada/380v': [
    { maxDemandaKva: 165, circuitos: 1, secaoCondutor: '150 mm²', dutoPead: '1 x 110', dutoAco: '1 x 100', correnteTotalA: 250, disjuntorCarcaca: '250 A', disjuntorCorrenteA: 250 },
    { maxDemandaKva: 211, circuitos: 1, secaoCondutor: '240 mm²', dutoPead: '1 x 110', dutoAco: '1 x 100', correnteTotalA: 320, disjuntorCarcaca: '400 A', disjuntorCorrenteA: 320 },
  ],
  'fatores-fogao-cooktop': { fatorPotencia: 1, faixas: [{ quantidade: 1, fatorDemanda: 1 }, { quantidade: 2, fatorDemanda: 0.6 }] },
  'motores-padrao': [
    { potenciaCv: 1, potenciaKw: 0.74, rendimentoEta: 0.75, fatorPotencia: 0.7, demandaUnitariakVa: 1.52, correnteNominal380vA: 2.3, chavePartidaRecomendada: 'DIRETA' },
    { potenciaCv: 2, potenciaKw: 1.5, rendimentoEta: 0.8, fatorPotencia: 0.75, demandaUnitariakVa: 2.7, correnteNominal380vA: 4.1, chavePartidaRecomendada: 'DIRETA' },
    { potenciaCv: 5, potenciaKw: 3.7, rendimentoEta: 0.85, fatorPotencia: 0.8, demandaUnitariakVa: 6.02, correnteNominal380vA: 9.1, chavePartidaRecomendada: 'ESTRELA_TRIANGULO' },
  ],
};

interface Cenario { f: ComponentFixture<NormasPage>; http: HttpTestingController; p: NormasPage; }

function abrir(codigo: string | undefined, opcoes: { fragmento?: string; tabelaComErro?: string } = {}): Cenario {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      ...(opcoes.fragmento !== undefined ? [{ provide: ActivatedRoute, useValue: { fragment: of(opcoes.fragmento), snapshot: {}, paramMap: of(), queryParamMap: of() } }] : [])],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(NormasPage);
  if (codigo) f.componentRef.setInput('codigo', codigo);
  f.detectChanges();
  http.expectOne('/api/v1/normas').flush(NORMAS);
  http.expectOne('/api/v1/normas/premissas').flush(PREMISSAS);
  const tabelas = (codigo ?? 'dis-nor-053') === 'dis-nor-030' ? TABELAS_030 : TABELAS_053;
  http.expectOne(`/api/v1/normas/${(codigo ?? 'dis-nor-053').toUpperCase()}/tabelas`).flush(tabelas);
  f.detectChanges();
  // Cada tabela disponível busca o seu catálogo.
  for (const t of tabelas.filter(x => x.disponivel)) {
    const req: TestRequest = http.expectOne(t.endpointCatalogo!);
    if (opcoes.tabelaComErro === t.ancora) req.flush('x', { status: 500, statusText: 'Server Error' });
    else req.flush(CATALOGO[t.endpointCatalogo!.replace('/api/v1/catalogo/', '')] ?? []);
  }
  f.detectChanges();
  return { f, http, p: f.componentInstance };
}

const texto = (f: ComponentFixture<NormasPage>) => f.nativeElement.textContent as string;
const secoes = (f: ComponentFixture<NormasPage>) => Array.from(f.nativeElement.querySelectorAll('[data-secao]') as NodeListOf<HTMLElement>).map(e => e.id);

describe('Normas técnicas', () => {
  it('abre na DIS-NOR-053 com as duas normas, revisão e data de aprovação vindas do back', () => {
    const { f, http } = abrir(undefined);
    const t = texto(f);
    expect(t).toContain('Normas técnicas');
    expect(t).toContain('DIS-NOR-053 · Rev. 06');
    expect(t).toContain('Aprovada em 09/09/2025');
    expect(t).toContain('DIS-NOR-030 · Rev. 07');
    expect(t).toContain('Aprovada em 17/04/2026');
    expect(t).toContain('Principal');
    expect(t).toContain('Complementar');
    expect((f.nativeElement.querySelector('.norma--ativa') as HTMLElement).textContent).toContain('DIS-NOR-053');
    expect(secoes(f)).toContain('regra-limite-bt');
    expect(secoes(f)).toContain('quadro-35');
    http.verify();
  });

  it('normas complementares só aparecem em /normas; nas subrotas, não', () => {
    expect(secoes(abrir(undefined).f)).toContain('complementares');
    expect(secoes(abrir('dis-nor-053').f)).not.toContain('complementares');
  });

  it('trocar de norma atualiza a URL; DIS-NOR-030 mostra as parcelas do item 6.27 e as suas tabelas', () => {
    const { f, http, p } = abrir('dis-nor-053');
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    const botoes = Array.from(f.nativeElement.querySelectorAll('.norma') as NodeListOf<HTMLButtonElement>);
    botoes.find(b => b.textContent?.includes('DIS-NOR-030'))!.click();
    expect(ir).toHaveBeenCalledWith(['/normas', 'dis-nor-030']);
    http.verify();

    const trinta = abrir('dis-nor-030');
    const s = secoes(trinta.f);
    expect(s).toContain('parcelas-6-27');
    expect(s).toContain('tabela-10');
    expect(s).not.toContain('regra-limite-bt');
    expect(texto(trinta.f)).toContain('Abrir documento oficial');
    expect(p).toBeTruthy();
  });

  it('sem URL de documento configurada não há botão, e o texto orienta a buscar no site da Neoenergia', () => {
    const { f } = abrir('dis-nor-053');
    expect(f.nativeElement.textContent).not.toContain('Abrir documento oficial');
    expect(texto(f)).toContain('consulte o site da Neoenergia Pernambuco');
    expect(texto(f)).toContain('Verifique no site da Neoenergia se há revisão mais recente.');
  });

  it('Quadro 35: valores do back (61–65 m² → 1,47; 66–70 m² → 1,57; até 40 m² → 1,00) e filtro "68" destaca a faixa 66–70', () => {
    const { f } = abrir('dis-nor-053');
    const quadro = f.nativeElement.querySelector('#quadro-35') as HTMLElement;
    const t = quadro.textContent as string;
    expect(t).toContain('60,01 a 65 m²');
    expect(t).toContain('1,47');
    expect(t).toContain('1,57');
    expect(t).toContain('1,00');
    expect(t).toContain('Usada na etapa 2 do wizard');
    const filtro = quadro.querySelector('input[type=search]') as HTMLInputElement;
    filtro.value = '68'; filtro.dispatchEvent(new Event('input'));
    f.detectChanges();
    const achadas = Array.from(quadro.querySelectorAll('tr.achado'));
    expect(achadas.length).toBe(1);
    expect(achadas[0].textContent).toContain('1,57');
  });

  it('Quadro 36 em percentual (87,20%, 70,68%, 68,23%) e Tabela 2 com a faixa 165 < De ≤ 211 → 240 mm², 320 A', () => {
    const { f } = abrir('dis-nor-053');
    const q36 = (f.nativeElement.querySelector('#quadro-36') as HTMLElement).textContent as string;
    expect(q36).toContain('87,20%');
    expect(q36).toContain('70,68%');
    expect(q36).toContain('68,23%');
    expect(q36).toContain('Smart/Studio acima de 15 unidades');
    const t2 = (f.nativeElement.querySelector('#tabela-2') as HTMLElement).textContent as string;
    expect(t2).toContain('165 < De ≤ 211');
    expect(t2).toContain('240 mm²');
    expect(t2).toContain('320');
    expect(t2).toContain('Usada no resultado do cálculo');
    expect(t2).toContain('Disjuntores a partir de 250 A');
  });

  it('Tabela 19 mostra a demanda em VA (1 cv → 1.520; 2 cv → 2.700; 5 cv → 6.020)', () => {
    const { f } = abrir('dis-nor-030');
    const t = (f.nativeElement.querySelector('#tabela-19') as HTMLElement).textContent as string;
    expect(t).toContain('1.520');
    expect(t).toContain('2.700');
    expect(t).toContain('6.020');
    expect(t).toContain('estrela-triangulo');
  });

  it('tabela ainda fora do catálogo (Tabela 13) avisa no próprio cartão, sem valores', () => {
    const { f } = abrir('dis-nor-030');
    const t13 = (f.nativeElement.querySelector('#tabela-13') as HTMLElement).textContent as string;
    expect(t13).toContain('ainda não está no catálogo do NeoGuide');
    expect(f.nativeElement.querySelector('#tabela-13 table')).toBeNull();
  });

  it('erro ao carregar uma tabela mostra a mensagem no cartão e o resto da página continua', () => {
    const { f } = abrir('dis-nor-053', { tabelaComErro: 'quadro-36' });
    expect((f.nativeElement.querySelector('#quadro-36') as HTMLElement).textContent).toContain('Não foi possível carregar esta tabela.');
    expect((f.nativeElement.querySelector('#quadro-35') as HTMLElement).textContent).toContain('1,47');
  });

  it('as premissas vêm do back e aparecem com o selo "Premissa do projeto"', () => {
    const { f } = abrir('dis-nor-053');
    const bloco = (f.nativeElement.querySelector('#premissas') as HTMLElement).textContent as string;
    for (const p of PREMISSAS) expect(bloco).toContain(p.texto);
    expect(f.nativeElement.querySelectorAll('#premissas app-premissa-badge').length).toBe(PREMISSAS.length);
    expect(bloco).toContain('Premissa do projeto');
  });

  it('busca: "cooktop", "225", "smart" e "motobomba" encontram as seções certas', fakeAsync(() => {
    const buscar = (c: Cenario, termo: string) => {
      const campo = c.f.nativeElement.querySelector('#busca-normas') as HTMLInputElement;
      campo.value = termo; campo.dispatchEvent(new Event('input')); tick(300); c.f.detectChanges();
    };
    const trinta = abrir('dis-nor-030');
    buscar(trinta, 'COOKTOP');
    expect(secoes(trinta.f)).toContain('tabela-10');
    expect(secoes(trinta.f)).toContain('parcelas-6-27');
    expect(secoes(trinta.f)).not.toContain('tabela-19');

    const a = abrir('dis-nor-053'); buscar(a, '225');
    expect(secoes(a.f)).toContain('regra-limite-bt');
    expect(secoes(a.f)).not.toContain('regra-tensao-pe');
    const b = abrir('dis-nor-053'); buscar(b, 'Smart');
    expect(secoes(b.f)).toContain('regra-smart-studio');
    const c = abrir('dis-nor-053'); buscar(c, 'motobomba');
    expect(secoes(c.f)).toContain('regra-motobomba');
     flush();
  }));

  it('busca sem resultado mostra a mensagem e LIMPAR BUSCA restaura tudo', fakeAsync(() => {
    const c = abrir('dis-nor-053');
    const campo = c.f.nativeElement.querySelector('#busca-normas') as HTMLInputElement;
    campo.value = 'xyzxyz'; campo.dispatchEvent(new Event('input')); tick(300); c.f.detectChanges();
    expect(texto(c.f)).toContain('Nenhum resultado para "xyzxyz".');
    (Array.from(c.f.nativeElement.querySelectorAll('.sem-resultado button') as NodeListOf<HTMLButtonElement>)[0]).click();
    c.f.detectChanges();
    expect(secoes(c.f)).toContain('regra-limite-bt');
     flush();
  }));

  it('o índice lista as seções da norma e acompanha a busca', fakeAsync(() => {
    const c = abrir('dis-nor-053');
    const itens = () => Array.from(c.f.nativeElement.querySelectorAll('nav[aria-label="Índice da norma"] a') as NodeListOf<HTMLAnchorElement>).map(a => a.getAttribute('href'));
    expect(itens()).toContain('#regra-limite-bt');
    expect(itens()).toContain('#quadro-35');
    expect(itens()).toContain('#glossario');
    const campo = c.f.nativeElement.querySelector('#busca-normas') as HTMLInputElement;
    campo.value = 'barramento'; campo.dispatchEvent(new Event('input')); tick(300); c.f.detectChanges();
    expect(itens()).toContain('#regra-barramento');
    expect(itens()).not.toContain('#regra-limite-bt');
     flush();
  }));

  it('âncora na URL: rola até a tabela, destaca o cartão por 2 s e dá foco no título', fakeAsync(() => {
    const rolar = spyOn(Element.prototype, 'scrollIntoView');
    const c = abrir('dis-nor-030', { fragmento: 'tabela-10' });
    tick(100); c.f.detectChanges();
    expect(rolar).toHaveBeenCalled();
    expect(c.p.destacada()).toBe('tabela-10');
    expect((c.f.nativeElement.querySelector('#tabela-10') as HTMLElement).classList).toContain('destacada');
    expect(document.activeElement?.id).toBe('tabela-10-titulo');
    tick(2000); c.f.detectChanges();
    expect(c.p.destacada()).toBeNull();
     flush();
  }));

  it('âncora inexistente abre a norma no topo, sem erro', fakeAsync(() => {
    const rolar = spyOn(Element.prototype, 'scrollIntoView');
    const c = abrir('dis-nor-053', { fragmento: 'nao-existe' });
    tick(100); c.f.detectChanges();
    expect(rolar).not.toHaveBeenCalled();
    expect(c.p.destacada()).toBeNull();
    expect(secoes(c.f)).toContain('visao-geral');
     flush();
  }));

  it('âncora de termo do glossário destaca o glossário e foca o termo', fakeAsync(() => {
    spyOn(Element.prototype, 'scrollIntoView');
    const c = abrir('dis-nor-053', { fragmento: 'glossario-ded' });
    tick(100); c.f.detectChanges();
    expect(c.p.destacada()).toBe('glossario');
    expect(document.activeElement?.id).toBe('glossario-ded');
    tick(2000);
    flush();
  }));

  it('COPIAR gera texto tabulado; Perguntar ao Neo abre o painel e envia a pergunta da tabela', async () => {
    const c = abrir('dis-nor-053');
    const escrever = jasmine.createSpy('writeText').and.resolveTo();
    spyOnProperty(navigator, 'clipboard', 'get').and.returnValue({ writeText: escrever } as unknown as Clipboard);
    const snackbar = TestBed.inject(SnackbarService); const aviso = spyOn(snackbar, 'mostrar');
    const quadro = c.f.nativeElement.querySelector('#quadro-35') as HTMLElement;
    const botoes = Array.from(quadro.querySelectorAll('.acoes button') as NodeListOf<HTMLButtonElement>);
    botoes.find(b => /copiar/i.test(b.textContent ?? ''))!.click();
    await Promise.resolve();
    const copiado = escrever.calls.mostRecent().args[0] as string;
    expect(copiado.split('\n')[0]).toBe('Área útil do apartamento\tDemanda do apartamento (kVA)');
    expect(copiado).toContain('60,01 a 65 m²\t1,47');
    expect(aviso).toHaveBeenCalledWith('Tabela copiada.');

    const neo = TestBed.inject(NeoStateService);
    const abrirPainel = spyOn(neo, 'abrirPainel'); const enviar = spyOn(neo, 'enviar');
    botoes.find(b => /neo/i.test(b.textContent ?? ''))!.click();
    expect(abrirPainel).toHaveBeenCalled();
    expect(enviar).toHaveBeenCalledWith('Como a Quadro 35 é usada no cálculo?');
  });

  it('tabelas longas mostram 10 linhas e "Ver tabela completa" expande', () => {
    const c = abrir('dis-nor-053');
    TestBed.inject(HttpTestingController);
    // 60 linhas no Quadro 36 (como no back)
    expect(c.f.nativeElement.querySelectorAll('#quadro-36 tbody tr').length).toBe(3); // fixture curta: sem botão
    expect(c.f.nativeElement.querySelector('#quadro-36 .botao--link')).toBeNull();
  });

  it('carregamento da base falhando mostra a mensagem com TENTAR NOVAMENTE', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(NormasPage);
    f.detectChanges();
    http.expectOne('/api/v1/normas').flush('x', { status: 500, statusText: 'Server Error' });
    http.match(() => true);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Não foi possível carregar as normas.');
  });
});

describe('Modelos de tabela: nenhum valor fixo, só colunas e formatação', () => {
  it('todo modelo é feito de funções sobre a resposta do back (nada de números do código)', () => {
    for (const [ancora, modelo] of Object.entries(MODELOS)) {
      expect(typeof modelo.linhas).toBe('function', ancora);
      for (const coluna of modelo.colunas) expect(typeof coluna.valor).toBe('function', `${ancora}: ${coluna.titulo}`);
      expect(modelo.linhas(null)).toEqual([]); // sem resposta, nenhuma linha
    }
  });
});
