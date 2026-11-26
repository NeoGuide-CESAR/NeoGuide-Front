import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { LinhaValor } from '../../core/calculo/resumo-etapas';

/** Pares rótulo/valor: rótulo ~40% da largura, valor à direita e quebrando em várias linhas. */
@Component({
  selector: 'app-key-value-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl [class.resultado]="variante() === 'resultado'">
      @for (item of itens(); track $index) {
        <div class="linha">
          <dt>{{ item.rotulo }}</dt>
          <dd [class.erro]="item.erro" [class.muted]="item.muted">{{ item.valor }}</dd>
        </div>
      }
    </dl>
  `,
  styles: [`
    dl { display: grid; gap: 8px; margin: 0; }
    .linha { display: grid; grid-template-columns: 40% 1fr; column-gap: 16px; font-size: 13px; line-height: 1.5; }
    dt { color: var(--ng-texto-3); }
    dd { margin: 0; font-weight: 700; color: var(--ng-texto); overflow-wrap: anywhere; }
    dl.resultado dd { font-weight: 500; }
    dd.erro { color: var(--ng-danger); }
    dd.muted { font-weight: 400; color: var(--ng-texto-3); }
    @media (max-width: 767px) { .linha { grid-template-columns: 1fr; row-gap: 2px; } }
  `],
})
export class KeyValueListComponent {
  readonly itens = input.required<LinhaValor[]>();
  readonly variante = input<'revisao' | 'resultado'>('revisao');
}
