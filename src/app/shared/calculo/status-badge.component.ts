import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TipoSelo = 'rascunho' | 'em_analise' | 'aprovado' | 'reprovado' | 'calculado' | 'desatualizado';
const SELOS: Record<TipoSelo, { icone: string; rotulo: string }> = {
  rascunho: { icone: 'edit_note', rotulo: 'Rascunho' },
  em_analise: { icone: 'schedule', rotulo: 'Em análise' },
  aprovado: { icone: 'check_circle', rotulo: 'Aprovado' },
  reprovado: { icone: 'cancel', rotulo: 'Reprovado' },
  calculado: { icone: 'check_circle', rotulo: 'Calculado' },
  desatualizado: { icone: 'warning', rotulo: 'Desatualizado' },
};

/** Selo de situação em pílula (projeto e cálculo). */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="selo" [class]="'selo selo--' + tipo()"><span class="ms" aria-hidden="true">{{ dados().icone }}</span>{{ dados().rotulo }}</span>`,
  styles: [`
    :host { display: inline-flex; }
    .selo { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 10px; border-radius: var(--ng-raio-pill); font-size: 11px; font-weight: 500; background: var(--ng-areia); color: var(--ng-texto-3); }
    .ms { font-size: 14px; }
    .selo--calculado, .selo--aprovado { background: var(--ng-verde-menta); color: var(--ng-verde-profundo); }
    .selo--desatualizado { background: var(--ng-laranja-claro); color: var(--ng-atencao-texto); }
    .selo--reprovado { background: var(--ng-danger-fundo); color: var(--ng-danger); }
    .selo--em_analise { background: var(--ng-info-claro-bg); color: var(--ng-info); }
  `],
})
export class StatusBadgeComponent {
  readonly tipo = input.required<TipoSelo>();
  protected readonly dados = computed(() => SELOS[this.tipo()]);
}
