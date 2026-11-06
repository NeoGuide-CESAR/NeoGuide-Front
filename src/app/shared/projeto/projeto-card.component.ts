import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-projeto-card', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="ng-card" [attr.aria-labelledby]="tituloId()"><ng-content /></section>`,
  styles: `:host { display:block; min-width:0; } section { display:flex; flex-direction:column; gap:16px; padding:24px; } @media(max-width:767px) { section { padding:16px; } }`,
})
export class ProjetoCardComponent { readonly tituloId = input.required<string>(); }
