import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { CalculoApi, EtapasApi, ValidacaoApi } from '../../core/calculo/calculo.api';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { CalculandoPage } from './calculando.page';
import { ResultadoPage } from './resultado.page';
import { RevisaoPage } from './revisao.page';

const PROJETO = {
  id: 1, protocolo: 'PRJ-2026-0001', nome: 'Residencial Jardim', status: 'RASCUNHO', statusDescricao: 'Rascunho',
  tipoEdificacaoDescricao: 'Residencial multifamiliar', cep: '50050000', endereco: 'Rua do Exemplo, 120', bairro: 'Boa Viagem',
  municipio: 'Recife', uf: 'PE', possuiComercial: false, possuiVe: true, possuiIncendio: true,
  responsavel: 'Maria Souza', crea: 'ART 123', espacosComerciais: [],
};
const ETAPAS: EtapasApi = {
  residencial: { tipologias: [{ areaUtilM2: 65, quantidadeUnidades: 24, smartStudio: false }] },
  areaComum: { cargas: [{ origem: 'CATALOGO', submodulo: 'AQUECIMENTO', tipoEquipamento: null, descricao: 'Chuveiros', quantidade: 6, potenciaNominalKw: 5.5, fatorPotencia: 1, fatorDemanda: 1, reserva: false }] },
  cargasEspeciais: { qtdPontosVe: 6, potenciaVeKw: 7.4, potenciaBombaIncendioCv: 15, potenciaSolarInversorKw: null, medidorExclusivo: true },
};
const VALIDACAO_OK: ValidacaoApi = { projectId: 1, situacao: 'OK', quantidadeErros: 0, quantidadeAlertas: 0, totais: { erros: 0, alertas: 0, infos: 0 }, itens: [] };
const CALCULO: CalculoApi = {
  projectId: 1, protocolo: 'PRJ-2026-0001', status: 'CONCLUIDO', situacaoCalculo: 'CALCULADO', calculadoEm: '2026-10-13T21:40:12',
  resumoDemandas: { drf: 114.08, ds: 20.2, dc: 0, dve: 29.6, dmbi: 16.65, ded: 180.53, dqdg: 163.88 },
  enquadramento: { tipoFornecimento: 'BT_380_220V', limiteKva: 300, atendimentoMT: false, tipoEdificacao: 'RESIDENCIAL_MULTIFAMILIAR', tipoEnquadramento: 'RESIDENCIAL_MULTIFAMILIAR', motivoEnquadramento: null },
  dimensionamentoEntrada: { disjuntorGeralA: 320, circuitos: 1, caboFaseMm2: '240 mm²', caboNeutroMm2: '240 mm²', eletrodutoEntrada: 'PEAD 1 x 110 mm / aço 1 x 100 mm', tabelaReferencia: 'DIS-NOR-053 Anexo II Tabela 2', correnteProjetoA: 249.01 },
  barramentoQdg: { secao: '30 x 5', capacidadeA: 449, tabelaReferencia: 'DIS-NOR-053 Anexo II Tabela 3' },
  alertas: [], seloConformidade: 'CONFORME',
};

function configurar() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
  return TestBed.inject(HttpTestingController);
}

function carregarRevisao(http: HttpTestingController, validacao: ValidacaoApi): ComponentFixture<RevisaoPage> {
  const f = TestBed.createComponent(RevisaoPage);
  f.componentRef.setInput('id', '1');
  f.detectChanges();
  http.expectOne('/api/v1/projects/1').flush(PROJETO);
  http.expectOne('/api/v1/projects/1/etapas').flush(ETAPAS);
  http.expectOne('/api/v1/projects/1/validacao-normativa').flush(validacao);
  f.detectChanges();
  return f;
}

describe('Revisão (etapa 6)', () => {
  it('mostra os cinco cartões com os dados gravados no servidor e libera o cálculo sem erros', () => {
    const http = configurar();
    const f = carregarRevisao(http, VALIDACAO_OK);
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('Residencial Jardim');
    expect(texto).toContain('Maria Souza');
    expect(texto).toContain('Grupo 1');
    expect(texto).toContain('6 × 5,5 kW');
    expect(texto).toContain('6 × 7,4 kW');
    expect(texto).toContain('1 × 15 cv');
    expect(texto).toContain('Tudo certo para calcular');
    expect(f.nativeElement.querySelectorAll('app-summary-card').length).toBe(5);
    const botao = Array.from(f.nativeElement.querySelectorAll('footer button') as NodeListOf<HTMLButtonElement>).find(b => b.textContent?.includes('Calcular'))!;
    expect(botao.disabled).toBeFalse();
    http.verify();
  });

  it('com erro de validação bloqueia o cálculo e leva ao primeiro erro', () => {
    const http = configurar();
    const f = carregarRevisao(http, {
      projectId: 1, situacao: 'ERRO', quantidadeErros: 1, quantidadeAlertas: 1, totais: { erros: 1, alertas: 1, infos: 0 },
      itens: [
        { codigo: 'RESIDENCIAL_SEM_GRUPOS', nivel: 'ERRO', mensagem: 'Informe ao menos um grupo de unidades residenciais.', campo: 'tipologias', etapa: 'residencial' },
        { codigo: 'ABA_FORNOS_VAZIA', nivel: 'ALERTA', mensagem: 'Aba Fornos e fogões sem nenhum valor. Se a área comum não tem fornos ou fogões, pode seguir.', etapa: 'area-comum', aba: 'fornos' },
      ],
    });
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('1 erro impede o cálculo e 1 ponto merece atenção.');
    expect(texto).toContain('Ir para o erro em Residencial');
    expect(texto).toContain('Corrija 1 erro para calcular');
    const botao = Array.from(f.nativeElement.querySelectorAll('footer button') as NodeListOf<HTMLButtonElement>).find(b => b.textContent?.includes('Calcular'))!;
    expect(botao.disabled).toBeTrue();
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    botao.click();
    expect(ir).not.toHaveBeenCalled();
    http.verify();
  });

  it('só atenção: permite calcular e mostra o aviso', () => {
    const http = configurar();
    const f = carregarRevisao(http, { projectId: 1, situacao: 'ATENCAO', quantidadeErros: 0, quantidadeAlertas: 1, totais: { erros: 0, alertas: 1, infos: 0 }, itens: [{ codigo: 'ABA_FORNOS_VAZIA', nivel: 'ALERTA', mensagem: 'Aba Fornos e fogões sem nenhum valor.', etapa: 'area-comum', aba: 'fornos' }] });
    expect(f.nativeElement.textContent).toContain('Pronto para calcular, com 1 ponto de atenção.');
    expect(f.nativeElement.textContent).toContain('1 ponto merece atenção. Você pode calcular.');
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    (Array.from(f.nativeElement.querySelectorAll('footer button') as NodeListOf<HTMLButtonElement>).find(b => b.textContent?.includes('Calcular'))!).click();
    expect(ir).toHaveBeenCalledWith(['/projetos', '1', 'calculando']);
    http.verify();
  });

  it('cada EDITAR (cartões 1 a 5) abre a rota certa da etapa, com origem=revisao', () => {
    const http = configurar();
    const f = carregarRevisao(http, VALIDACAO_OK);
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    const rotulos = ['Projeto', 'Residencial', 'Área comum', 'Comercial', 'Veículo elétrico e bomba de incêndio'];
    for (const [i, rotulo] of rotulos.entries()) {
      const botao = f.nativeElement.querySelector(`button[aria-label="Editar etapa ${rotulo}"]`) as HTMLButtonElement | null;
      expect(botao).not.toBeNull(); // todas as etapas têm EDITAR, inclusive Comercial em projeto residencial
      botao!.click();
      expect(ir.calls.mostRecent().args).toEqual([['/projetos', '1', `etapa-${i + 1}`], { queryParams: { origem: 'revisao' } }]);
    }
    http.verify();
  });

  it('EDITAR da área comum abre a aba do alerta; sem alerta, a primeira aba', () => {
    const http = configurar();
    const f = carregarRevisao(http, { projectId: 1, situacao: 'ATENCAO', quantidadeErros: 0, quantidadeAlertas: 1, totais: { erros: 0, alertas: 1, infos: 0 },
      itens: [{ codigo: 'ABA_FORNOS_VAZIA', nivel: 'ALERTA', mensagem: 'Aba Fornos e fogões sem nenhum valor.', etapa: 'area-comum', aba: 'fornos' }] });
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    (f.nativeElement.querySelector('button[aria-label="Editar etapa Área comum"]') as HTMLButtonElement).click();
    expect(ir.calls.mostRecent().args).toEqual([['/projetos', '1', 'etapa-3'], { queryParams: { origem: 'revisao', aba: 'fornos' } }]);
    http.verify();
  });

  it('o link do alerta leva à etapa, aba, campo e item corretos', () => {
    const http = configurar();
    const f = carregarRevisao(http, { projectId: 1, situacao: 'ERRO', quantidadeErros: 1, quantidadeAlertas: 0, totais: { erros: 1, alertas: 0, infos: 0 },
      itens: [{ codigo: 'RESIDENCIAL_GRUPO_INCOMPLETO', nivel: 'ERRO', mensagem: 'Grupo 2: informe a área de 10 a 1.000 m².', etapa: 'residencial', campo: 'areaUtilM2', item: 1 }] });
    expect(f.componentInstance.destino(f.componentInstance.itens()[0])).toEqual({
      commands: ['/projetos', '1', 'etapa-2'], extras: { queryParams: { origem: 'revisao', campo: 'areaUtilM2', item: 1 } },
    });
    const link = f.nativeElement.querySelector('.msg-link') as HTMLAnchorElement;
    expect(link.textContent).toContain('Corrigir');
    expect(link.getAttribute('href')).toBe('/projetos/1/etapa-2?origem=revisao&campo=areaUtilM2&item=1');
    http.verify();
  });

  it('residencial com espaços comerciais: alerta de enquadramento misto com os links "Revisar espaços" e "Alterar tipo"', () => {
    const http = configurar();
    const f = carregarRevisao(http, { projectId: 1, situacao: 'ATENCAO', quantidadeErros: 0, quantidadeAlertas: 1, totais: { erros: 0, alertas: 1, infos: 0 },
      itens: [{ codigo: 'TIPO_ENQUADRAMENTO_MISTO', nivel: 'ALERTA', mensagem: 'Este projeto tem espaços comerciais. Para o enquadramento, ele é tratado como edificação mista (limite de baixa tensão de 225 kVA).',
        campo: 'espacos', etapa: 'comercial', rotuloAcao: 'Revisar espaços', alternativa: { rotulo: 'Alterar tipo', etapa: 'projeto', campo: 'tipoEdificacao' } }] });
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('1 ponto merece atenção. Você pode calcular.');
    expect(texto).toContain('Ver ponto de atenção em Comercial');
    const links = Array.from(f.nativeElement.querySelectorAll('.msg-link') as NodeListOf<HTMLAnchorElement>);
    expect(links.map(l => l.textContent?.trim())).toEqual(['Revisar espaços', 'Alterar tipo']);
    expect(links.map(l => l.getAttribute('href'))).toEqual(['/projetos/1/etapa-4?origem=revisao&campo=espacos', '/projetos/1/etapa-1?origem=revisao&campo=tipoEdificacao']);
    expect(f.nativeElement.querySelector('button[aria-label="Editar etapa Comercial"]')).not.toBeNull();
    http.verify();
  });

  it('a contagem do banner é exatamente o número de mensagens exibidas nos cartões', () => {
    const http = configurar();
    const itens = [
      { codigo: 'PROJETO_CAMPO_OBRIGATORIO', nivel: 'ERRO' as const, mensagem: 'Informe o CEP.', campo: 'cep', etapa: 'projeto' as const },
      { codigo: 'RESIDENCIAL_GRUPO_INCOMPLETO', nivel: 'ERRO' as const, mensagem: 'Grupo 2: informe a área de 10 a 1.000 m².', campo: 'areaUtilM2', etapa: 'residencial' as const, item: 1 },
      { codigo: 'ABA_FORNOS_VAZIA', nivel: 'ALERTA' as const, mensagem: 'Aba Fornos e fogões sem nenhum valor.', etapa: 'area-comum' as const, aba: 'fornos' },
      { codigo: 'MOTOBOMBA_SEM_MEDIDOR_EXCLUSIVO', nivel: 'ALERTA' as const, mensagem: 'Motobomba sem medidor exclusivo.', campo: 'medidorExclusivo', etapa: 'cargas-especiais' as const },
      { codigo: 'INFORMATIVO', nivel: 'INFO' as const, mensagem: 'Só informativo.', etapa: 'projeto' as const },
    ];
    const f = carregarRevisao(http, { projectId: 1, situacao: 'ERRO', quantidadeErros: 2, quantidadeAlertas: 2, totais: { erros: 2, alertas: 2, infos: 1 }, itens });
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('2 erros impedem o cálculo e 2 pontos merecem atenção.');
    expect(f.nativeElement.querySelectorAll('.msg-item').length).toBe(4);
    expect(texto).not.toContain('Só informativo.');
    http.verify();
  });

  it('não calcula regra nenhuma: com a validação do back vazia, nenhum alerta aparece mesmo com a área comum vazia', () => {
    const http = configurar();
    const f = carregarRevisao(http, VALIDACAO_OK);
    expect(f.nativeElement.querySelectorAll('.msg-item').length).toBe(0);
    expect(f.nativeElement.querySelector('app-alert-banner')).toBeNull();
    http.verify();
  });

  it('volta para a etapa 5 pelo VOLTAR e rebusca a validação a cada abertura', () => {
    const http = configurar();
    const f = carregarRevisao(http, VALIDACAO_OK);
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    f.componentInstance.voltar();
    expect(ir.calls.mostRecent().args).toEqual([['/projetos', '1', 'etapa-5'], { queryParams: {} }]);
    f.destroy();
    const f2 = carregarRevisao(http, VALIDACAO_OK); // nova abertura: três GETs de novo (o helper exige cada um)
    expect(f2.componentInstance.itens().length).toBe(0);
    http.verify();
  });

  it('falha ao carregar mostra a mensagem com a opção de tentar de novo', () => {
    const http = configurar();
    const f = TestBed.createComponent(RevisaoPage);
    f.componentRef.setInput('id', '1'); f.detectChanges();
    http.expectOne('/api/v1/projects/1').flush('erro', { status: 500, statusText: 'x' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Não foi possível carregar a revisão.');
  });

  it('não grava nada no navegador', () => {
    const http = configurar();
    const antes = { local: localStorage.length, sessao: sessionStorage.length };
    carregarRevisao(http, VALIDACAO_OK);
    expect({ local: localStorage.length, sessao: sessionStorage.length }).toEqual(antes);
  });
});

describe('Calculando', () => {
  it('chama o cálculo uma única vez e abre o resultado trocando a rota no histórico', fakeAsync(() => {
    const http = configurar();
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    const f = TestBed.createComponent(CalculandoPage);
    f.componentRef.setInput('id', '1'); f.detectChanges();
    http.expectOne('/api/v1/projects/1').flush(PROJETO);
    const chamadas = http.match('/api/v1/projects/1/calcular');
    expect(chamadas.length).toBe(1);
    chamadas[0].flush(CALCULO);
    expect(ir).not.toHaveBeenCalled(); // espera o tempo mínimo de exibição
    tick(600);
    expect(ir).toHaveBeenCalledWith(['/projetos', '1', 'resultado'], { replaceUrl: true });
    f.destroy();
  }));

  it('erro 422 volta para a Revisão', fakeAsync(() => {
    const http = configurar();
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    const f = TestBed.createComponent(CalculandoPage);
    f.componentRef.setInput('id', '1'); f.detectChanges();
    http.expectOne('/api/v1/projects/1').flush(PROJETO);
    http.expectOne('/api/v1/projects/1/calcular').flush({ regra: 'etapas_obrigatorias', erros: [] }, { status: 422, statusText: 'x' });
    tick(600);
    expect(ir).toHaveBeenCalledWith(['/projetos', '1', 'revisao'], { replaceUrl: true });
    f.destroy();
  }));

  it('erro 5xx mostra o aviso sem declarar sucesso e permite tentar de novo', fakeAsync(() => {
    const http = configurar();
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    const f = TestBed.createComponent(CalculandoPage);
    f.componentRef.setInput('id', '1'); f.detectChanges();
    http.expectOne('/api/v1/projects/1').flush(PROJETO);
    http.expectOne('/api/v1/projects/1/calcular').flush('erro', { status: 500, statusText: 'x' });
    tick(600); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Não foi possível calcular agora');
    expect(f.nativeElement.textContent).toContain('Seus dados estão salvos');
    expect(ir).not.toHaveBeenCalled();
    f.componentInstance.iniciar();
    http.expectOne('/api/v1/projects/1/calcular').flush(CALCULO);
    tick(600);
    expect(ir).toHaveBeenCalledWith(['/projetos', '1', 'resultado'], { replaceUrl: true });
    f.destroy();
  }));

  it('pede confirmação para sair enquanto calcula', fakeAsync(() => {
    const http = configurar();
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const f = TestBed.createComponent(CalculandoPage);
    f.componentRef.setInput('id', '1'); f.detectChanges();
    http.expectOne('/api/v1/projects/1').flush(PROJETO);
    const confirmar = spyOn(window, 'confirm').and.returnValue(false);
    expect(f.componentInstance.podeSair()).toBeFalse();
    expect(confirmar).toHaveBeenCalledWith('O cálculo ainda está em andamento. Sair mesmo assim?');
    http.expectOne('/api/v1/projects/1/calcular').flush(CALCULO);
    tick(600);
    expect(f.componentInstance.podeSair()).toBeTrue();
    f.destroy();
  }));
});

describe('Resultado do cálculo', () => {
  function carregar(http: HttpTestingController, calculo: CalculoApi): ComponentFixture<ResultadoPage> {
    const f = TestBed.createComponent(ResultadoPage);
    f.componentRef.setInput('id', '1'); f.detectChanges();
    http.expectOne('/api/v1/projects/1/resultado').flush(calculo);
    http.expectOne('/api/v1/projects/1').flush(PROJETO);
    http.expectOne('/api/v1/projects/1/etapas').flush(ETAPAS);
    f.detectChanges();
    return f;
  }
  const botaoMemorial = (f: ComponentFixture<ResultadoPage>) =>
    Array.from(f.nativeElement.querySelectorAll('.acoes button') as NodeListOf<HTMLButtonElement>).find(b => b.textContent?.includes('memorial'))!;

  it('exibe os valores do back em pt-BR com 1 casa e a data real do cálculo', () => {
    const http = configurar();
    const f = carregar(http, CALCULO);
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('180,5');
    expect(texto).toContain('Calculado em 13/10/2026 às 21:40 conforme a DIS-NOR-053');
    expect(texto).toContain('Demanda do QDG (sem a bomba de incêndio): 163,9 kVA');
    expect(texto).toContain('Baixa tensão · 380/220 V');
    expect(texto).toContain('Disjuntor geral');
    expect(texto).toContain('320 A');
    expect(texto).toContain('30 × 5 mm · 449 A');
    expect(texto).toContain('Calculado');
    expect(botaoMemorial(f).disabled).toBeFalse();
    http.verify();
  });

  it('desatualizado: selo, banner com RECALCULAR e memorial bloqueado', () => {
    const http = configurar();
    const f = carregar(http, { ...CALCULO, situacaoCalculo: 'DESATUALIZADO' });
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('Desatualizado');
    expect(texto).toContain('Você alterou etapas depois deste cálculo');
    expect(botaoMemorial(f).disabled).toBeTrue();
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    (f.nativeElement.querySelector('.link') as HTMLButtonElement).click();
    expect(ir).toHaveBeenCalledWith(['/projetos', '1', 'calculando']);
    http.verify();
  });

  it('média tensão: alerta, sem cartão de entrada de serviço e memorial bloqueado', () => {
    const http = configurar();
    const f = carregar(http, {
      ...CALCULO, enquadramento: { tipoFornecimento: 'MT', limiteKva: 300, atendimentoMT: true, tipoEdificacao: 'RESIDENCIAL_MULTIFAMILIAR', tipoEnquadramento: 'RESIDENCIAL_MULTIFAMILIAR', motivoEnquadramento: null },
      dimensionamentoEntrada: null, barramentoQdg: null, seloConformidade: 'ATENDIMENTO_MT',
      alertas: [{ codigo: 'atendimento_mt', nivel: 'ALERTA', mensagem: 'x' }],
    });
    const texto = f.nativeElement.textContent as string;
    expect(texto).toContain('exige atendimento em média tensão');
    expect(texto).toContain('Fornecimento: Média tensão');
    expect(texto).not.toContain('Entrada de serviço');
    expect(botaoMemorial(f).disabled).toBeTrue();
    http.verify();
  });

  it('mostra o tipo de enquadramento e o motivo quando residencial com espaços comerciais é tratado como misto', () => {
    const http = configurar();
    const f = carregar(http, {
      ...CALCULO, enquadramento: { tipoFornecimento: 'BT_380_220V', limiteKva: 225, atendimentoMT: false, tipoEdificacao: 'RESIDENCIAL_MULTIFAMILIAR',
        tipoEnquadramento: 'MISTO', motivoEnquadramento: 'edificação residencial com espaços comerciais, tratada como mista' },
    });
    expect(f.nativeElement.textContent).toContain('Tipo de enquadramento: Uso misto (residencial e comercial) (edificação residencial com espaços comerciais, tratada como mista)');
    http.verify();
  });

  it('até 50 kVA mostra a informação do critério simplificado', () => {
    const http = configurar();
    const f = carregar(http, { ...CALCULO, alertas: [{ codigo: 'demanda_ate_50_kva', nivel: 'INFO', mensagem: 'Projetos até 50 kVA seguem critério simplificado de ligação.' }] });
    expect(f.nativeElement.textContent).toContain('Projetos até 50 kVA seguem critério simplificado de ligação.');
  });

  it('GERAR MEMORIAL baixa o PDF e avisa; 409 vira banner de desatualizado', () => {
    const http = configurar();
    const f = carregar(http, CALCULO);
    const snackbar = TestBed.inject(SnackbarService); const aviso = spyOn(snackbar, 'mostrar');
    const link = jasmine.createSpyObj<HTMLAnchorElement>('a', ['click']);
    const criar = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((tag: string) => (tag === 'a' ? link : criar(tag)));
    f.componentInstance.gerarMemorial();
    http.expectOne('/api/v1/projects/1/memorial-pdf').flush(new Blob(['%PDF'], { type: 'application/pdf' }));
    expect(link.click).toHaveBeenCalled();
    expect(link.download).toBe('memorial-PRJ-2026-0001.pdf');
    expect(aviso).toHaveBeenCalledWith('Memorial gerado.');

    f.componentInstance.gerarMemorial();
    http.expectOne('/api/v1/projects/1/memorial-pdf').flush(new Blob(['x']), { status: 409, statusText: 'Conflict' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Você alterou etapas depois deste cálculo');
    expect(botaoMemorial(f).disabled).toBeTrue();
  });

  it('sem cálculo gravado (404 nao_calculado) leva à Revisão', () => {
    const http = configurar();
    const router = TestBed.inject(Router); const ir = spyOn(router, 'navigate').and.resolveTo(true);
    const f = TestBed.createComponent(ResultadoPage);
    f.componentRef.setInput('id', '1'); f.detectChanges();
    http.expectOne('/api/v1/projects/1/resultado').flush({ regra: 'nao_calculado' }, { status: 404, statusText: 'x' });
    expect(ir).toHaveBeenCalledWith(['/projetos', '1', 'revisao'], { replaceUrl: true });
  });
});
