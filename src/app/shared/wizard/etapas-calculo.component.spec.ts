import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { cargasDoServidor, cargasParaEnvio, complementosVazios, errosCalculo, espacosComerciaisParaEnvio, lerComplementos } from '../../core/projetos/dados-calculo';
import { dadosExemplo, dadosVazios } from '../../core/projetos/dados-projeto';
import { ConsultaCepService } from '../../core/projetos/consulta-cep.service';
import { RascunhosProjetoService } from '../../core/projetos/rascunhos-projeto.service';
import { EtapasCalculoComponent } from './etapas-calculo.component';
import { WizardBodyComponent } from './wizard-body.component';

describe('Entradas das etapas de cálculo', () => {
  it('exige unidades inteiras e área positiva nos grupos residenciais', () => {
    const c = complementosVazios();
    expect(errosCalculo(dadosExemplo(), c).filter(e => e.etapa === 1).length).toBe(2);
    c.residencial.grupos = [{ unidades: 1.5, area: 0, smartStudio: false }];
    expect(errosCalculo(dadosExemplo(), c).filter(e => e.etapa === 1).length).toBe(2);
    c.residencial.grupos = [];
    expect(errosCalculo(dadosExemplo(), c).some(e => e.campo === 'adicionar-grupo')).toBeTrue();
  });
  it('aceita cargas vazias e zero, rejeita quantidades negativas e fracionadas', () => {
    const c = complementosVazios();
    c.cargas = { tomadas: 0, lampadas: null, boilers: -1, lavadoras: 1.5 };
    c.potencias = { lavadoras: 1.5 };
    expect(errosCalculo(dadosExemplo(), c).filter(e => e.etapa === 2).map(e => e.campo)).toEqual(['lavadoras', 'boilers']);
  });
  it('exige a potência de cada carga da área comum que tem quantidade', () => {
    const c = complementosVazios();
    c.cargas = { chuveiros: 6, fornos: 1 }; c.potencias = { chuveiros: 5.5 };
    expect(errosCalculo(dadosExemplo(), c).filter(e => e.etapa === 2).map(e => e.campo)).toEqual(['potencia-fornos']);
    c.potencias.fornos = 4;
    expect(errosCalculo(dadosExemplo(), c).some(e => e.etapa === 2)).toBeFalse();
  });
  it('envia ao servidor só as cargas com quantidade, na ordem da tela, e lê de volta sem perder valores', () => {
    const c = complementosVazios();
    c.cargas = { fornos: 1, fogoes: 2, chuveiros: 6, tomadas: 0 }; c.potencias = { fornos: 4, fogoes: 5, chuveiros: 5.5 };
    const itens = cargasParaEnvio(dadosExemplo(), c)!;
    expect(itens.map(i => `${i.submodulo}:${i.tipoEquipamento}:${i.quantidade}:${i.potenciaNominalKw}`)).toEqual([
      'AQUECIMENTO:CHUVEIRO:6:5.5', 'COCCAO:FORNO:1:4', 'COCCAO:COOKTOP:2:5']);
    const volta = cargasDoServidor(itens);
    expect(volta.cargas).toEqual({ chuveiros: 6, fornos: 1, fogoes: 2 });
    expect(volta.potencias).toEqual({ chuveiros: 5.5, fornos: 4, fogoes: 5 });
  });
  it('não envia a área comum vazia nem com erro', () => {
    expect(cargasParaEnvio(dadosExemplo(), complementosVazios())).toBeNull();
    const c = complementosVazios(); c.cargas = { fornos: 1 };
    expect(cargasParaEnvio(dadosExemplo(), c)).toBeNull();
  });
  it('permite comercial sem espaços, mas valida cada espaço adicionado', () => {
    const d = { ...dadosExemplo(), tipoEdificacao: 'Comercial' as const };
    const c = complementosVazios();
    expect(errosCalculo(d, c).some(e => e.etapa === 3)).toBeFalse();
    c.comercial.push({ ocupacao: ' ', area: -20, carga: null });
    expect(errosCalculo(d, c).filter(e => e.etapa === 3).map(e => e.campo)).toEqual(['finalidade-0', 'area-espaco-0', 'carga-espaco-0']);
  });
  it('exige área mínima de 1 m² e carga mínima de 0,5 kW por espaço', () => {
    const d = { ...dadosExemplo(), tipoEdificacao: 'Comercial' as const };
    const c = complementosVazios();
    c.comercial = [{ ocupacao: 'LOJAS', area: 0.5, carga: 0.2 }];
    expect(errosCalculo(d, c).filter(e => e.etapa === 3).map(e => e.campo)).toEqual(['area-espaco-0', 'carga-espaco-0']);
  });
  it('residencial pode ter espaço comercial (sem erro de tipo) e lista vazia é válida e grava vazia', () => {
    const r = { ...dadosExemplo(), tipoEdificacao: 'Residencial multifamiliar' as const };
    const c = complementosVazios();
    c.comercial = [{ ocupacao: 'LOJAS', area: 50, carga: 10 }];
    expect(errosCalculo(r, c).filter(e => e.etapa === 3)).toEqual([]);
    expect(espacosComerciaisParaEnvio(r, c)).toEqual([{ ocupacao: 'LOJAS', area: 50, carga: 10 }]);
    c.comercial = [];
    expect(errosCalculo(r, c).filter(e => e.etapa === 3)).toEqual([]);
    expect(espacosComerciaisParaEnvio(r, c)).toEqual([]);
  });
  it('em residencial, cada espaço adicionado também precisa estar completo', () => {
    const r = { ...dadosExemplo(), tipoEdificacao: 'Residencial multifamiliar' as const };
    const c = complementosVazios();
    c.comercial = [{ ocupacao: 'LOJAS', area: null, carga: 10 }];
    expect(errosCalculo(r, c).filter(e => e.etapa === 3).map(e => e.campo)).toEqual(['area-espaco-0']);
    expect(espacosComerciaisParaEnvio(r, c)).toBeNull();
  });
  it('só envia espaços comerciais completos e válidos ao back', () => {
    const d = { ...dadosExemplo(), tipoEdificacao: 'Comercial' as const };
    const c = complementosVazios();
    c.comercial = [{ ocupacao: 'LOJAS', area: 120, carga: null }];
    expect(espacosComerciaisParaEnvio(d, c)).toBeNull();
    c.comercial = [{ ocupacao: 'LOJAS', area: 120, carga: 20 }];
    expect(espacosComerciaisParaEnvio(d, c)).toEqual([{ ocupacao: 'LOJAS', area: 120, carga: 20 }]);
  });
  it('exclui dados residenciais, comerciais e equipamentos que não se aplicam', () => {
    const c = complementosVazios(); c.comercial = [{ ocupacao: '', area: -1, carga: null }];
    let d = { ...dadosExemplo(), temVe: false, temBomba: false, tipoEdificacao: 'Residencial multifamiliar' as const };
    expect(errosCalculo(d, c).map(e => e.etapa)).toEqual([1, 1, 3, 3, 3]);
    expect(errosCalculo({ ...d, tipoEdificacao: 'Comercial' }, c).map(e => e.etapa)).toEqual([3, 3, 3]);
  });
  it('valida VE e bomba independentemente, sem aceitar quantidades fracionadas', () => {
    const c = complementosVazios(); c.especiais = { pontos: 2.5, potenciaVeKw: 0, potenciaCv: 0 };
    expect(errosCalculo(dadosExemplo(), c).filter(e => e.etapa === 4).map(e => e.campo)).toEqual(['pontos', 'potenciaVeKw', 'potenciaCv']);
    expect(errosCalculo({ ...dadosExemplo(), temBomba: false }, c).filter(e => e.etapa === 4).map(e => e.campo)).toEqual(['pontos', 'potenciaVeKw']);
    expect(errosCalculo({ ...dadosExemplo(), temVe: false, temBomba: false }, c).some(e => e.etapa === 4)).toBeFalse();
  });
  it('hidrata somente dados conhecidos e preserva valores inválidos para corrigir', () => {
    const c = lerComplementos({ residencial: { grupos: [{ unidades: -1, area: 'errado' }], smartStudio: true }, cargas: { tomadas: 5, intruso: 99 } });
    expect(c.residencial).toEqual({ grupos: [{ unidades: -1, area: null, smartStudio: true }] });
    expect(c.cargas.tomadas).toBe(5); expect((c.cargas as Record<string, unknown>)['intruso']).toBeUndefined();
    expect(lerComplementos(null)).toEqual(complementosVazios());
  });
});

describe('Formulários e revisão', () => {
  let f: ComponentFixture<EtapasCalculoComponent>;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EtapasCalculoComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    f = TestBed.createComponent(EtapasCalculoComponent);
    f.componentRef.setInput('etapa', 1); f.componentRef.setInput('dados', dadosExemplo()); f.componentRef.setInput('valores', complementosVazios()); f.componentRef.setInput('projetoValido', true);
    f.componentInstance.alterado.subscribe(c => { f.componentRef.setInput('valores', c); f.detectChanges(); });
    f.detectChanges();
  });
  afterEach(() => f.destroy());
  it('adiciona e remove grupos e espaços sem alterar o objeto de entrada', () => {
    const original = f.componentInstance.valores(); const c = f.componentInstance;
    c.adicionarGrupo(); c.grupo(1, 'unidades', 24); c.grupo(1, 'area', 65);
    expect(original.residencial.grupos.length).toBe(1);
    c.removerGrupo(0); expect(c.valores().residencial.grupos).toEqual([{ unidades: 24, area: 65, smartStudio: false }]);
    c.adicionarEspaco(); c.finalidade(0, 'LOJAS'); c.areaEspaco(0, 120); c.cargaEspaco(0, 20);
    expect(c.valores().comercial).toEqual([{ ocupacao: 'LOJAS', area: 120, carga: 20 }]);
    const pergunta = spyOn(c, 'pedirConfirmacao').and.returnValue(true);
    c.removerEspaco(0); expect(pergunta).toHaveBeenCalled(); expect(c.valores().comercial).toEqual([]);
  });
  it('remove espaço vazio sem pedir confirmação e cancela a remoção de espaço preenchido se o usuário recusar', () => {
    const c = f.componentInstance;
    const pergunta = spyOn(c, 'pedirConfirmacao').and.returnValue(false);
    c.adicionarEspaco(); c.removerEspaco(0); expect(pergunta).not.toHaveBeenCalled(); expect(c.valores().comercial).toEqual([]);
    c.adicionarEspaco(); c.finalidade(0, 'LOJAS'); c.removerEspaco(0);
    expect(pergunta).toHaveBeenCalledTimes(1); expect(c.valores().comercial.length).toBe(1);
  });
  it('ao validar cargas, abre a aba que contém o primeiro erro', () => {
    f.componentRef.setInput('etapa', 2); f.componentInstance.carga('boilers', -1); f.detectChanges();
    expect(f.componentInstance.validar()).toBeFalse(); f.detectChanges();
    expect(f.componentInstance.aba()).toBe(3);
    expect(f.nativeElement.textContent).toContain('Informe uma quantidade inteira, a partir de 0.');
  });
  it('mantém Smart studio independente por grupo, inclusive ao remover outro grupo', () => {
    const c = f.componentInstance;
    c.adicionarGrupo(); c.smartStudio(0, true);
    expect(f.nativeElement.querySelectorAll('input[type="checkbox"]').length).toBe(2);
    expect(c.valores().residencial.grupos.map(g => g.smartStudio)).toEqual([true, false]);
    c.smartStudio(1, true); c.smartStudio(0, false); c.removerGrupo(0);
    expect(c.valores().residencial.grupos[0].smartStudio).toBeTrue();
  });
});

describe('Projeto já salvo abre com as etapas liberadas', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [WizardBodyComponent], providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ConsultaCepService, useValue: { consultar: () => of(null) } }] }));
  it('libera a etapa comercial sem percorrer as etapas anteriores na sessão', () => {
    const f = TestBed.createComponent(WizardBodyComponent);
    f.componentRef.setInput('edicao', true); f.detectChanges();
    const c = f.componentInstance;
    const salvos = complementosVazios(); salvos.residencial.grupos = [{ unidades: 10, area: 65, smartStudio: false }];
    c.receberComplementos(salvos);
    c.receberDados({ dados: { ...dadosExemplo(), tipoEdificacao: 'Uso misto (residencial e comercial)' }, valido: true });
    expect(c.etapaLiberada(3)).toBeTrue();
    f.destroy();
  });
  it('projeto novo continua exigindo as etapas anteriores visitadas', () => {
    const f = TestBed.createComponent(WizardBodyComponent); f.detectChanges();
    const c = f.componentInstance;
    c.receberDados({ dados: { ...dadosExemplo(), tipoEdificacao: 'Uso misto (residencial e comercial)' }, valido: true });
    expect(c.etapaLiberada(3)).toBeFalse();
    f.destroy();
  });
});

describe('Fluxo completo e persistência', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [WizardBodyComponent], providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ConsultaCepService, useValue: { consultar: () => of(null) } }] }));
  it('impede avançar com grupo incompleto e abrir a revisão pulando dados obrigatórios', () => {
    const f = TestBed.createComponent(WizardBodyComponent); f.detectChanges(); const c = f.componentInstance;
    c.formulario!.preencherExemplo(); c.confirmarSalvamento(); f.detectChanges();
    c.avancarEtapa(); expect(c.etapaAtual()).toBe(1);
    const abrir = jasmine.createSpy('abrirRevisao'); c.abrirRevisao.subscribe(abrir);
    c.irParaEtapa(5); expect(abrir).not.toHaveBeenCalled(); expect(c.etapaAtual()).toBe(1); f.destroy();
  });
  it('reabre todas as etapas e não apaga complementos ao salvar os dados do projeto', () => {
    const service = TestBed.inject(RascunhosProjetoService); const c = complementosVazios();
    c.residencial.grupos = [{ unidades: 24, area: 65, smartStudio: true }, { unidades: 16, area: 82, smartStudio: false }]; c.cargas.boilers = 2;
    c.comercial = [{ ocupacao: 'LOJAS', area: 120, carga: 20 }]; c.especiais = { pontos: 4, potenciaVeKw: 7.4, potenciaCv: 10 };
    const id = service.salvarCompleto(dadosExemplo(), c);
    try { service.salvar({ ...dadosExemplo(), nome: 'Editado' }, id); const reaberto = service.carregarCompleto(id)!;
      expect(reaberto.dados.nome).toBe('Editado'); expect(reaberto.complementos).toEqual(lerComplementos(c));
    } finally { localStorage.removeItem(`neoguide.rascunho.${id}`); }
  });
  it('ao concluir a etapa de VE e bomba, o wizard abre a Revisão como rota própria', () => {
    const f = TestBed.createComponent(WizardBodyComponent); f.detectChanges(); const c = f.componentInstance;
    c.formulario!.preencherExemplo(); const dados = complementosVazios();
    dados.residencial.grupos = [{ unidades: 24, area: 65, smartStudio: false }]; dados.especiais = { pontos: 4, potenciaVeKw: 7.4, potenciaCv: 10 };
    c.receberComplementos(dados); c.etapasVisitadas.set([0, 1, 2, 3, 4]); c.irParaEtapa(4); f.detectChanges();
    const abrir = jasmine.createSpy('abrirRevisao'); c.abrirRevisao.subscribe(abrir);
    c.confirmarSalvamento();
    expect(abrir).toHaveBeenCalledTimes(1); expect(c.etapaAtual()).toBe(4); f.destroy();
  });
  it('vindo do EDITAR da Revisão, salvar a etapa volta para a Revisão', () => {
    const f = TestBed.createComponent(WizardBodyComponent); f.componentRef.setInput('origemRevisao', true); f.detectChanges(); const c = f.componentInstance;
    c.formulario!.preencherExemplo(); const dados = complementosVazios();
    dados.residencial.grupos = [{ unidades: 24, area: 65, smartStudio: false }]; dados.especiais = { pontos: 4, potenciaVeKw: 7.4, potenciaCv: 10 };
    c.receberComplementos(dados); c.etapasVisitadas.set([0, 1, 2, 4]); c.irParaEtapa(1); f.detectChanges();
    const abrir = jasmine.createSpy('abrirRevisao'); c.abrirRevisao.subscribe(abrir);
    c.confirmarSalvamento();
    expect(abrir).toHaveBeenCalledTimes(1); expect(c.etapaAtual()).toBe(1); f.destroy();
  });
  it('aberta pela Revisão, a etapa pedida é mantida mesmo antes de os dados do projeto chegarem', () => {
    const f = TestBed.createComponent(WizardBodyComponent);
    f.componentRef.setInput('origemRevisao', true); f.componentRef.setInput('etapaInicial', 2); f.detectChanges();
    const c = f.componentInstance;
    c.receberDados({ dados: dadosVazios(), valido: false });
    expect(c.etapaAtual()).toBe(2);
    c.receberDados({ dados: dadosExemplo(), valido: true });
    expect(c.etapaAtual()).toBe(2);
    expect(c.etapaLiberada(1)).toBeTrue(); expect(c.etapaLiberada(4)).toBeTrue();
    f.destroy();
  });
  it('rascunho local já carregado, sem vir da Revisão: abrir uma etapa sem as anteriores completas volta para a etapa 1', () => {
    const f = TestBed.createComponent(WizardBodyComponent);
    f.componentRef.setInput('edicao', true); f.componentRef.setInput('etapaInicial', 2); f.detectChanges();
    const c = f.componentInstance;
    c.receberDados({ dados: dadosExemplo(), valido: true });
    expect(c.etapaAtual()).toBe(0);
    f.destroy();
  });
  it('mostra o botão SALVAR E VOLTAR PARA A REVISÃO e marca alteração pendente até o servidor confirmar', () => {
    const f = TestBed.createComponent(WizardBodyComponent);
    f.componentRef.setInput('origemRevisao', true); f.componentRef.setInput('etapaInicial', 1); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('SALVAR E VOLTAR PARA A REVISÃO');
    const c = f.componentInstance;
    expect(c.temAlteracaoPendente()).toBeFalse();
    c.receberComplementos(complementosVazios());
    expect(c.temAlteracaoPendente()).toBeTrue();
    c.confirmarPersistencia(true);
    expect(c.temAlteracaoPendente()).toBeFalse();
    c.receberComplementos(complementosVazios()); c.confirmarPersistencia(false);
    expect(c.temAlteracaoPendente()).toBeTrue();
    f.destroy();
  });
  describe('stepper com o estado vindo do servidor', () => {
    const estados = (...lista: string[]) => lista.map((estado, i) => ({ numero: i + 1, nome: `Etapa ${i + 1}`, estado })) as never;
    function wizard(lista: string[], etapaInicial = 0) {
      const f = TestBed.createComponent(WizardBodyComponent);
      f.componentRef.setInput('edicao', true);
      f.componentRef.setInput('estadosServidor', estados(...lista));
      f.componentRef.setInput('etapaInicial', etapaInicial);
      f.detectChanges();
      f.componentInstance.receberDados({ dados: dadosExemplo(), valido: true }); // Residencial multifamiliar
      f.detectChanges();
      return f;
    }
    const botoes = (f: { nativeElement: HTMLElement }) => Array.from(f.nativeElement.querySelectorAll('.stepper-botao')) as HTMLButtonElement[];

    it('Comercial de um projeto residencial nunca fica com cadeado e abre normalmente', () => {
      const f = wizard(['CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'DISPONIVEL', 'NAO_SE_APLICA']);
      const c = f.componentInstance;
      expect(c.estadoEtapa(3)).toBe('disponivel');
      expect(c.etapaLiberada(3)).toBeTrue();
      expect(botoes(f)[3].disabled).toBeFalse();
      expect(botoes(f)[3].textContent).not.toContain('lock');
      c.irParaEtapa(3);
      expect(c.etapaAtual()).toBe(3);
      f.destroy();
    });
    it('mostra exatamente o estado do servidor: check só em concluída; cadeado só em bloqueada; traço em não se aplica', () => {
      const f = wizard(['CONCLUIDA', 'ATUAL', 'BLOQUEADA', 'BLOQUEADA', 'NAO_SE_APLICA'], 1);
      const c = f.componentInstance;
      expect([0, 1, 2, 3, 4, 5].map(i => c.estadoEtapa(i))).toEqual(['concluida', 'atual', 'bloqueada', 'bloqueada', 'nao-aplica', 'bloqueada']);
      const b = botoes(f);
      expect(b[0].textContent).toContain('check');
      expect(b[2].textContent).toContain('lock');
      expect(b[4].textContent).toContain('Não se aplica');
      expect(b[4].disabled).toBeFalse(); // clicável: a etapa explica por que não se aplica
      expect(c.etapaLiberada(2)).toBeFalse();
      f.destroy();
    });
    it('Revisão só libera com as etapas 1 a 5 concluídas ou que não se aplicam', () => {
      expect(wizard(['CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'NAO_SE_APLICA']).componentInstance.revisaoLiberada()).toBeTrue();
      expect(wizard(['CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'DISPONIVEL', 'NAO_SE_APLICA']).componentInstance.revisaoLiberada()).toBeFalse();
    });
    it('o texto "Conclua a etapa atual…" aparece só quando há etapa bloqueada', () => {
      const bloqueada = wizard(['CONCLUIDA', 'ATUAL', 'BLOQUEADA', 'BLOQUEADA', 'NAO_SE_APLICA'], 1);
      expect(bloqueada.nativeElement.textContent).toContain('Conclua a etapa atual para liberar a próxima.');
      const livre = wizard(['CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'CONCLUIDA', 'NAO_SE_APLICA']);
      expect(livre.nativeElement.textContent).not.toContain('Conclua a etapa atual');
      expect(livre.nativeElement.textContent).not.toContain('continuam bloqueadas');
    });
    it('depois de salvar, a nova etapa não volta para a 1 quando o formulário reemite os dados e os estados ainda estão antigos', () => {
      const f = wizard(['ATUAL', 'BLOQUEADA', 'BLOQUEADA', 'BLOQUEADA', 'NAO_SE_APLICA'], 0);
      const c = f.componentInstance;
      c.confirmarSalvamento();
      expect(c.etapaAtual()).toBe(1);
      c.receberDados({ dados: dadosExemplo(), valido: true }); // estados do servidor ainda não atualizaram
      expect(c.etapaAtual()).toBe(1);
      f.destroy();
    });
    it('ao avançar da etapa 3 com lista vazia vai para a Comercial, mesmo antes de o servidor atualizar os estados', () => {
      const f = wizard(['CONCLUIDA', 'CONCLUIDA', 'ATUAL', 'BLOQUEADA', 'NAO_SE_APLICA'], 2);
      f.componentInstance.confirmarSalvamento();
      expect(f.componentInstance.etapaAtual()).toBe(3);
      f.destroy();
    });
  });
  it('acesso direto pela URL: a etapa pedida sobrevive ao carregamento do projeto', () => {
    const f = TestBed.createComponent(WizardBodyComponent);
    f.componentRef.setInput('etapaInicial', 3); f.detectChanges();
    const c = f.componentInstance;
    c.receberDados({ dados: dadosVazios(), valido: false }); // o projeto ainda não carregou
    expect(c.etapaAtual()).toBe(3);
    f.destroy();
  });
  it('migra rascunhos legados sem perder endereço ou nome', () => {
    const id = 'teste-legado-neoguide'; localStorage.setItem(`neoguide.rascunho.${id}`, JSON.stringify(dadosExemplo()));
    try { const service = TestBed.inject(RascunhosProjetoService); const salvo = service.carregarCompleto(id)!;
      expect(salvo.dados).toEqual(dadosExemplo()); expect(salvo.complementos).toEqual(complementosVazios());
      service.salvarCompleto(salvo.dados, salvo.complementos, id); expect(service.carregar(id)).toEqual(dadosExemplo());
    } finally { localStorage.removeItem(`neoguide.rascunho.${id}`); }
  });
  it('migra Smart studio global preservando escolhas individuais já salvas', () => {
    const c = lerComplementos({ residencial: { smartStudio: true, grupos: [
      { unidades: 24, area: 65 }, { unidades: 16, area: 82, smartStudio: false },
    ] } });
    expect(c.residencial.grupos.map(g => g.smartStudio)).toEqual([true, false]);
    expect(lerComplementos({ residencial: { grupos: [{ unidades: 1, area: 30 }] } }).residencial.grupos[0].smartStudio).toBeFalse();
  });
});
