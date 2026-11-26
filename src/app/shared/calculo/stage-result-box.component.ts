import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface ResultadoEtapa { descricao: string; valor: string; }

/** Bloco bege "RESULTADO DA ETAPA" com um ou mais valores empilhados. */
@Component({
  selector: 'app-stage-result-box',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bloco">
      <p class="rotulo">{{ rotulo() }}</p>
      @for (item of itens(); track $index) {
        <div class="item">
          <p class="descricao">{{ item.descricao }}</p>
          @if (item.valor) { <p class="valor" [class.valor--muted]="muted()">{{ item.valor }}</p> }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .bloco { background: var(--ng-creme); border-radius: var(--ng-raio-card); padding: 16px 20px; }
    p { margin: 0; }
    .rotulo { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ng-texto-3); }
    .item { margin-top: 8px; }
    .item + .item { margin-top: 12px; }
    .descricao { font-size: 12px; color: var(--ng-texto-3); }
    .valor { font-size: 22px; font-weight: 700; color: var(--ng-verde-profundo); }
    .valor--muted { color: var(--ng-texto-3); }
  `],
})
export class StageResultBoxComponent {
  readonly itens = input.required<ResultadoEtapa[]>();
  readonly rotulo = input('Resultado da etapa');
  readonly muted = input(false);
}
