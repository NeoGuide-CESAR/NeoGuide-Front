import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { SiteHeaderComponent } from '../layout/site-header.component';
import { SiteFooterComponent } from '../layout/site-footer.component';
import { PrimeiraVersaoComponent } from './primeira-versao.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-projeto-layout', standalone: true,
  imports: [SiteHeaderComponent, SiteFooterComponent, PrimeiraVersaoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-site-header [links]="links()" [menuResponsivo]="true">
      <details class="conta"><summary [attr.aria-label]="'Menu de ' + (auth.usuario()?.nome || 'Meu perfil')"><span class="ms" aria-hidden="true">account_circle</span><span class="conta__nome">{{ auth.usuario()?.nome || 'Meu perfil' }}</span><span class="ms conta__seta" aria-hidden="true">expand_more</span></summary>
        <div class="conta__painel"><p>Perfil: {{ auth.usuario()?.perfil === 'analista' ? 'Analista' : 'Projetista' }}</p><button type="button" (click)="sair()"><span class="ms" aria-hidden="true">logout</span> Sair</button></div>
      </details>
    </app-site-header>
    <app-primeira-versao />
    <ng-content />
    <app-site-footer />
  `,
  styles: `
    :host { display:flex; flex-direction:column; min-height:100dvh; font-family:var(--ng-fonte); color:var(--ng-texto); }
    .conta { position:relative; }
    summary { display:flex; align-items:center; gap:8px; min-height:36px; padding:0 10px 0 6px; border-radius:4px; background:var(--ng-verde-escuro); color:var(--ng-branco); font-size:16px; font-weight:500; cursor:pointer; list-style:none; }
    summary::-webkit-details-marker { display:none; }
    summary>.ms { font-size:26px; }
    summary>.conta__seta { font-size:22px; }
    summary:focus-visible, button:focus-visible { outline:3px solid var(--ng-link); outline-offset:3px; }
    .conta__painel { position:absolute; right:0; top:calc(100% + 8px); min-width:220px; padding:16px; z-index:20; border:1px solid var(--ng-borda); border-radius:4px; background:var(--ng-branco); font-size:14px; }
    .conta__painel p { margin-bottom:12px; color:var(--ng-texto-3); }
    .conta__painel button { display:flex; align-items:center; gap:8px; min-height:40px; border:0; background:transparent; color:var(--ng-verde-escuro); cursor:pointer; font:500 14px var(--ng-fonte); }
    @media(max-width:600px) { .conta__nome { display:none; } }
  `,
})
export class ProjetoLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly secao = input<'projetos' | 'calculo'>('projetos');
  readonly links = computed(() => [
    { rotulo: 'Início', rota: '/inicio', ativo: false },
    { rotulo: 'Meus Projetos', rota: '/meus-projetos', ativo: this.secao() === 'projetos' },
    { rotulo: 'Cálculo de Demanda', rota: '/projetos/novo/calculo', submenu: true, ativo: this.secao() === 'calculo' },
    { rotulo: 'Documentos', href: '#' },
  ]);
  sair(): void { this.auth.sair(); void this.router.navigateByUrl('/login'); }
}
