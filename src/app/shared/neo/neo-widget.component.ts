import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { LIMITE_MENSAGEM, NeoStateService } from '../../core/neo/neo-state.service';
import { SUGESTOES_NEO } from '../../core/neo/neo.config';
import { NeoHistoricoComponent } from './neo-historico.component';
import { NeoMensagemComponent } from './neo-mensagem.component';

const LIMITE_CONTADOR = 400;

/**
 * Neo: botão flutuante e painel de conversa sobre a norma.
 * Montado uma vez no AppComponent. Só aparece com usuário autenticado.
 */
@Component({
  selector: 'app-neo-widget',
  standalone: true,
  imports: [NeoMensagemComponent, NeoHistoricoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './neo-widget.component.html',
  styleUrl: './neo-widget.component.scss',
  host: {
    '(document:keydown.escape)': 'aoEscape()',
  },
})
export class NeoWidgetComponent {
  readonly estado = inject(NeoStateService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly autenticado = this.auth.autenticado;
  readonly sugestoes = SUGESTOES_NEO;
  readonly limite = LIMITE_MENSAGEM;
  readonly limiteContador = LIMITE_CONTADOR;

  readonly rascunho = signal('');
  /** Abaixo de 600px o painel vira tela cheia (modal de verdade). */
  readonly mobile = signal(false);

  private readonly painel = viewChild<ElementRef<HTMLElement>>('painel');
  private readonly campo = viewChild<ElementRef<HTMLTextAreaElement>>('campo');
  private readonly lancador = viewChild<ElementRef<HTMLButtonElement>>('lancador');
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');

  readonly podeEnviar = computed(
    () => this.rascunho().trim().length > 0 && !this.estado.emAndamento() && this.rascunho().length <= LIMITE_MENSAGEM,
  );

  /** Sugestões aparecem no início da conversa e depois de uma resposta sem fonte; somem ao digitar. */
  readonly mostrarSugestoes = computed(() => {
    if (this.rascunho()) return false;
    const lista = this.estado.mensagens();
    return lista.length === 0 || lista[lista.length - 1].semFonte === true;
  });

  constructor() {
    const midia = window.matchMedia('(max-width: 599px)');
    this.mobile.set(midia.matches);
    const aoMudar = (evento: MediaQueryListEvent) => this.mobile.set(evento.matches);
    midia.addEventListener('change', aoMudar);
    this.destroyRef.onDestroy(() => midia.removeEventListener('change', aoMudar));

    // Rola para a última mensagem sempre que a conversa muda.
    effect(() => {
      this.estado.mensagens();
      this.estado.emAndamento();
      setTimeout(() => {
        const el = this.log()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  alternarPainel(): void {
    if (this.estado.painelVisivel()) this.minimizar();
    else this.abrir();
  }

  abrir(): void {
    this.estado.abrirPainel();
    setTimeout(() => this.campo()?.nativeElement.focus());
  }

  minimizar(): void {
    this.estado.minimizar();
    setTimeout(() => this.lancador()?.nativeElement.focus());
  }

  fechar(): void {
    this.estado.fechar();
    setTimeout(() => this.lancador()?.nativeElement.focus());
  }

  /** Esc minimiza o painel. Não faz nada se um diálogo (ex.: exclusão do histórico) estiver aberto. */
  aoEscape(): void {
    if (!this.estado.painelVisivel() || document.querySelector('dialog[open]')) return;
    this.minimizar();
  }

  aoDigitar(evento: Event): void {
    this.rascunho.set((evento.target as HTMLTextAreaElement).value);
  }

  aoTeclar(evento: KeyboardEvent): void {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      this.enviar();
    }
  }

  enviar(): void {
    if (!this.podeEnviar()) return;
    this.estado.enviar(this.rascunho());
    this.rascunho.set('');
  }

  sugerir(pergunta: string): void {
    this.estado.enviar(pergunta);
  }

  /** No mobile o painel é modal: Tab não sai dele. */
  aoTab(evento: KeyboardEvent): void {
    const painel = this.painel()?.nativeElement;
    if (evento.key !== 'Tab' || !this.mobile() || !painel) return;
    const focaveis = Array.from(painel.querySelectorAll<HTMLElement>('button:not([disabled]), textarea')).filter(
      (el) => el.offsetParent !== null,
    );
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }
}
