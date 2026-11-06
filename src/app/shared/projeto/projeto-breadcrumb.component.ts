import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbProjeto { rotulo: string; rota?: string | string[]; }
@Component({
  selector: 'app-projeto-breadcrumb', standalone: true, imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav aria-label="Breadcrumb"><ol>@for (item of itens(); track $index; let ultimo = $last) { <li>@if (item.rota && !ultimo) { <a [routerLink]="item.rota">{{ item.rotulo }}</a> } @else { <span [attr.aria-current]="ultimo ? 'page' : null">{{ item.rotulo }}</span> } @if (!ultimo) { <span class="ms" aria-hidden="true">chevron_right</span> }</li> }</ol></nav>`,
  styles: `ol { display:flex; flex-wrap:wrap; gap:4px; margin:0; padding:0; list-style:none; font-size:14px; line-height:20px; color:var(--ng-texto-3); } li { display:inline-flex; align-items:center; gap:4px; min-width:0; overflow-wrap:anywhere; } .ms { font-size:18px; } a { color:var(--ng-link); text-decoration:underline; } a:focus-visible { outline:3px solid var(--ng-link); outline-offset:2px; }`,
})
export class ProjetoBreadcrumbComponent { readonly itens = input.required<BreadcrumbProjeto[]>(); }
