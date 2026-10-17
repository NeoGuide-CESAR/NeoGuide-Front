import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface LinkNav {
  rotulo: string;
  rota?: string;      // rota interna do Angular
  href?: string;      // link externo / ainda sem rota
  submenu?: boolean;  // mostra a setinha expand_more
}

/**
 * Cabeçalho padrão Neoenergia: barra verde (marca + slot à direita)
 * e barra de navegação com a borda inferior de 5px.
 * Use <ng-content> para colocar o botão de Login ou o menu do usuário.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topo">
      <div class="ng-container topo__inner">
        <a routerLink="/" class="marca" aria-label="NeoGuide — página inicial">
          <!-- Troque pelo SVG oficial: <img src="assets/logo-neoenergia.svg" alt="Neoenergia"> -->
          <span class="marca__logo" aria-hidden="true">LOGO NEOENERGIA</span>
          <span class="marca__div" aria-hidden="true"></span>
          <span class="marca__nome">NeoGuide</span>
          @if (usoInterno()) { <span class="marca__interno">USO INTERNO</span> }
        </a>
        <div class="topo__acoes"><ng-content /></div>
      </div>
    </header>

    @if (links().length) {
      <nav class="nav" aria-label="Navegação principal">
        <ul class="ng-container nav__lista">
          @for (link of links(); track link.rotulo; let primeiro = $first) {
            <li>
              @if (link.rota) {
                <a
                  class="nav__link"
                  [routerLink]="link.rota"
                  routerLinkActive="nav__link--ativo"
                  ariaCurrentWhenActive="page"
                >
                  {{ link.rotulo }}
                  @if (link.submenu) { <span class="ms" aria-hidden="true">expand_more</span> }
                </a>
              } @else {
                <a class="nav__link" [class.nav__link--ativo]="primeiro && destacarPrimeiro()" [href]="link.href ?? '#'">
                  {{ link.rotulo }}
                  @if (link.submenu) { <span class="ms" aria-hidden="true">expand_more</span> }
                </a>
              }
            </li>
          }
        </ul>
      </nav>
    }
  `,
  styles: `
    :host { display: block; }

    .topo { background: var(--ng-verde); }
    .topo__inner {
      min-height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .marca {
      display: flex;
      align-items: center;
      gap: 16px;
      text-decoration: none;
      color: var(--ng-branco);
    }
    .marca:hover { color: var(--ng-branco); }
    .marca:focus-visible { outline: 3px solid var(--ng-branco); outline-offset: 4px; border-radius: 4px; }
    .marca__logo {
      height: 32px;
      padding: 0 12px;
      border: 1.5px dashed var(--ng-branco);
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      white-space: nowrap;
    }
    .marca__div { width: 1px; height: 24px; background: var(--ng-branco); opacity: .6; }
    .marca__nome { font-size: 20px; font-weight: 700; }
    .marca__interno { padding: 7px 12px; border-radius: 24px; background: var(--ng-verde-profundo); font-size: 12px; font-weight: 700; white-space: nowrap; }

    .topo__acoes { display: flex; align-items: center; gap: 12px; }

    .nav { border-bottom: 5px solid var(--ng-verde-escuro); }
    .nav__lista {
      list-style: none;
      margin: 0 auto;
      min-height: 61px;
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      scrollbar-width: none;
      /* compensa o padding interno dos links para alinhar com a marca */
      padding-inline: max(0px, calc(var(--ng-gutter) - 16px));
    }
    .nav__lista::-webkit-scrollbar { display: none; }

    .nav__link {
      min-height: 44px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 2px;
      color: var(--ng-verde-escuro);
      font-size: 16px;
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
      border-radius: 4px;
    }
    .nav__link .ms { font-size: 22px; }
    .nav__link:hover { background: var(--ng-verde-claro); color: var(--ng-verde-profundo); }
    .nav__link:focus-visible { outline: 3px solid var(--ng-link); outline-offset: -3px; }
    .nav__link--ativo { font-weight: 700; }

    @media (max-width: 600px) {
      .marca__logo, .marca__div { display: none; }
    }
  `,
})
export class SiteHeaderComponent {
  readonly usoInterno = input(false);
  readonly links = input<LinkNav[]>([]);
  /** Marca o primeiro link como ativo quando não há rotas (página pública). */
  readonly destacarPrimeiro = input(false);
}
