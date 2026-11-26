import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Selo laranja para o que é decisão do grupo e não texto literal da norma. */
@Component({
  selector: 'app-premissa-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="selo"><span class="ms" aria-hidden="true">info</span>Premissa do projeto</span>`,
  styles: [`
    :host { display: inline-flex; }
    .selo { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 10px; border-radius: var(--ng-raio-pill); background: var(--ng-laranja-claro); font-size: 11px; font-weight: 500; color: var(--ng-atencao-texto); white-space: nowrap; }
    .ms { font-size: 14px; }
  `],
})
export class PremissaBadgeComponent {}
