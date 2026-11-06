import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoConsultaProjeto } from '../../core/projetos/consulta-projeto';

@Component({
  selector: 'app-projeto-estado', standalone: true, imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (estado()) {
      @case ('carregando') {
        <div class="progresso" role="progressbar" aria-label="Carregando projeto" aria-valuetext="Carregando"><span></span></div>
        <div class="esqueleto ng-container" aria-hidden="true"><div class="esqueleto__titulo"></div><div class="esqueleto__linha"></div><div class="esqueleto__grade">@for (n of [1,2,3]; track n) { <div class="esqueleto__card"></div> }</div></div>
        <p class="sr-only" role="status">Carregando projeto…</p>
      }
      @case ('erro') { <section class="estado ng-container" role="alert"><span class="ms" aria-hidden="true">error</span><h1>Não foi possível carregar o projeto</h1><p>Tente novamente em alguns instantes.</p><div class="estado__acoes"><button type="button" class="ng-btn ng-btn--primario" (click)="tentarNovamente.emit()">TENTAR NOVAMENTE</button><a class="ng-btn ng-btn--contorno" routerLink="/meus-projetos">VOLTAR PARA MEUS PROJETOS</a></div></section> }
      @case ('nao-encontrado') { <section class="estado ng-container"><span class="ms" aria-hidden="true">folder_open</span><h1>Projeto não encontrado</h1><p>Volte à listagem para escolher outro projeto.</p><a class="ng-btn ng-btn--primario" routerLink="/meus-projetos">VOLTAR PARA MEUS PROJETOS</a></section> }
    }
  `,
  styles: `
    .progresso { height:4px; background:var(--ng-verde-claro); overflow:hidden; }
    .progresso span { display:block; height:100%; width:25%; background:var(--ng-verde-escuro); animation:avancar 1.4s ease-in-out infinite; }
    .esqueleto { display:flex; flex-direction:column; gap:24px; padding-block:36px 48px; }
    .esqueleto__titulo { width:min(260px,100%); height:40px; background:var(--ng-fundo-suave); border-radius:6px; }
    .esqueleto__linha { width:min(320px,100%); height:20px; background:var(--ng-fundo-suave); border-radius:6px; }
    .esqueleto__grade { display:grid; grid-template-columns:2fr 1fr; gap:24px; }
    .esqueleto__card { height:240px; background:var(--ng-carregamento-fundo); border-radius:var(--ng-raio-card); }
    .estado { display:flex; flex-direction:column; align-items:center; gap:16px; padding-block:72px; text-align:center; }
    .estado>.ms { font-size:48px; color:var(--ng-verde-escuro); }
    h1 { font-size:28.8px; color:var(--ng-verde-escuro); }
    p { font-size:16px; color:var(--ng-texto-3); }
    .estado__acoes { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; }
    @keyframes avancar { from { transform:translateX(-100%); } to { transform:translateX(400%); } }
    @media(max-width:767px) { .esqueleto__grade { grid-template-columns:1fr; } .estado__acoes, .estado .ng-btn { width:100%; } }
    @media(prefers-reduced-motion:reduce) { .progresso span { animation:none; margin-inline:auto; } }
  `,
})
export class ProjetoEstadoComponent {
  readonly estado = input.required<EstadoConsultaProjeto>();
  readonly tentarNovamente = output<void>();
}
