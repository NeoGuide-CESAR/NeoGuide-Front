import { ChangeDetectionStrategy, Component, ViewChild, computed, effect, input, isDevMode, output, signal } from '@angular/core';
import { DadosProjetoFormComponent } from './dados-projeto-form.component';
import { DadosProjeto, EstadoCep, TIPOS_EDIFICACAO, TipoEdificacao, dadosVazios, etapasAplicaveis } from '../../core/projetos/dados-projeto';
import { ComplementosCalculo, RascunhoCalculo, complementosVazios, errosCalculo } from '../../core/projetos/dados-calculo';
import { EtapasCalculoComponent } from './etapas-calculo.component';
import { ETAPAS } from '../../core/calculo/calculo.api';
import { EtapaEstadoApi } from '../../core/projetos/projetos.api';
import { idDoCampo } from '../../core/projetos/wizard-routes';

export interface WizardStep { id: string; label: string; title: string; description?: string; }
export interface WizardBreadcrumbItem { label: string; href?: string; }
type EstadoEtapa = 'concluida' | 'atual' | 'pendente' | 'bloqueada' | 'disponivel' | 'nao-aplica';
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
  readonly etapasVisitadas = signal<number[]>([0]);
  /** Ação a executar quando a gravação em curso for confirmada (ex.: avançar de etapa). */
  private aposGravar?: () => void;

  /**
   * A página confirma a gravação quando ela termina, que pode ser depois (API). Só então a ação pendente roda.
   * Gravações automáticas sem ação pendente são apenas confirmadas.
   */
  confirmarPersistencia(sucesso: boolean): void {
    const acao = this.aposGravar;
    this.aposGravar = undefined;
    this.temAlteracaoPendente.set(!sucesso);
    if (sucesso && acao) acao();
  }

  /** Pede a gravação e executa `depoisDeGravar` somente quando a página confirmar o sucesso. */
  private gravarEDepois(depoisDeGravar: () => void): void {
    this.aposGravar = depoisDeGravar;
    this.temAlteracaoPendente.set(true);
    this.rascunhoAlterado.emit({ dados: this.dadosAtuais(), complementos: this.complementos() });
  }
  readonly errosComplementares = computed(() => errosCalculo(this.dadosAtuais(), this.complementos()));
  constructor() {
    effect(() => { this.complementos.set(structuredClone(this.complementosIniciais())); }, { allowSignalWrites: true });
    // Foco pedido pela Revisão: só depois de o projeto carregar (edicao) e uma única vez.
    effect(() => {
      if (!this.edicao() || this.focoFeito) return;
      const slug = ETAPAS[this.etapaAtual()]?.slug;
      const id = slug ? idDoCampo(slug, this.campoFoco(), this.itemFoco(), this.abaInicial()) : null;
      if (!id) return;
      this.focoFeito = true;
      setTimeout(() => {
        const alvo = document.getElementById(id);
        alvo?.scrollIntoView({ block: 'center' });
        alvo?.focus();
      }, 400);
    });
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
  /** A última etapa (Revisão) é uma rota própria: o wizard pede para abri-la. */
  readonly abrirRevisao = output<void>();
  /** Veio da Revisão (?origem=revisao): abre a etapa pedida sem exigir as anteriores e volta para ela ao salvar. */
  readonly origemRevisao = input(false);
  /** Foco pedido pela Revisão: aba da área comum, campo do back e índice do item. */
  readonly abaInicial = input<string | null>(null);
  readonly campoFoco = input<string | null>(null);
  readonly itemFoco = input<number | null>(null);
  /** Estado de cada etapa (1 a 5) decidido no servidor. Vazio enquanto o projeto não existe ou não carregou. */
  readonly estadosServidor = input<EtapaEstadoApi[]>([]);
  /** Há alteração ainda não confirmada pelo servidor (autosave em andamento ou com falha). */
  readonly temAlteracaoPendente = signal(false);
  private focoFeito = false;
  readonly salvarProjeto = output<DadosProjeto>();
  readonly dadosAtuais = signal(dadosVazios());
  readonly formularioValido = signal(false);
  private readonly etapaSelecionada = signal<number | null>(null);
  readonly etapaAtual = computed(() => this.etapaSelecionada() ?? this.etapaInicial());
  readonly etapaAtiva = computed(() => this.etapas()[this.etapaAtual()] ?? this.etapas()[0]);
  private ehRevisao(indice: number): boolean { return indice === this.etapas().length - 1; }
  readonly tituloExibido = computed(() => this.edicao() ? this.dadosAtuais().nome || this.dadosIniciais().nome || this.titulo() : this.titulo());
  readonly controlesTeste = isDevMode();
  readonly tipos = TIPOS_EDIFICACAO;
  readonly estadosCep: { valor: EstadoCep; rotulo: string }[] = [
    { valor: 'padrao', rotulo: 'padrão' }, { valor: 'buscando', rotulo: 'buscando' }, { valor: 'encontrado', rotulo: 'encontrado' },
    { valor: 'nao-encontrado', rotulo: 'não encontrado' }, { valor: 'fora-concessao', rotulo: 'fora da concessão' }, { valor: 'falha', rotulo: 'falha' },
  ];
  receberDados(evento: { dados: DadosProjeto; valido: boolean }): void {
    this.dadosAtuais.set(evento.dados); this.formularioValido.set(evento.valido);
    // Aberta pela Revisão, a etapa pedida não é redirecionada, mesmo antes de os dados do projeto chegarem.
    // Com o estado vindo do servidor não há reset: ele ainda pode estar antigo logo depois de salvar, e o
    // redirecionamento de etapa bloqueada é feito ao abrir a página.
    // Antes de o projeto carregar (edicao falso) também não: a etapa pedida pela URL tem de sobreviver ao carregamento.
    if (this.edicao() && !this.estadosServidor().length && !this.origemRevisao() && !this.etapaLiberada(this.etapaAtual())) this.etapaSelecionada.set(0);
  }
  receberComplementos(valores: ComplementosCalculo): void {
    this.complementos.set(valores);
    this.temAlteracaoPendente.set(true);
    this.rascunhoAlterado.emit({ dados: this.dadosAtuais(), complementos: valores });
  }
  completa(indice: number): boolean {
    if (indice === 0) return this.formularioValido();
    // Em projeto já salvo, as etapas têm dados gravados: só os erros contam. Em projeto novo, vale o que foi visitado.
    const concluivel = this.edicao() || this.etapasVisitadas().includes(indice);
    return concluivel && !this.errosComplementares().some(e => e.etapa === indice);
  }
  /** Além de aplicável ao tipo/opções marcadas, só libera a etapa se todas as etapas aplicáveis anteriores já estiverem completas. */
  etapaLiberada(indice: number): boolean {
    if (indice < 0 || indice >= this.etapas().length) return false;
    if (this.estadosServidor().length) {
      // O servidor decide: a Revisão exige 1 a 5 concluídas (ou que não se aplicam); as demais, só não estar bloqueadas.
      return this.ehRevisao(indice) ? this.revisaoLiberada() : this.estadoDoServidor(indice) !== 'BLOQUEADA';
    }
    if (this.origemRevisao() && !this.ehRevisao(indice)) {
      // Vindo da Revisão, as etapas anteriores sempre podem ser abertas (respeitando o que o tipo de edificação permite).
      return this.formularioValido() ? (etapasAplicaveis(this.dadosAtuais(), true)[indice] ?? false) : true;
    }
    const aplicaveis = etapasAplicaveis(this.dadosAtuais(), this.formularioValido());
    if (!(aplicaveis[indice] ?? false)) return false;
    for (let i = 0; i < indice; i++) {
      if (aplicaveis[i] && !this.completa(i)) return false;
    }
    return true;
  }
  private estadoDoServidor(indice: number): string | null {
    return this.estadosServidor().find(e => e.numero === indice + 1)?.estado ?? null;
  }
  /** Revisão disponível quando as etapas 1 a 5 estão concluídas ou não se aplicam. */
  readonly revisaoLiberada = computed(() => {
    const estados = this.estadosServidor();
    return estados.length > 0 && estados.every(e => e.estado === 'CONCLUIDA' || e.estado === 'NAO_SE_APLICA');
  });
  readonly temEtapaBloqueada = computed(() => this.etapas().some((_, i) => this.estadoEtapa(i) === 'bloqueada'));
  estadoEtapa(indice: number): EstadoEtapa {
    if (indice === this.etapaAtual()) return 'atual';
    if (this.estadosServidor().length) {
      if (this.ehRevisao(indice)) return this.revisaoLiberada() ? 'disponivel' : 'bloqueada';
      switch (this.estadoDoServidor(indice)) {
        case 'CONCLUIDA': return 'concluida';
        case 'NAO_SE_APLICA': return 'nao-aplica';
        case 'BLOQUEADA': return 'bloqueada';
        default: return 'disponivel';
      }
    }
    if (!this.etapaLiberada(indice)) return 'bloqueada';
    if (this.completa(indice)) return 'concluida';
    return 'pendente';
  }
  irParaEtapa(indice: number): void {
    if (!this.etapaLiberada(indice) || this.salvando()) return;
    if (this.ehRevisao(indice)) this.abrirRevisao.emit(); else this.etapaSelecionada.set(indice);
  }
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
    if (!this.complementares?.validar()) return;
    this.etapasVisitadas.update(v => [...new Set([...v, this.etapaAtual()])]);
    this.gravarEDepois(() => this.confirmarSalvamento());
  }
  confirmarSalvamento(): void {
    this.avancar.emit(this.etapaAtiva().id);
    if (this.origemRevisao()) { this.abrirRevisao.emit(); return; }
    if (this.estadosServidor().length) {
      // Com o estado vindo do servidor, a próxima etapa ainda aparece bloqueada até ele atualizar: segue pela ordem.
      let proxima = this.etapaAtual() + 1;
      if (proxima === 1 && this.estadoDoServidor(1) === 'NAO_SE_APLICA') proxima = 2;
      if (this.ehRevisao(proxima)) this.abrirRevisao.emit(); else this.etapaSelecionada.set(proxima);
      return;
    }
    for (let i = this.etapaAtual() + 1; i < this.etapas().length; i++) {
      if (!this.etapaLiberada(i)) continue;
      if (this.ehRevisao(i)) this.abrirRevisao.emit(); else this.etapaSelecionada.set(i);
      return;
    }
  }
  testarCep(evento: Event): void { this.etapaSelecionada.set(0); this.formulario?.demonstrarCep((evento.target as HTMLSelectElement).value as EstadoCep); }
  testarTipo(evento: Event): void { this.etapaSelecionada.set(0); this.formulario?.demonstrarTipo((evento.target as HTMLSelectElement).value as TipoEdificacao | ''); }
}
