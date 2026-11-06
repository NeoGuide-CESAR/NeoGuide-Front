import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-primeira-versao', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="faixa" role="note"><div class="ng-container faixa__conteudo"><span class="faixa__selo">1ª VERSÃO</span><span>Tela preliminar: ainda não está 100% definida e pode mudar.</span></div></div>`,
  styles: `
    .faixa { background:var(--ng-versao-fundo); border-bottom:1px solid var(--ng-versao-borda); color:var(--ng-texto-2); }
    .faixa__conteudo { display:flex; align-items:center; gap:10px; padding-block:10px; font-size:14px; line-height:20px; }
    .faixa__selo { display:inline-flex; align-items:center; flex-shrink:0; height:24px; padding:0 10px; border-radius:var(--ng-raio-pill); background:var(--ng-aviso); color:var(--ng-branco); font-size:12px; font-weight:700; letter-spacing:.04em; }
  `,
})
export class PrimeiraVersaoComponent {}
