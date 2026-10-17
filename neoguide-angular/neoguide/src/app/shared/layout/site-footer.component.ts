import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="rodape">
      <ul class="ng-container rodape__lista">
        @for (item of links(); track item) {
          <li><a href="#">{{ item }}</a></li>
        }
      </ul>
    </footer>
  `,
  styles: `
    :host { display: block; margin-top: auto; }
    .rodape { background: var(--ng-verde-escuro); }
    .rodape__lista {
      list-style: none;
      margin: 0 auto;
      min-height: 45px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      column-gap: 40px;
      row-gap: 4px;
      padding-block: 10px;
    }
    a {
      color: var(--ng-branco);
      font-size: 16px;
      font-weight: 500;
      text-decoration: none;
    }
    a:hover { color: var(--ng-branco); text-decoration: underline; }
    a:focus-visible { outline: 2px solid var(--ng-branco); outline-offset: 2px; }
  `,
})
export class SiteFooterComponent {
  readonly links = input<string[]>(['Contato', 'Dúvidas frequentes', 'Políticas e Avisos de Privacidade']);
}
