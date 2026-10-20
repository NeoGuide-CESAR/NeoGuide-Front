import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

export interface WizardStep {
  id: string;
  label: string;
  title: string;
  description?: string;
}

export interface WizardBreadcrumbItem {
  label: string;
  href?: string;
}

type EstadoEtapa = 'concluida' | 'atual' | 'pendente' | 'bloqueada';

interface CampoDadosProjeto {
  rotulo: string;
  valor: string;
  tag?: boolean;
}

/** Etapas padrão do cálculo de demanda (artboard do formulário). */
export const ETAPAS_CALCULO_DEMANDA: WizardStep[] = [
  { id: 'dados', label: 'Dados', title: 'Dados do projeto' },
  { id: 'apartamentos', label: 'Apartamentos', title: 'Apartamentos' },
  { id: 'condominio', label: 'Condomínio', title: 'Condomínio' },
  { id: 'veiculos-eletricos', label: 'Veículos elétricos', title: 'Veículos elétricos' },
  { id: 'revisao', label: 'Revisão', title: 'Revisão' },
];

/** Dados de exemplo da etapa "Dados do projeto" (mesmo projeto usado no mock da Home). */
const DADOS_PROJETO: CampoDadosProjeto[] = [
  { rotulo: 'Nome do projeto', valor: 'Residencial Jardim' },
  { rotulo: 'Endereço', valor: 'R. Caxangá, 450, Caxangá, Recife — PE' },
  { rotulo: 'Tipo de edificação', valor: 'Residencial multifamiliar' },
  { rotulo: 'Norma aplicada', valor: 'DIS-NOR-053 v2024.1', tag: true },
  { rotulo: 'Versão do projeto', valor: 'v1' },
];

/**
 * Esqueleto do formulário de múltiplas etapas (wizard) do cálculo de demanda:
 * título da página, stepper horizontal, container da etapa e rodapé de navegação.
 * O cabeçalho global é responsabilidade de quem usa este componente.
 */
@Component({
  selector: 'app-wizard-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wizard-body.component.html',
  styleUrl: './wizard-body.component.scss',
})
export class WizardBodyComponent {
  readonly titulo = input('Novo projeto');
  readonly subtitulo = input('Comece pelos dados da edificação. As próximas etapas dependem do que você marcar aqui.');
  readonly breadcrumb = input<WizardBreadcrumbItem[]>([{ label: 'Meus Projetos', href: '#' }, { label: 'Novo projeto' }]);

  readonly etapas = input<WizardStep[]>(ETAPAS_CALCULO_DEMANDA);
  readonly etapaInicial = input(0);
  /**
   * Indica se a etapa (pelo id) já está preenchida corretamente; controla o check verde e a liberação
   * da próxima etapa. Por enquanto, sem validações de formulário implementadas, todas as etapas são
   * consideradas completas por padrão para permitir a navegação.
   */
  readonly etapaCompleta = input<(id: string) => boolean>(() => true);

  /** Disparado ao clicar em "Cancelar". */
  readonly cancelar = output<void>();
  /** Disparado ao avançar de uma etapa intermediária para a próxima. */
  readonly avancar = output<string>();
  /** Disparado ao clicar no botão final, na última etapa. */
  readonly concluir = output<void>();

  private readonly etapaSelecionada = signal<number | null>(null);

  readonly etapaAtual = computed(() => this.etapaSelecionada() ?? this.etapaInicial());
  readonly etapaAtiva = computed(() => this.etapas()[this.etapaAtual()] ?? this.etapas()[0]);
  readonly ehUltimaEtapa = computed(() => this.etapaAtual() === this.etapas().length - 1);
  readonly etapaAtualCompleta = computed(() => this.etapaCompleta()(this.etapaAtiva().id));

  readonly dadosProjeto = DADOS_PROJETO;

  /** Uma etapa só é acessível se todas as anteriores estiverem concluídas; a primeira é sempre liberada. */
  etapaLiberada(indice: number): boolean {
    for (let i = 0; i < indice; i++) {
      if (!this.etapaCompleta()(this.etapas()[i].id)) return false;
    }
    return true;
  }

  estadoEtapa(indice: number): EstadoEtapa {
    if (indice === this.etapaAtual()) return 'atual';
    if (!this.etapaLiberada(indice)) return 'bloqueada';
    if (indice < this.etapaAtual() && this.etapaCompleta()(this.etapas()[indice].id)) return 'concluida';
    return 'pendente';
  }

  irParaEtapa(indice: number): void {
    if (!this.etapaLiberada(indice)) return;
    this.etapaSelecionada.set(indice);
  }

  voltarEtapa(): void {
    if (this.etapaAtual() === 0) return;
    this.etapaSelecionada.set(this.etapaAtual() - 1);
  }

  avancarEtapa(): void {
    if (!this.etapaAtualCompleta()) return;

    if (this.ehUltimaEtapa()) {
      this.concluir.emit();
      return;
    }

    this.avancar.emit(this.etapaAtiva().id);
    this.etapaSelecionada.set(this.etapaAtual() + 1);
  }
}
