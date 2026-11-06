import { ChangeDetectionStrategy, Component, ViewChild, computed, effect, input, isDevMode, output, signal } from '@angular/core';
import { DadosProjetoFormComponent } from './dados-projeto-form.component';
import { DadosProjeto, EstadoCep, TIPOS_EDIFICACAO, TipoEdificacao, dadosVazios, etapasAplicaveis } from '../../core/projetos/dados-projeto';
import { ComplementosCalculo, RascunhoCalculo, complementosVazios, errosCalculo } from '../../core/projetos/dados-calculo';
import { EtapasCalculoComponent } from './etapas-calculo.component';

export interface WizardStep { id: string; label: string; title: string; description?: string; }
export interface WizardBreadcrumbItem { label: string; href?: string; }
type EstadoEtapa = 'concluida' | 'atual' | 'pendente' | 'bloqueada';
export const ETAPAS_CALCULO_DEMANDA: WizardStep[] = [
  { id: 'dados', label: 'Projeto', title: 'Dados do projeto' },
  { id: 'apartamentos', label: 'Residencial', title: 'Unidades residenciais' },
  { id: 'condominio', label: 'Área comum', title: 'Cargas da área comum' },
  { id: 'comercial', label: 'Comercial', title: 'Espaços comerciais' },
  { id: 'veiculos-eletricos', label: 'VE e bomba de incêndio', title: 'Veículo elétrico e bomba de incêndio' },
  { id: 'revisao', label: 'Revisão', title: 'Revise antes de calcular' },
];

@Component({
  selector: 'app-wizard-body', standalone: true, imports: [DadosProjetoFormComponent, EtapasCalculoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wizard-body.component.html', styleUrl: './wizard-body.component.scss',
})
export class WizardBodyComponent {
  @ViewChild(DadosProjetoFormComponent) formulario?: DadosProjetoFormComponent;
  @ViewChild(EtapasCalculoComponent) complementares?: EtapasCalculoComponent;
  readonly complementosIniciais = input<ComplementosCalculo>(complementosVazios());
  readonly complementos = signal(complementosVazios());
  readonly rascunhoAlterado = output<RascunhoCalculo>();
  readonly revisaoConcluida = signal(false);
  readonly etapasVisitadas = signal<number[]>([0]);
  private persistenciaConfirmada = false;
  confirmarPersistencia(sucesso: boolean): void { this.persistenciaConfirmada = sucesso; }
  private persistir(): boolean {
    this.persistenciaConfirmada = false;
    this.rascunhoAlterado.emit({ dados: this.dadosAtuais(), complementos: this.complementos() });
    return this.persistenciaConfirmada;
  }
  readonly errosComplementares = computed(() => errosCalculo(this.dadosAtuais(), this.complementos()));
  readonly podeConcluir = computed(() => this.formularioValido() && !this.errosComplementares().length);
  constructor() {
    effect(() => { this.complementos.set(structuredClone(this.complementosIniciais())); }, { allowSignalWrites: true });
  }
  readonly titulo = input('Novo projeto');
  readonly subtitulo = input('Comece pelos dados da edificação. As próximas etapas dependem do que você marcar aqui.');
  readonly breadcrumb = input<WizardBreadcrumbItem[]>([{ label: 'Meus Projetos', href: '#' }, { label: 'Novo projeto' }]);
  readonly etapas = input<WizardStep[]>(ETAPAS_CALCULO_DEMANDA);
  readonly etapaInicial = input(0);
  readonly dadosIniciais = input<DadosProjeto>(dadosVazios());
  readonly edicao = input(false);
  readonly salvando = input(false);
  readonly erroSalvamento = input('');
  readonly mensagemSalvamento = input('');
  readonly cancelar = output<void>();
  readonly avancar = output<string>();
  readonly concluir = output<void>();
  readonly salvarProjeto = output<DadosProjeto>();
  readonly dadosAtuais = signal(dadosVazios());
  readonly formularioValido = signal(false);
  private readonly etapaSelecionada = signal<number | null>(null);
  readonly etapaAtual = computed(() => this.etapaSelecionada() ?? this.etapaInicial());
  readonly etapaAtiva = computed(() => this.etapas()[this.etapaAtual()] ?? this.etapas()[0]);
  readonly ehUltimaEtapa = computed(() => this.etapaAtual() === this.etapas().length - 1);
  readonly tituloExibido = computed(() => this.edicao() ? this.dadosAtuais().nome || this.dadosIniciais().nome || this.titulo() : this.titulo());
  readonly controlesTeste = isDevMode();
  readonly tipos = TIPOS_EDIFICACAO;
  readonly estadosCep: { valor: EstadoCep; rotulo: string }[] = [
    { valor: 'padrao', rotulo: 'padrão' }, { valor: 'buscando', rotulo: 'buscando' }, { valor: 'encontrado', rotulo: 'encontrado' },
    { valor: 'nao-encontrado', rotulo: 'não encontrado' }, { valor: 'fora-concessao', rotulo: 'fora da concessão' }, { valor: 'falha', rotulo: 'falha' },
  ];
  receberDados(evento: { dados: DadosProjeto; valido: boolean }): void {
    this.dadosAtuais.set(evento.dados); this.formularioValido.set(evento.valido);
    this.revisaoConcluida.set(false);
    if (!this.etapaLiberada(this.etapaAtual())) this.etapaSelecionada.set(0);
  }
  receberComplementos(valores: ComplementosCalculo): void {
    this.complementos.set(valores); this.revisaoConcluida.set(false);
    this.rascunhoAlterado.emit({ dados: this.dadosAtuais(), complementos: valores });
  }
  completa(indice: number): boolean {
    return indice === 0 ? this.formularioValido() : this.etapasVisitadas().includes(indice) && !this.errosComplementares().some(e => e.etapa === indice);
  }
  /** Além de aplicável ao tipo/opções marcadas, só libera a etapa se todas as etapas aplicáveis anteriores já estiverem completas. */
  etapaLiberada(indice: number): boolean {
    if (indice < 0 || indice >= this.etapas().length) return false;
    const aplicaveis = etapasAplicaveis(this.dadosAtuais(), this.formularioValido());
    if (!(aplicaveis[indice] ?? false)) return false;
    for (let i = 0; i < indice; i++) {
      if (aplicaveis[i] && !this.completa(i)) return false;
    }
    return true;
  }
  estadoEtapa(indice: number): EstadoEtapa {
    if (indice === this.etapaAtual()) return 'atual';
    if (!this.etapaLiberada(indice)) return 'bloqueada';
    if (this.completa(indice)) return 'concluida';
    return 'pendente';
  }
  irParaEtapa(indice: number): void { if (this.etapaLiberada(indice) && !this.salvando()) this.etapaSelecionada.set(indice); }
  voltarEtapa(): void {
    if (this.salvando()) return;
    for (let i = this.etapaAtual() - 1; i >= 0; i--) if (this.etapaLiberada(i)) { this.etapaSelecionada.set(i); return; }
  }
  avancarEtapa(): void {
    if (this.salvando()) return;
    if (this.etapaAtual() === 0) {
      const dados = this.formulario?.validar();
      if (dados) this.salvarProjeto.emit(dados);
      return;
    }
    if (this.ehUltimaEtapa()) {
      if (this.podeConcluir()) {
        if (!this.persistir()) return;
        this.revisaoConcluida.set(true); this.concluir.emit();
      }
      return;
    }
    if (!this.complementares?.validar()) return;
    this.etapasVisitadas.update(v => [...new Set([...v, this.etapaAtual()])]);
    if (!this.persistir()) return;
    this.confirmarSalvamento();
  }
  confirmarSalvamento(): void {
    this.avancar.emit(this.etapaAtiva().id);
    for (let i = this.etapaAtual() + 1; i < this.etapas().length; i++) if (this.etapaLiberada(i)) { this.etapaSelecionada.set(i); return; }
  }
  testarCep(evento: Event): void { this.etapaSelecionada.set(0); this.formulario?.demonstrarCep((evento.target as HTMLSelectElement).value as EstadoCep); }
  testarTipo(evento: Event): void { this.etapaSelecionada.set(0); this.formulario?.demonstrarTipo((evento.target as HTMLSelectElement).value as TipoEdificacao | ''); }
}
