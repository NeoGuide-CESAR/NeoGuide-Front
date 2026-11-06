import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toObservable, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, Subject, switchMap, tap } from 'rxjs';

import {
  FiltroStatus,
  OrdemProjetos,
  ParametrosListagem,
  ResultadoListagem,
  TAMANHOS_PAGINA,
  lerParametros,
  paraQueryParams,
} from '../../core/projetos/listagem';
import { Projeto, STATUS_INFO, StatusProjeto } from '../../core/projetos/projeto.model';
import { ProjetosService } from '../../core/projetos/projetos.service';
import { DuplicarProjetoService } from '../../core/projetos/duplicar-projeto.service';
import { ProjetosApiService } from '../../core/projetos/projetos-api.service';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { LinkNav, SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { SnackbarComponent } from '../../shared/ui/snackbar.component';

const CHIPS: { valor: FiltroStatus; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'em_analise', rotulo: 'Em análise' },
  { valor: 'aprovado', rotulo: 'Aprovado' },
  { valor: 'reprovado', rotulo: 'Reprovado' },
];

/** Complemento do título do estado D: "Nenhum projeto reprovado", "Nenhum projeto em análise". */
const COMPLEMENTO_STATUS: Record<StatusProjeto, string> = {
  rascunho: 'em rascunho',
  em_analise: 'em análise',
  aprovado: 'aprovado',
  reprovado: 'reprovado',
};

const OPCOES_ORDEM: { valor: OrdemProjetos; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigos', rotulo: 'Mais antigos' },
  { valor: 'az', rotulo: 'Nome (A–Z)' },
];

const DEBOUNCE_BUSCA = 300;

/**
 * Página "Meus Projetos": dono do estado (URL), das chamadas à listagem e das ações.
 * Busca, status, ordenação e página ficam na query string, então recarregar ou compartilhar mantém a tela.
 */
@Component({
  selector: 'app-meus-projetos-page',
  standalone: true,
  imports: [DatePipe, RouterLink, SiteHeaderComponent, SiteFooterComponent, SnackbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meus-projetos.page.html',
  styleUrl: './meus-projetos.page.scss',
  host: {
    'class': 'us13',
    '(document:keydown.escape)': 'expandidoId.set(null)',
  },
})
export class MeusProjetosPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly projetos = inject(ProjetosService);
  readonly duplicacao = inject(DuplicarProjetoService);
  private readonly api = inject(ProjetosApiService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialogoExclusao = viewChild.required<ElementRef<HTMLDialogElement>>('dialogoExclusao');

  readonly links: LinkNav[] = [
    { rotulo: 'Início', rota: '/inicio' },
    { rotulo: 'Meus Projetos', rota: '/meus-projetos' },
    { rotulo: 'Cálculo de Demanda', href: '#', submenu: true },
    { rotulo: 'Documentos', href: '#' },
  ];

  readonly chips = CHIPS;
  readonly ordens = OPCOES_ORDEM;
  readonly tamanhos = TAMANHOS_PAGINA;
  readonly statusInfo = STATUS_INFO;
  readonly esqueleto = [1, 2, 3];

  /** Estado da URL: fonte única para filtros, ordenação e página. */
  readonly parametros = toSignal(this.route.queryParamMap.pipe(map(lerParametros)), { requireSync: true });

  /** Incrementado para recarregar a listagem sem mudar a URL (após excluir, duplicar ou tentar de novo). */
  private readonly versao = signal(0);
  readonly carregando = signal(true);
  readonly erro = signal(false);

  /** Valor do campo de busca; a URL só recebe o termo depois do debounce. */
  readonly buscaDigitada = signal(this.parametros().busca);
  private readonly buscaDebounced = new Subject<string>();

  readonly expandidoId = signal<string | null>(null);
  readonly paraExcluir = signal<Projeto | null>(null);

  private readonly resultadoStream = combineLatest([toObservable(this.parametros), toObservable(this.versao)]).pipe(
    tap(() => {
      this.carregando.set(true);
      this.erro.set(false);
      this.expandidoId.set(null);
    }),
    switchMap(([parametros]) =>
      this.projetos.listar(parametros).pipe(
        catchError(() => {
          this.erro.set(true);
          return of(null);
        }),
      ),
    ),
    tap(() => this.carregando.set(false)),
  );

  readonly resultado = toSignal<ResultadoListagem | null, ResultadoListagem | null>(this.resultadoStream, { initialValue: null });

  readonly intervalo = computed(() => {
    const r = this.resultado();
    const tamanho = this.parametros().tamanho;
    if (!r || !r.total) return { inicio: 0, fim: 0, total: 0 };
    const inicio = (r.pagina - 1) * tamanho + 1;
    return { inicio, fim: Math.min(inicio + tamanho - 1, r.total), total: r.total };
  });

  readonly paginasVisiveis = computed(() => {
    const r = this.resultado();
    if (!r) return [];
    const inicio = Math.max(1, Math.min(r.pagina - 1, r.totalPaginas - 2));
    const fim = Math.min(r.totalPaginas, Math.max(r.pagina + 1, 3));
    const paginas: number[] = [];
    for (let i = inicio; i <= fim; i++) paginas.push(i);
    return paginas;
  });

  /** Título do estado D: usa o termo buscado ou o status selecionado. */
  readonly tituloVazio = computed(() => {
    const { busca, status } = this.parametros();
    if (busca.trim()) return `Nenhum resultado para “${busca.trim()}”`;
    return status === 'todos' ? 'Nenhum projeto encontrado' : `Nenhum projeto ${COMPLEMENTO_STATUS[status]}`;
  });

  constructor() {
    this.buscaDebounced
      .pipe(debounceTime(DEBOUNCE_BUSCA), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((busca) => this.atualizarUrl({ ...this.parametros(), busca, pagina: 1 }));
  }

  novoProjeto(): void {
    void this.router.navigate(['/projetos', 'novo', 'calculo']);
  }

  abrirProjeto(id: string): void {
    void this.router.navigate(['/projetos', id]);
  }

  tentarNovamente(): void {
    this.versao.update((v) => v + 1);
  }

  voltar(): void {
    // Angular grava navigationId no history.state; se for maior que 1, há uma página anterior do próprio app.
    const temAnterior = Number(history.state?.navigationId ?? 0) > 1;
    if (temAnterior) history.back();
    else void this.router.navigate(['/inicio']);
  }

  buscar(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.buscaDigitada.set(valor);
    this.buscaDebounced.next(valor);
  }

  selecionarStatus(status: FiltroStatus): void {
    this.atualizarUrl({ ...this.parametros(), status, pagina: 1 });
  }

  mudarOrdem(evento: Event): void {
    this.atualizarUrl({ ...this.parametros(), ordem: (evento.target as HTMLSelectElement).value as OrdemProjetos, pagina: 1 });
  }

  mudarTamanho(evento: Event): void {
    this.atualizarUrl({ ...this.parametros(), tamanho: Number((evento.target as HTMLSelectElement).value), pagina: 1 });
  }

  irParaPagina(pagina: number): void {
    const total = this.resultado()?.totalPaginas ?? 1;
    this.atualizarUrl({ ...this.parametros(), pagina: Math.min(Math.max(1, pagina), total) });
  }

  limparFiltros(): void {
    this.buscaDigitada.set('');
    this.atualizarUrl({ ...this.parametros(), busca: '', status: 'todos', pagina: 1 });
  }

  alternarExpandido(id: string): void {
    this.expandidoId.update((atual) => (atual === id ? null : id));
  }


  pedirExclusao(projeto: Projeto): void {
    this.paraExcluir.set(projeto);
    this.dialogoExclusao().nativeElement.showModal();
  }

  cancelarExclusao(): void {
    this.dialogoExclusao().nativeElement.close();
  }

  /** Disparado pelo evento `close` do <dialog> (botões, ESC ou clique no fundo). */
  aoFecharExclusao(): void {
    this.paraExcluir.set(null);
  }

  cliqueNoFundoExclusao(evento: MouseEvent): void {
    if (evento.target === this.dialogoExclusao().nativeElement) this.cancelarExclusao();
  }

  confirmarExclusao(): void {
    const projeto = this.paraExcluir();
    this.cancelarExclusao();
    if (!projeto) return;
    this.api.excluir(projeto.id).subscribe({
      next: () => { this.versao.update(v => v + 1); this.snackbar.mostrar('Projeto excluído.'); },
      error: () => this.snackbar.mostrar('Não foi possível excluir o projeto. Tente novamente.'),
    });
  }

  /** Mantém a busca digitada e a URL sincronizadas, sem perder o foco do campo. */
  private atualizarUrl(parametros: ParametrosListagem): void {
    const queryParams: Params = paraQueryParams(parametros);
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }
}
