import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, filter, finalize, tap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { ProjetosService } from '../projetos/projetos.service';
import { ContextoProjeto, ConversaResumo, Mensagem, AutorMensagem } from './neo.model';
import { NeoService } from './neo.service';

/** Limite de caracteres por pergunta. */
export const LIMITE_MENSAGEM = 500;

/**
 * Estado do Neo (global, único na aplicação).
 * O painel e o botão flutuante leem daqui, então badge e painel ficam sincronizados.
 * Nada é gravado em localStorage: o histórico vem do back-end.
 */
@Injectable({ providedIn: 'root' })
export class NeoStateService {
  private readonly neo = inject(NeoService);
  private readonly auth = inject(AuthService);
  private readonly projetos = inject(ProjetosService);
  private readonly router = inject(Router);

  readonly painelVisivel = signal(false);
  readonly visao = signal<'chat' | 'historico'>('chat');
  readonly mensagens = signal<Mensagem[]>([]);
  readonly emAndamento = signal(false);
  readonly naoLidas = signal(0);
  readonly conversaId = signal<string | null>(null);

  /** Projeto da rota atual (só em /projetos/:id). */
  readonly contextoAtual = signal<ContextoProjeto | null>(null);
  private readonly contextoRemovido = signal(false);
  /** Projeto que vai junto nas perguntas; null quando o usuário removeu o contexto. */
  readonly contextoAtivo = computed(() => (this.contextoRemovido() ? null : this.contextoAtual()));
  /** Há projeto na página, mas o usuário tirou o contexto dele. */
  readonly contextoRemovidoVisivel = computed(() => this.contextoRemovido() && this.contextoAtual() !== null);

  private ultimoEnvio: string | null = null;
  private conversaPendente: string | null = null;
  private contadorIds = 0;

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.aoNavegar(e.urlAfterRedirects));
    this.aoNavegar(this.router.url);

    // Sessão expirada: fecha o painel e tira a conversa da tela. Ao logar de novo, reabre a última.
    effect(
      () => {
        if (!this.auth.autenticado()) {
          untracked(() => this.encerrarSessao());
          return;
        }
        const pendente = untracked(() => this.conversaPendente);
        if (pendente) {
          untracked(() => {
            this.conversaPendente = null;
            this.carregarConversa(pendente);
          });
        }
      },
      { allowSignalWrites: true },
    );
  }

  abrirPainel(): void {
    this.painelVisivel.set(true);
    this.naoLidas.set(0);
  }

  /** Minimiza: o painel some, mas a conversa e o rascunho continuam. */
  minimizar(): void {
    this.painelVisivel.set(false);
  }

  fechar(): void {
    this.painelVisivel.set(false);
    this.visao.set('chat');
  }

  abrirHistorico(): void {
    this.visao.set('historico');
  }

  voltarAoChat(): void {
    this.visao.set('chat');
  }

  removerContexto(): void {
    this.contextoRemovido.set(true);
  }

  restaurarContexto(): void {
    this.contextoRemovido.set(false);
  }

  /** Envia a pergunta como se o usuário tivesse digitado. */
  enviar(texto: string): void {
    const pergunta = texto.trim();
    if (!pergunta || this.emAndamento() || pergunta.length > LIMITE_MENSAGEM) return;
    this.mensagens.update((lista) => [...lista, this.criarMensagem('usuario', pergunta)]);
    this.chamarNeo(pergunta);
  }

  /** Repete a última pergunta que falhou, sem duplicar a mensagem do usuário. */
  tentarNovamente(): void {
    if (!this.ultimoEnvio || this.emAndamento()) return;
    this.mensagens.update((lista) => lista.filter((m) => !m.falhou));
    this.chamarNeo(this.ultimoEnvio);
  }

  carregarConversa(id: string): void {
    this.neo.abrirConversa(id).subscribe({
      next: (conversa) => {
        this.conversaId.set(conversa.id);
        this.mensagens.set(conversa.mensagens);
        this.visao.set('chat');
      },
      error: () => this.mensagens.update((lista) => [...lista, this.criarMensagem('sistema', 'Não foi possível abrir essa conversa.')]),
    });
  }

  listarConversas(): Observable<ConversaResumo[]> {
    return this.neo.listarConversas();
  }

  /** Exclui no back-end; se for a conversa aberta, limpa a tela. */
  excluirConversa(id: string): Observable<void> {
    return this.neo.excluirConversa(id).pipe(
      tap(() => {
        if (this.conversaId() === id) this.novaConversa();
      }),
    );
  }

  novaConversa(): void {
    this.conversaId.set(null);
    this.mensagens.set([]);
    this.ultimoEnvio = null;
  }

  /** Troca de página: atualiza o contexto e, se mudou de projeto, avisa na conversa. */
  aoNavegar(url: string): void {
    const id = /^\/projetos\/([^/?#]+)/.exec(url)?.[1];
    const projeto = id && id !== 'novo' ? this.projetos.projetos().find((p) => p.id === id) : undefined;
    const novo: ContextoProjeto | null = projeto
      ? { id: projeto.id, nome: projeto.nome, etapaAtual: projeto.etapaAtual, totalEtapas: projeto.totalEtapas }
      : null;

    const anterior = this.contextoAtual();
    if (novo?.id === anterior?.id) return;

    this.contextoAtual.set(novo);
    this.contextoRemovido.set(false);
    if (anterior && novo) {
      this.mensagens.update((lista) => [...lista, this.criarMensagem('sistema', `Contexto alterado para ${novo.nome}.`)]);
    }
  }

  private chamarNeo(pergunta: string): void {
    this.ultimoEnvio = pergunta;
    this.emAndamento.set(true);
    this.neo
      .enviarMensagem({ mensagem: pergunta, conversaId: this.conversaId() ?? undefined, projetoId: this.contextoAtivo()?.id })
      .pipe(finalize(() => this.emAndamento.set(false)))
      .subscribe({
        next: (resposta) => {
          this.conversaId.set(resposta.conversaId);
          this.mensagens.update((lista) => [
            ...lista,
            { ...this.criarMensagem('neo', resposta.resposta), fontes: resposta.fontes, semFonte: resposta.semFonte },
          ]);
          if (!this.painelVisivel()) this.naoLidas.update((n) => n + 1);
        },
        error: () => {
          this.mensagens.update((lista) => [...lista, { ...this.criarMensagem('neo', ''), falhou: true }]);
        },
      });
  }

  private encerrarSessao(): void {
    this.conversaPendente = this.conversaId();
    this.painelVisivel.set(false);
    this.visao.set('chat');
    this.emAndamento.set(false);
    this.naoLidas.set(0);
    this.mensagens.set([]);
    this.conversaId.set(null);
    this.ultimoEnvio = null;
  }

  private criarMensagem(autor: AutorMensagem, texto: string): Mensagem {
    return { id: `local-${++this.contadorIds}`, autor, texto };
  }
}
