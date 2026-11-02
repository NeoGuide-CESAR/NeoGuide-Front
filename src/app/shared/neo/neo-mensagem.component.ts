import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Mensagem } from '../../core/neo/neo.model';

/** Uma mensagem do chat: do usuário, do Neo (com fonte ou aviso de falta de fonte), do sistema ou de erro. */
@Component({
  selector: 'app-neo-mensagem',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (mensagem().autor) {
      @case ('sistema') {
        <p class="sistema">{{ mensagem().texto }}</p>
      }
      @case ('usuario') {
        <div class="linha linha--usuario">
          <p class="bolha bolha--usuario">{{ mensagem().texto }}</p>
        </div>
      }
      @default {
        <div class="linha">
          <span class="avatar ms" aria-hidden="true">bolt</span>
          <div class="bolha" [class.bolha--erro]="mensagem().falhou">
            @if (mensagem().falhou) {
              <p>Não foi possível responder agora. Tente de novo.</p>
              <button type="button" class="acao" (click)="tentar.emit()">TENTAR NOVAMENTE</button>
            } @else {
              <p>{{ mensagem().texto }}</p>
              @for (fonte of mensagem().fontes ?? []; track fonte.documento + fonte.secao) {
                <!-- TODO: abrir a norma na seção indicada (rota a definir) -->
                <button type="button" class="cartao-fonte">
                  <span class="cartao-fonte__rotulo">SEÇÃO CONSULTADA</span>
                  <span class="cartao-fonte__ref"><span class="ms" aria-hidden="true">menu_book</span>{{ fonte.documento }} · {{ fonte.secao }}</span>
                </button>
              }
              @if (mensagem().semFonte) {
                <span class="aviso"><span class="ms" aria-hidden="true">info</span>Sem fonte na base de documentos</span>
              }
            }
          </div>
        </div>
      }
    }
  `,
  styles: `
    :host { display: block; }
    p { margin: 0; }
    .sistema { text-align: center; font-size: 12px; line-height: 16px; color: var(--ng-texto-3); }

    .linha { display: flex; align-items: flex-end; gap: 8px; }
    .linha--usuario { justify-content: flex-end; }

    .avatar {
      width: 28px; height: 28px; flex-shrink: 0;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--ng-verde);
      color: var(--ng-branco);
      font-size: 16px;
    }

    .bolha {
      max-width: 85%;
      padding: 12px 16px;
      border: 1px solid var(--ng-borda);
      border-radius: 16px 16px 16px 4px;
      background: var(--ng-branco);
      color: var(--ng-texto);
      font-size: 14px;
      line-height: 20px;
    }
    .bolha--usuario {
      max-width: 80%;
      border: 0;
      border-radius: 16px 16px 4px 16px;
      background: var(--ng-verde-profundo);
      color: var(--ng-branco);
    }
    .bolha--erro {
      background: var(--ng-danger-bg);
      border-color: transparent;
      color: var(--ng-danger);
      display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
    }

    .cartao-fonte {
      width: 100%;
      margin-top: 8px;
      padding: 8px 12px;
      display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
      border: 1px solid var(--ng-borda);
      border-radius: var(--ng-raio-card);
      background: var(--ng-creme);
      text-align: left;
      cursor: pointer;
      &:focus-visible { outline: 3px solid var(--ng-link); outline-offset: 2px; }
    }
    .cartao-fonte__rotulo { font-size: 11px; font-weight: 500; text-transform: uppercase; color: var(--ng-texto-3); }
    .cartao-fonte__ref {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 13px; font-weight: 500; color: var(--ng-verde-escuro);
      .ms { font-size: 16px; }
    }

    .aviso {
      margin-top: 8px;
      align-self: flex-start;
      padding: 2px 10px;
      display: inline-flex; align-items: center; gap: 4px;
      border-radius: var(--ng-raio-pill);
      background: var(--ng-laranja-claro);
      font-size: 12px;
      color: var(--ng-texto);
      .ms { font-size: 16px; color: var(--ng-laranja); }
    }

    .acao {
      min-height: 32px;
      padding: 0 16px;
      border: 1px solid var(--ng-danger);
      border-radius: var(--ng-raio-pill);
      background: transparent;
      color: var(--ng-danger);
      font: 500 13px var(--ng-fonte);
      text-transform: uppercase;
      cursor: pointer;
      &:focus-visible { outline: 3px solid var(--ng-link); outline-offset: 2px; }
    }
  `,
})
export class NeoMensagemComponent {
  readonly mensagem = input.required<Mensagem>();
  readonly tentar = output<void>();
}
