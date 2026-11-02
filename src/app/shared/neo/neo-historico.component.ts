import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ConversaResumo } from '../../core/neo/neo.model';
import { NeoStateService } from '../../core/neo/neo-state.service';
import { ProjetosService } from '../../core/projetos/projetos.service';

interface GrupoConversas {
  rotulo: string;
  itens: ConversaResumo[];
}

const DIA = 86_400_000;

function inicioDoDia(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
}

/** Agrupa por Hoje, Ontem, Últimos 7 dias e Mais antigas, na ordem em que os grupos aparecem. */
export function agruparConversas(conversas: ConversaResumo[], agora = new Date()): GrupoConversas[] {
  const hoje = inicioDoDia(agora);
  const grupos: Record<string, ConversaResumo[]> = { Hoje: [], Ontem: [], 'Últimos 7 dias': [], 'Mais antigas': [] };
  for (const c of conversas) {
    const dias = Math.round((hoje - inicioDoDia(new Date(c.atualizadaEm))) / DIA);
    const rotulo = dias <= 0 ? 'Hoje' : dias === 1 ? 'Ontem' : dias <= 7 ? 'Últimos 7 dias' : 'Mais antigas';
    grupos[rotulo].push(c);
  }
  return Object.entries(grupos)
    .filter(([, itens]) => itens.length > 0)
    .map(([rotulo, itens]) => ({ rotulo, itens }));
}

/** Histórico de conversas no lugar das mensagens do chat. Os dados vêm do back-end via NeoStateService. */
@Component({
  selector: 'app-neo-historico',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="historico" aria-labelledby="titulo-historico">
      <div class="topo">
        <h3 id="titulo-historico">Histórico</h3>
        <button type="button" class="botao" (click)="voltar.emit()">VOLTAR</button>
      </div>

      @if (!carregando() && !grupos().length) {
        <div class="vazio">
          <p class="vazio__titulo">Nenhuma conversa salva ainda.</p>
          <p>Suas perguntas aparecem aqui depois da primeira resposta.</p>
        </div>
      }

      @for (grupo of grupos(); track grupo.rotulo) {
        <h4 class="grupo">{{ grupo.rotulo }}</h4>
        <ul class="lista">
          @for (c of grupo.itens; track c.id) {
            <li class="item">
              <button type="button" class="item__abrir" (click)="abrir(c.id)">
                <span class="item__titulo">{{ c.titulo }}</span>
                <span class="item__meta">
                  {{ c.atualizadaEm | date: 'dd/MM/yyyy' }}
                  @if (nomeProjeto(c.projetoId); as nome) { · {{ nome }} }
                </span>
              </button>
              <button type="button" class="excluir" [attr.aria-label]="'Excluir a conversa ' + c.titulo" (click)="pedirExclusao(c)">
                <span class="ms" aria-hidden="true">delete</span>
              </button>
            </li>
          }
        </ul>
      }

      <dialog #dialogo class="dialogo" aria-labelledby="titulo-exclusao-neo">
        <div class="dialogo__corpo">
          <h4 id="titulo-exclusao-neo">Excluir conversa?</h4>
          <p>Esta ação não pode ser desfeita.</p>
          <div class="dialogo__acoes">
            <button type="button" class="botao" (click)="fecharDialogo()">CANCELAR</button>
            <button type="button" class="botao botao--perigo" (click)="confirmarExclusao()">EXCLUIR</button>
          </div>
        </div>
      </dialog>
    </section>
  `,
  styles: `
    :host { display: flex; flex: 1; min-height: 0; }
    .historico { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .topo { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    h3 { font-size: 16px; font-weight: 700; color: var(--ng-verde-escuro); }
    h4.grupo { margin-top: 8px; font-size: 12px; font-weight: 500; text-transform: uppercase; color: var(--ng-texto-3); }
    p { font-size: 14px; color: var(--ng-texto); }
    .vazio { text-align: center; padding: 32px 8px; display: flex; flex-direction: column; gap: 4px; }
    .vazio__titulo { font-weight: 700; color: var(--ng-texto-3); }

    .botao {
      min-height: 36px; padding: 0 16px;
      border: 1px solid var(--ng-verde-escuro);
      border-radius: var(--ng-raio-pill);
      background: transparent;
      color: var(--ng-verde-escuro);
      font: 500 13px var(--ng-fonte);
      text-transform: uppercase;
      cursor: pointer;
      &:focus-visible { outline: 3px solid var(--ng-link); outline-offset: 2px; }
    }
    .botao--perigo { background: var(--ng-danger); border-color: var(--ng-danger); color: var(--ng-branco); }

    .lista { display: flex; flex-direction: column; gap: 6px; }
    .item { display: flex; align-items: center; gap: 4px; }
    .item__abrir {
      flex: 1; min-width: 0; padding: 10px 12px;
      display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
      border: 1px solid var(--ng-borda); border-radius: var(--ng-raio-card);
      background: var(--ng-branco); text-align: left; cursor: pointer;
      &:focus-visible { outline: 3px solid var(--ng-link); outline-offset: 2px; }
    }
    .item__titulo { font-size: 14px; font-weight: 500; color: var(--ng-texto); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .item__meta { font-size: 12px; color: var(--ng-texto-3); }
    .excluir {
      width: 40px; height: 40px; flex-shrink: 0;
      border: 0; border-radius: 50%; background: transparent; color: var(--ng-danger); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      &:hover { background: var(--ng-fundo-suave); }
      &:focus-visible { outline: 3px solid var(--ng-link); outline-offset: 1px; }
    }

    .dialogo {
      width: min(320px, calc(100vw - 32px));
      padding: 0; border: 1px solid var(--ng-borda); border-radius: var(--ng-raio-card);
      color: var(--ng-texto); background: var(--ng-branco); box-shadow: none;
      &::backdrop { background: var(--ng-fundo-modal); }
    }
    .dialogo__corpo { padding: 24px; display: flex; flex-direction: column; gap: 8px; }
    .dialogo__acoes { margin-top: 12px; display: flex; justify-content: flex-end; gap: 12px; }
  `,
})
export class NeoHistoricoComponent {
  private readonly estado = inject(NeoStateService);
  private readonly projetos = inject(ProjetosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  readonly voltar = output<void>();

  readonly carregando = signal(true);
  readonly grupos = signal<GrupoConversas[]>([]);
  private paraExcluir: ConversaResumo | null = null;

  constructor() {
    this.carregar();
  }

  nomeProjeto(id?: string): string | null {
    if (!id) return null;
    return this.projetos.projetos().find((p) => p.id === id)?.nome ?? null;
  }

  abrir(id: string): void {
    this.estado.carregarConversa(id);
  }

  pedirExclusao(conversa: ConversaResumo): void {
    this.paraExcluir = conversa;
    this.dialogo().nativeElement.showModal();
  }

  fecharDialogo(): void {
    this.dialogo().nativeElement.close();
  }

  confirmarExclusao(): void {
    const conversa = this.paraExcluir;
    this.fecharDialogo();
    if (!conversa) return;
    this.estado
      .excluirConversa(conversa.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.carregar());
  }

  private carregar(): void {
    this.carregando.set(true);
    this.estado
      .listarConversas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lista) => {
        this.grupos.set(agruparConversas(lista));
        this.carregando.set(false);
      });
  }
}
