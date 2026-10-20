import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { complementosVazios, errosCalculo, lerComplementos } from '../../core/projetos/dados-calculo';
import { dadosExemplo } from '../../core/projetos/dados-projeto';
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
    expect(errosCalculo(dadosExemplo(), c).filter(e => e.etapa === 2).map(e => e.campo)).toEqual(['lavadoras', 'boilers']);
  });
  it('permite comercial sem espaços, mas valida cada espaço adicionado', () => {
    const d = { ...dadosExemplo(), tipoEdificacao: 'Comercial' as const };
    const c = complementosVazios();
    expect(errosCalculo(d, c).some(e => e.etapa === 3)).toBeFalse();
    c.comercial.push({ finalidade: ' ', area: -20 });
    expect(errosCalculo(d, c).filter(e => e.etapa === 3).length).toBe(2);
  });
  it('exclui dados residenciais, comerciais e equipamentos que não se aplicam', () => {
    const c = complementosVazios(); c.comercial = [{ finalidade: '', area: -1 }];
    let d = { ...dadosExemplo(), temVe: false, temBomba: false };
    expect(errosCalculo(d, c).map(e => e.etapa)).toEqual([1, 1]);
    expect(errosCalculo({ ...d, tipoEdificacao: 'Comercial' }, c).map(e => e.etapa)).toEqual([3, 3]);
  });
  it('valida VE e bomba independentemente, sem aceitar quantidades fracionadas', () => {
    const c = complementosVazios(); c.especiais = { pontos: 2, bombas: 1.5, potenciaCv: 0 };
    expect(errosCalculo(dadosExemplo(), c).filter(e => e.etapa === 4).map(e => e.campo)).toEqual(['bombas', 'potenciaCv']);
    expect(errosCalculo({ ...dadosExemplo(), temBomba: false }, c).some(e => e.etapa === 4)).toBeFalse();
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
    TestBed.configureTestingModule({ imports: [EtapasCalculoComponent] });
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
    c.adicionarEspaco(); c.finalidade(0, 'Loja'); c.areaEspaco(0, 120);
    expect(c.valores().comercial).toEqual([{ finalidade: 'Loja', area: 120 }]);
    c.removerEspaco(0); expect(c.valores().comercial).toEqual([]);
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
    f.componentRef.setInput('etapa', 5); f.detectChanges();
    expect(f.nativeElement.querySelector('tbody tr td:last-child').textContent).toBe('Sim');
  });
  it('a revisão permite editar e mostra só os dados aplicáveis ao projeto', () => {
    const c = complementosVazios(); c.comercial.push({ finalidade: 'Loja oculta', area: 120 });
    f.componentRef.setInput('valores', c); f.componentRef.setInput('etapa', 5); f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('Loja oculta');
    const editar = jasmine.createSpy('editar'); f.componentInstance.editar.subscribe(editar);
    const button = Array.from(f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b => b.textContent?.includes('residencial'))!;
    button.click(); expect(editar).toHaveBeenCalledWith(1);
    expect(f.nativeElement.textContent).toContain('Corrija 5 erros para calcular.');
  });
});

describe('Fluxo completo e persistência', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [WizardBodyComponent], providers: [{ provide: ConsultaCepService, useValue: { consultar: () => of(null) } }] }));
  it('impede avançar com grupo incompleto e concluir pulando dados obrigatórios', () => {
    const f = TestBed.createComponent(WizardBodyComponent); f.detectChanges(); const c = f.componentInstance;
    c.formulario!.preencherExemplo(); c.confirmarSalvamento(); f.detectChanges();
    c.avancarEtapa(); expect(c.etapaAtual()).toBe(1);
    c.irParaEtapa(5); f.detectChanges(); const concluir = jasmine.createSpy('concluir'); c.concluir.subscribe(concluir); c.avancarEtapa();
    expect(concluir).not.toHaveBeenCalled(); expect(c.podeConcluir()).toBeFalse(); f.destroy();
  });
  it('reabre todas as etapas e não apaga complementos ao salvar os dados do projeto', () => {
    const service = TestBed.inject(RascunhosProjetoService); const c = complementosVazios();
    c.residencial.grupos = [{ unidades: 24, area: 65, smartStudio: true }, { unidades: 16, area: 82, smartStudio: false }]; c.cargas.boilers = 2;
    c.comercial = [{ finalidade: 'Loja', area: 120 }]; c.especiais = { pontos: 4, bombas: 1, potenciaCv: 10 };
    const id = service.salvarCompleto(dadosExemplo(), c);
    try { service.salvar({ ...dadosExemplo(), nome: 'Editado' }, id); const reaberto = service.carregarCompleto(id)!;
      expect(reaberto.dados.nome).toBe('Editado'); expect(reaberto.complementos).toEqual(lerComplementos(c));
    } finally { localStorage.removeItem(`neoguide.rascunho.${id}`); }
  });
  it('só confirma a revisão quando o armazenamento confirma o salvamento', () => {
    const f = TestBed.createComponent(WizardBodyComponent); f.detectChanges(); const c = f.componentInstance;
    c.formulario!.preencherExemplo(); const dados = complementosVazios();
    dados.residencial.grupos = [{ unidades: 24, area: 65, smartStudio: false }]; dados.especiais = { pontos: 4, bombas: 1, potenciaCv: 10 };
    c.receberComplementos(dados); c.irParaEtapa(5); f.detectChanges();
    c.avancarEtapa(); expect(c.revisaoConcluida()).toBeFalse();
    c.rascunhoAlterado.subscribe(() => c.confirmarPersistencia(true)); c.avancarEtapa();
    expect(c.revisaoConcluida()).toBeTrue(); f.destroy();
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
