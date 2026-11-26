import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type VarianteAlerta = 'erro' | 'atencao' | 'info' | 'sucesso';
const ICONES: Record<VarianteAlerta, string> = { erro: 'error', atencao: 'warning', info: 'info', sucesso: 'check_circle' };

/** Faixa de alerta: erro (role alert), atenção e informação (role status). */
@Component({
  selector: 'app-alert-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="banner" [class]="'banner banner--' + variante()" [attr.role]="variante() === 'erro' ? 'alert' : 'status'">
      <span class="ms" aria-hidden="true">{{ iconeExibido() }}</span>
      <div class="texto"><ng-content /></div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .banner { display: flex; gap: 12px; align-items: flex-start; padding: 12px 16px; border-radius: var(--ng-raio-alerta); font-size: 13px; line-height: 1.5; color: var(--ng-texto); }
    .ms { flex: none; font-size: 24px; }
    .texto { flex: 1; min-width: 0; }
    .banner--erro { background: var(--ng-danger-fundo); border-left: 4px solid var(--ng-danger); }
    .banner--erro .ms { color: var(--ng-danger); }
    .banner--atencao { background: var(--ng-laranja-claro); border-left: 4px solid var(--ng-laranja); }
    .banner--atencao .ms { color: var(--ng-laranja); }
    .banner--info { background: var(--ng-info-claro-bg); border-left: 4px solid var(--ng-info); }
    .banner--info .ms { color: var(--ng-info); }
    .banner--sucesso { background: var(--ng-verde-menta); border-left: 4px solid var(--ng-verde-escuro); }
    .banner--sucesso .ms { color: var(--ng-verde-escuro); }
  `],
})
export class AlertBannerComponent {
  readonly variante = input<VarianteAlerta>('info');
  /** Ícone próprio (ex.: schedule); sem ele vale o da variante. */
  readonly icone = input<string | null>(null);
  protected readonly iconeExibido = computed(() => this.icone() ?? ICONES[this.variante()]);
}
