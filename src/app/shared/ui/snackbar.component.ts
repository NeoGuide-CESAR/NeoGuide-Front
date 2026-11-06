import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SnackbarService } from '../../core/ui/snackbar.service';

/** Renderiza a mensagem do SnackbarService (role="status" para leitores de tela). */
@Component({
  selector: 'app-snackbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (snackbar.atual(); as mensagem) {
      <div class="snackbar" role="status" aria-live="polite">
        <span>{{ mensagem.texto }}</span>
        @if (mensagem.acao; as acao) {
          <button type="button" class="snackbar__acao" (click)="snackbar.executarAcao()">{{ acao.rotulo }}</button>
        }
      </div>
    }
  `,
  styles: `
    .snackbar {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      z-index: 60;
      min-width: min(344px, calc(100vw - 32px));
      max-width: calc(100vw - 32px);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      border-radius: 4px;
      background: #323232;
      color: var(--ng-branco);
      font-size: 14px;
      line-height: 20px;
    }
    .snackbar__acao {
      border: 0;
      background: transparent;
      color: #7fd39b;
      font: 600 14px 'IberPangea Text', Figtree, sans-serif;
      text-transform: uppercase;
      text-decoration: none;
      cursor: pointer;
      &:focus-visible { outline: 3px solid var(--ng-branco); outline-offset: 2px; }
    }
  `,
})
export class SnackbarComponent {
  readonly snackbar = inject(SnackbarService);
}
