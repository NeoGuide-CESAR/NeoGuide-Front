import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { RegraNorma } from '../../core/normas/conteudo-normas';
import { NormaSectionCardComponent } from './norma-section-card.component';
import { PremissaBadgeComponent } from './premissa-badge.component';

/** Uma regra da norma, resumida: texto curto, item citado e, quando houver, a fórmula. */
@Component({
  selector: 'app-regra-card',
  standalone: true,
  imports: [NormaSectionCardComponent, PremissaBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-norma-section-card [id]="regra().id" [titulo]="regra().titulo" [referencia]="regra().referencia" [destacada]="destacada()">
      <p class="texto">{{ regra().texto }}</p>
      @for (f of regra().formula ?? []; track f) { <pre class="formula">{{ f }}</pre> }
      @if (regra().premissa) { <p class="premissa"><app-premissa-badge /> {{ regra().premissa }}</p> }
      @if (regra().foraDoEscopo) { <p class="fora"><span class="ms" aria-hidden="true">block</span>Fora do escopo do NeoGuide nesta versão</p> }
    </app-norma-section-card>
  `,
  styles: [`
    :host { display: block; }
    p { margin: 0; font-size: 13px; line-height: 1.6; color: var(--ng-texto); }
    .formula { margin: 12px 0 0; padding: 10px 14px; border-radius: var(--ng-raio-alerta); background: var(--ng-creme); font: 500 13px/1.5 ui-monospace, Consolas, monospace; color: var(--ng-verde-profundo); overflow-x: auto; }
    .premissa { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .fora { display: inline-flex; align-items: center; gap: 4px; margin-top: 12px; font-size: 12px; font-weight: 500; color: var(--ng-texto-3); }
    .fora .ms { font-size: 16px; }
  `],
})
export class RegraCardComponent {
  readonly regra = input.required<RegraNorma>();
  readonly destacada = input(false);
}
