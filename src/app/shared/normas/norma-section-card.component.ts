import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Cartão de uma seção da página de normas: título (h2), linha de referência e conteúdo projetado. */
@Component({
  selector: 'app-norma-section-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // O id fica só na <section>; no elemento hospedeiro seria um id duplicado.
  host: { '[attr.id]': 'null' },
  template: `
    <section class="cartao" [id]="id()" [attr.data-secao]="id()" [class.destacada]="destacada()" [attr.aria-labelledby]="id() + '-titulo'">
      <header>
        <h2 [id]="id() + '-titulo'" tabindex="-1">{{ titulo() }}</h2>
        @if (referencia()) { <p class="referencia">{{ referencia() }}</p> }
      </header>
      <ng-content />
    </section>
  `,
  styles: [`
    :host { display: block; scroll-margin-top: 16px; }
    .cartao { padding: 24px; background: var(--ng-branco); border: 1px solid var(--ng-borda); border-radius: var(--ng-raio-card); transition: background-color .4s; }
    .cartao.destacada { background: var(--ng-verde-menta); }
    header { margin-bottom: 16px; }
    h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--ng-verde-profundo); outline: none; }
    h2:focus-visible { outline: 2px solid var(--ng-link); outline-offset: 4px; }
    .referencia { margin: 4px 0 0; font-size: 12px; color: var(--ng-texto-3); }
    @media (max-width: 767px) { .cartao { padding: 16px; } }
  `],
})
export class NormaSectionCardComponent {
  readonly id = input.required<string>();
  readonly titulo = input.required<string>();
  readonly referencia = input<string | null>(null);
  /** Destaque de 2 s ao chegar por âncora. */
  readonly destacada = input(false);
}
