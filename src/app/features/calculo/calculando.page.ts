import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, timeout, timer } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { lerProblema } from '../../core/calculo/calculo.api';
import { CalculoService } from '../../core/calculo/calculo.service';
import { ProjetosService } from '../../core/projetos/projetos.service';
import { LINKS_PRINCIPAIS } from '../../shared/layout/links-principais';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { SiteHeaderComponent } from '../../shared/layout/site-header.component';

/** Tempo mínimo na tela, para não piscar quando o back responde rápido. */
const MINIMO_MS = 600;
/** Sem resposta depois disso, a tela mostra o erro com a opção de tentar de novo. */
const LIMITE_MS = 30000;

export const MENSAGEM_SAIDA = 'O cálculo ainda está em andamento. Sair mesmo assim?';

/**
 * Tela de carregamento do cálculo. Chama POST /calcular uma única vez (o serviço reaproveita a chamada em andamento)
 * e, com o 200, abre o resultado trocando a rota no histórico.
 */
@Component({
  selector: 'app-calculando-page',
  standalone: true,
  imports: [RouterLink, SiteHeaderComponent, SiteFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'aoFechar($event)' },
  styleUrls: ['./calculo-paginas.scss'],
  styles: [`
    .centro { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 420px; text-align: center; }
    .icone { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; margin-bottom: 8px; border-radius: 50%; background: var(--ng-verde-menta); color: var(--ng-verde-escuro); }
    .icone--erro { background: var(--ng-danger-fundo); color: var(--ng-danger); }
    .icone .ms { font-size: 24px; }
    h2 { margin: 0; font-size: 22px; font-weight: 700; color: var(--ng-verde-profundo); outline: none; }
    .texto { margin: 0; font-size: 13px; color: var(--ng-texto-3); }
    .barra { position: relative; width: 300px; max-width: calc(100% - 48px); height: 3px; margin-top: 8px; overflow: hidden; border-radius: var(--ng-raio-pill); background: var(--ng-verde-menta); }
    .barra span { position: absolute; top: 0; left: 0; width: 40%; height: 100%; background: var(--ng-verde-escuro); border-radius: var(--ng-raio-pill); animation: deslizar 1.4s ease-in-out infinite; }
    @keyframes deslizar { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
    @media (prefers-reduced-motion: reduce) { .barra span { left: 30%; animation: pulsar 1.4s ease-in-out infinite; } @keyframes pulsar { 50% { opacity: .35; } } }
    .acoes { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 16px; }
  `],
  template: `
    <app-site-header [links]="links"><a class="usuario" routerLink="/perfil"><span class="ms" aria-hidden="true">account_circle</span>{{ auth.usuario()?.nome || 'Meu perfil' }}<span class="ms" aria-hidden="true">expand_more</span></a></app-site-header>
    <main class="conteudo">
      @if (estado() === 'calculando') {
        <section class="centro" role="status" aria-live="polite">
          <span class="icone" aria-hidden="true"><span class="ms">bolt</span></span>
          <h2 #titulo tabindex="-1">Calculando a demanda do seu projeto</h2>
          <p class="texto">{{ nomeProjeto() ? nomeProjeto() + ' · ' : '' }}isso pode levar alguns segundos. Não feche esta página.</p>
          <div class="barra" role="progressbar" aria-label="Cálculo em andamento"><span></span></div>
        </section>
      } @else {
        <section class="centro" role="alert">
          <span class="icone icone--erro" aria-hidden="true"><span class="ms">error_outline</span></span>
          <h2 #titulo tabindex="-1">Não foi possível calcular agora</h2>
          <p class="texto">Seus dados estão salvos. Verifique sua conexão e tente novamente.</p>
          <div class="acoes">
            <button type="button" class="btn btn--contorno" (click)="voltarParaRevisao()">Voltar para a revisão</button>
            <button type="button" class="btn btn--primario" (click)="iniciar()">Tentar novamente</button>
          </div>
        </section>
      }
    </main>
    <app-site-footer />
  `,
})
export class CalculandoPage implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly calculo = inject(CalculoService);
  private readonly projetos = inject(ProjetosService);
  readonly auth = inject(AuthService);

  readonly id = input.required<string>();
  readonly links = LINKS_PRINCIPAIS;
  readonly estado = signal<'calculando' | 'erro'>('calculando');
  readonly nomeProjeto = signal('');
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');
  private emAndamento = false;

  ngOnInit(): void {
    this.projetos.buscar(this.id()).subscribe({ next: p => this.nomeProjeto.set(p.dados.nome), error: () => undefined });
    this.iniciar();
  }

  ngAfterViewInit(): void { this.titulo()?.nativeElement.focus(); }

  iniciar(): void {
    this.estado.set('calculando');
    this.emAndamento = true;
    forkJoin([this.calculo.calcular(this.id()).pipe(timeout(LIMITE_MS)), timer(MINIMO_MS)]).subscribe({
      next: ([resultado]) => {
        this.emAndamento = false;
        if (resultado.situacaoCalculo === 'CALCULADO') {
          void this.router.navigate(['/projetos', this.id(), 'resultado'], { replaceUrl: true });
        } else {
          this.estado.set('erro');
        }
      },
      error: (erro: unknown) => {
        this.emAndamento = false;
        const problema = lerProblema(erro);
        // 401: o interceptor já levou ao Estado B. 422: a Revisão mostra o campo e a regra violada.
        if (problema.status === 401) return;
        if (problema.status === 422) this.voltarParaRevisao();
        else this.estado.set('erro');
      },
    });
  }

  voltarParaRevisao(): void {
    void this.router.navigate(['/projetos', this.id(), 'revisao'], { replaceUrl: true });
  }

  /** Usado pelo guard de saída da rota. */
  podeSair(): boolean {
    return !this.emAndamento || window.confirm(MENSAGEM_SAIDA);
  }

  aoFechar(evento: BeforeUnloadEvent): void {
    if (this.emAndamento) evento.preventDefault();
  }
}
