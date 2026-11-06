import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EtapaApresentacao, formatarNumero } from '../../core/projetos/etapas-apresentacao';

@Component({
  selector: 'app-projeto-etapa-dados', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projeto-etapa-dados.component.html', styleUrl: './projeto-etapa-dados.component.scss',
})
export class ProjetoEtapaDadosComponent {
  readonly etapa = input.required<EtapaApresentacao>();
  readonly modo = input<'detalhe' | 'resultado'>('resultado');
  readonly linhas = computed(() => this.modo() === 'detalhe' ? this.etapa().linhasDetalhe ?? this.etapa().linhas : this.etapa().linhas);
  readonly numero = formatarNumero;
}
