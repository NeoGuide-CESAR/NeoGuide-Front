import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { DadosProjetoFormComponent } from './dados-projeto-form.component';
import { WizardBodyComponent } from './wizard-body.component';
import { ConsultaCepService, ResultadoCep } from '../../core/projetos/consulta-cep.service';
import { dadosExemplo, dadosVazios, etapasAplicaveis, mascaraCep, normalizarUf } from '../../core/projetos/dados-projeto';
import { RascunhosProjetoService } from '../../core/projetos/rascunhos-projeto.service';

describe('Dados do projeto — regras NEO-09', () => {
  it('mantém todas as etapas após Projeto bloqueadas sem os obrigatórios', () => {
    expect(etapasAplicaveis(dadosVazios(), false)).toEqual([true, false, false, false, false, false]);
    expect(etapasAplicaveis(dadosVazios(), true)).toEqual([true, false, false, false, false, false]);
  });
  it('residencial bloqueia Comercial; Comercial bloqueia Residencial; misto libera ambos', () => {
    const dados = dadosExemplo();
    expect(etapasAplicaveis(dados, true)).toEqual([true, true, true, false, true, true]);
    expect(etapasAplicaveis({ ...dados, tipoEdificacao: 'Comercial' }, true)).toEqual([true, false, true, true, true, true]);
    expect(etapasAplicaveis({ ...dados, tipoEdificacao: 'Uso misto (residencial e comercial)' }, true)).toEqual([true, true, true, true, true, true]);
  });
  it('VE e bomba compartilham uma etapa; área comum e revisão seguem liberadas', () => {
    expect(etapasAplicaveis({ ...dadosExemplo(), temVe: false, temBomba: false }, true)).toEqual([true, true, true, false, false, true]);
    expect(etapasAplicaveis({ ...dadosExemplo(), temVe: false }, true)[4]).toBeTrue();
  });
  it('formata CEP e restringe UF a duas letras maiúsculas', () => {
    expect(mascaraCep('50a05000012')).toBe('50050-000');
    expect(normalizarUf('p3!e')).toBe('PE');
  });
});

describe('Formulário da prancheta 14', () => {
  let fixture: ComponentFixture<DadosProjetoFormComponent>;
  let consulta: jasmine.SpyObj<ConsultaCepService>;
  beforeEach(() => {
    consulta = jasmine.createSpyObj('ConsultaCepService', ['consultar']);
    consulta.consultar.and.returnValue(of({ endereco: 'Rua Nova', bairro: 'Centro', municipio: 'Recife', uf: 'PE' }));
    TestBed.configureTestingModule({ imports: [DadosProjetoFormComponent], providers: [{ provide: ConsultaCepService, useValue: consulta }] });
    fixture = TestBed.createComponent(DadosProjetoFormComponent); fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());
  function digitarCep(cep = '50050000'): void {
    const input = fixture.nativeElement.querySelector('#projeto-cep') as HTMLInputElement;
    input.value = cep; fixture.componentInstance.normalizar('cep', { target: input } as unknown as Event); fixture.detectChanges();
  }
  it('conta sete erros, mostra mensagens e foca o primeiro campo', () => {
    expect(fixture.componentInstance.validar()).toBeNull(); fixture.detectChanges();
    expect(fixture.componentInstance.quantidadeErros).toBe(7);
    expect(fixture.nativeElement.textContent).toContain('Faltam 7 campos obrigatórios. Eles estão marcados em vermelho.');
    expect(document.activeElement?.id).toBe('projeto-nome'); expect(consulta.consultar).not.toHaveBeenCalled();
  });
  it('mostra o singular quando falta apenas tipo', () => {
    const c = fixture.componentInstance; c.preencherExemplo(); c.form.controls.tipoEdificacao.setValue('');
    c.validar(); fixture.detectChanges();
    expect(c.resumo).toBe('Falta 1 campo obrigatório. Ele está marcado em vermelho.'); expect(document.activeElement?.id).toBe('projeto-tipoEdificacao');
  });
  it('oferece apenas os três tipos permitidos', () => {
    expect(fixture.nativeElement.querySelectorAll('select option').length).toBe(4);
    expect(fixture.nativeElement.textContent).not.toContain('Industrial');
  });
  it('busca só com oito dígitos, preenche os quatro campos e posiciona o cursor', () => {
    digitarCep('123'); expect(consulta.consultar).not.toHaveBeenCalled(); digitarCep();
    expect(consulta.consultar).toHaveBeenCalledOnceWith('50050000');
    const c = fixture.componentInstance;
    expect(c.form.controls.endereco.value).toBe('Rua Nova'); expect(c.form.controls.bairro.value).toBe('Centro');
    expect(c.form.controls.municipio.value).toBe('Recife'); expect(c.form.controls.uf.value).toBe('PE');
    const input = fixture.nativeElement.querySelector('#projeto-endereco') as HTMLInputElement;
    expect(document.activeElement).toBe(input); expect(input.selectionStart).toBe(input.value.length);
    expect(fixture.nativeElement.textContent).toContain('Endereço preenchido pelo CEP. Complete o número e confira o resto.');
  });
  it('mostra spinner enquanto busca e ignora a resposta de um CEP substituído', () => {
    const pendente = new Subject<ResultadoCep>(); consulta.consultar.and.returnValue(pendente);
    digitarCep(); expect(fixture.componentInstance.estadoCep()).toBe('buscando'); expect(fixture.nativeElement.querySelector('.spinner')).not.toBeNull();
    digitarCep('123'); pendente.next({ endereco: 'Rua antiga', bairro: '', municipio: '', uf: '' });
    expect(fixture.componentInstance.form.controls.endereco.value).toBe(''); expect(fixture.componentInstance.estadoCep()).toBe('padrao');
  });
  it('bloqueia CEP não encontrado e fora da concessão, com avisos completos', () => {
    const c = fixture.componentInstance; c.preencherExemplo();
    consulta.consultar.and.returnValue(of({ endereco: '', bairro: '', municipio: '', uf: '', naoEncontrado: true })); digitarCep();
    expect(c.validar()).toBeNull(); expect(c.erro('cep')).toBeTrue(); expect(fixture.nativeElement.textContent).toContain('Corrigir CEP');
    c.demonstrarCep('fora-concessao'); fixture.detectChanges(); expect(c.validar()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('O NeoGuide só aceita projetos na área atendida pela Neoenergia. Confira o CEP da obra.');
  });
  it('falha permite preenchimento manual sem apagar os outros campos', () => {
    const c = fixture.componentInstance; c.preencherExemplo(); consulta.consultar.and.returnValue(throwError(() => new Error('rede'))); digitarCep();
    expect(c.estadoCep()).toBe('falha'); expect(c.valido).toBeTrue();
    (fixture.nativeElement.querySelector('button.link') as HTMLButtonElement).click(); expect(document.activeElement?.id).toBe('projeto-endereco');
  });
  it('valida UF com duas letras e oferece todas as variantes do tweak', () => {
    const c = fixture.componentInstance; c.preencherExemplo(); c.form.controls.uf.setValue('P'); expect(c.validar()).toBeNull();
    for (const estado of ['padrao', 'buscando', 'encontrado', 'nao-encontrado', 'fora-concessao', 'falha'] as const) { c.demonstrarCep(estado); expect(c.estadoCep()).toBe(estado); }
  });
});

describe('Barra de etapas e salvamento', () => {
  let fixture: ComponentFixture<WizardBodyComponent>;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [WizardBodyComponent], providers: [{ provide: ConsultaCepService, useValue: { consultar: () => of(null) } }] });
    fixture = TestBed.createComponent(WizardBodyComponent); fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());
  it('não pede salvamento sem tipo e não permite pular uma etapa bloqueada', () => {
    const c = fixture.componentInstance; const salvar = jasmine.createSpy('salvar'); c.salvarProjeto.subscribe(salvar);
    c.formulario!.preencherExemplo(); c.formulario!.demonstrarTipo(''); c.avancarEtapa(); c.irParaEtapa(5);
    expect(salvar).not.toHaveBeenCalled(); expect(c.etapaAtual()).toBe(0);
  });
  it('Comercial avança à Área comum apenas após confirmar salvamento; volta pula bloqueadas', () => {
    const c = fixture.componentInstance; c.formulario!.preencherExemplo(); c.formulario!.demonstrarTipo('Comercial');
    c.avancarEtapa(); expect(c.etapaAtual()).toBe(0); c.confirmarSalvamento(); expect(c.etapaAtual()).toBe(2);
    c.voltarEtapa(); expect(c.etapaAtual()).toBe(0); expect(c.etapas().length).toBe(6);
  });
  it('edição mostra nome, selo Rascunho e o botão SALVAR E AVANÇAR', () => {
    fixture.componentRef.setInput('dadosIniciais', dadosExemplo()); fixture.componentRef.setInput('edicao', true); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Residencial Jardim');
    expect(fixture.nativeElement.textContent).toContain('Rascunho'); expect(fixture.nativeElement.textContent).toContain('SALVAR E AVANÇAR');
  });
  it('salva e reabre os quatro campos separados em rascunho local', () => {
    const service = TestBed.inject(RascunhosProjetoService); const id = service.salvar(dadosExemplo());
    try { expect(service.carregar(id)).toEqual(dadosExemplo()); } finally { localStorage.removeItem(`neoguide.rascunho.${id}`); }
  });
});
