import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Cartão numerado com título, ação EDITAR opcional e conteúdo projetado. Usado na Revisão e no Resultado. */
@Component({
  selector: 'app-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="cartao" [class.cartao--erro]="estado() === 'erro'" [class.cartao--atencao]="estado() === 'atencao'">
      <header>
        <span class="numero" aria-hidden="true">{{ numero() }}</span>
        <h2>{{ titulo() }}</h2>
        @if (editavel()) {
          <button type="button" class="editar" [attr.aria-label]="'Editar etapa ' + titulo()" (click)="editar.emit()">
            <span class="ms" aria-hidden="true">edit</span><span class="editar__texto">EDITAR</span>
          </button>
        }
      </header>
      <ng-content />
    </article>
  `,
  styles: [`
    :host { display: block; }
    .cartao { background: var(--ng-branco); border: 1px solid var(--ng-borda); border-radius: var(--ng-raio-card); padding: 24px; }
    .cartao--erro { border-color: var(--ng-danger); }
    .cartao--atencao { border-color: var(--ng-laranja); }
    header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .numero { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: none; border-radius: 50%; background: var(--ng-verde-escuro); color: var(--ng-branco); font-size: 12px; font-weight: 700; }
    h2 { margin: 0; font-size: 16px; font-weight: 700; color: var(--ng-verde-profundo); }
    .editar { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 14px; border: 1px solid var(--ng-verde-escuro); border-radius: var(--ng-raio-pill); background: transparent; color: var(--ng-verde-escuro); font: 500 12px/1 var(--ng-fonte); letter-spacing: .02em; cursor: pointer; }
    .editar:hover { background: var(--ng-verde-menta); }
    .editar:focus-visible { outline: 2px solid var(--ng-link); outline-offset: 2px; }
    .editar .ms { font-size: 16px; }
    @media (max-width: 767px) {
      .cartao { padding: 16px; }
      .editar { border: 0; padding: 0 4px; height: auto; }
      .editar:hover { background: transparent; text-decoration: underline; }
    }
  `],
})
export class SummaryCardComponent {
  readonly numero = input.required<number>();
  readonly titulo = input.required<string>();
  readonly editavel = input(true);
  readonly estado = input<'normal' | 'erro' | 'atencao'>('normal');
  readonly editar = output<void>();
}
