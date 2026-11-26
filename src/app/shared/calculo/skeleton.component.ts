import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Bloco cinza-claro com brilho deslizante (1,2 s); parado com prefers-reduced-motion. */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="bloco" [style.height.px]="altura()" aria-hidden="true"></div>`,
  styles: [`
    :host { display: block; }
    .bloco { border-radius: var(--ng-raio-card); background: linear-gradient(90deg, var(--ng-fundo-suave) 25%, var(--ng-creme) 50%, var(--ng-fundo-suave) 75%); background-size: 200% 100%; animation: brilho 1.2s linear infinite; }
    @keyframes brilho { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) { .bloco { animation: none; } }
  `],
})
export class SkeletonComponent {
  readonly altura = input(120);
}
