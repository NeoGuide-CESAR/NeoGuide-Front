import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Projeto, STATUS_INFO, StatusProjeto } from '../../core/projetos/projeto.model';

export interface ItemBreadcrumb {
  rotulo: string;
  rota?: string;
}

type FiltroStatus = 'todos' | StatusProjeto;
type Ordenacao = 'recentes' | 'antigos' | 'az' | 'za';

const STATUS_FILTRAVEIS: StatusProjeto[] = ['rascunho', 'em_analise', 'aprovado', 'reprovado'];

const OPCOES_ORDENACAO: { valor: Ordenacao; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigos', rotulo: 'Mais antigos' },
  { valor: 'az', rotulo: 'Nome A–Z' },
  { valor: 'za', rotulo: 'Nome Z–A' },
];

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Corpo da página "Meus Projetos": busca, filtros, lista expansível e paginação (artboard Meus Projetos). */
@Component({
  selector: 'app-projetos-lista',
  standalone: true,
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projetos-lista.component.html',
  styleUrl: './projetos-lista.component.scss',
  host: {
    '(document:keydown.escape)': 'aoEscape()',
  },
})
export class ProjetosListaComponent {
  readonly projetos = input.required<Projeto[]>();
  readonly breadcrumb = input<ItemBreadcrumb[]>([{ rotulo: 'Início', rota: '/inicio' }, { rotulo: 'Meus Projetos' }]);
  readonly opcoesTamanhoPagina = input<number[]>([10, 20, 50]);
  readonly tamanhoPaginaInicial = input(10);

  readonly novoProjeto = output<void>();
  readonly abrirProjeto = output<string>();
  readonly duplicarProjeto = output<string>();
  readonly excluirProjeto = output<string>();

  readonly statusInfo = STATUS_INFO;
  readonly statusFiltraveis = STATUS_FILTRAVEIS;
  readonly ordens = OPCOES_ORDENACAO;

  readonly busca = signal('');
  readonly filtro = signal<FiltroStatus>('todos');
  readonly ordenacao = signal<Ordenacao>('recentes');
  readonly tamanhoPagina = signal(this.tamanhoPaginaInicial());
  readonly paginaAtual = signal(1);
  readonly expandidoId = signal<string | null>(null);
  readonly paraExcluir = signal<Projeto | null>(null);

  readonly contagens = computed(() => {
    const base: Record<FiltroStatus, number> = { todos: 0, rascunho: 0, em_analise: 0, aprovado: 0, reprovado: 0 };
    for (const p of this.projetos()) {
      base[p.status]++;
      base.todos++;
    }
    return base;
  });

  readonly filtrados = computed(() => {
    const termo = normalizar(this.busca().trim());
    const filtro = this.filtro();
    return this.projetos().filter((p) => {
      if (filtro !== 'todos' && p.status !== filtro) return false;
      if (!termo) return true;
      return normalizar(p.nome).includes(termo) || normalizar(p.endereco ?? '').includes(termo);
    });
  });

  readonly ordenados = computed(() => {
    const lista = [...this.filtrados()];
    switch (this.ordenacao()) {
      case 'antigos':
        return lista.sort((a, b) => a.atualizadoEm.localeCompare(b.atualizadoEm));
      case 'az':
        return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      case 'za':
        return lista.sort((a, b) => b.nome.localeCompare(a.nome, 'pt-BR'));
      default:
        return lista.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
    }
  });

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.ordenados().length / this.tamanhoPagina())));
  readonly paginaExibida = computed(() => Math.min(this.paginaAtual(), this.totalPaginas()));

  readonly paginados = computed(() => {
    const inicio = (this.paginaExibida() - 1) * this.tamanhoPagina();
    return this.ordenados().slice(inicio, inicio + this.tamanhoPagina());
  });

  readonly intervaloExibido = computed(() => {
    const total = this.ordenados().length;
    if (!total) return { inicio: 0, fim: 0, total: 0 };
    const inicio = (this.paginaExibida() - 1) * this.tamanhoPagina() + 1;
    return { inicio, fim: Math.min(inicio + this.tamanhoPagina() - 1, total), total };
  });

  readonly paginasVisiveis = computed(() => {
    const total = this.totalPaginas();
    const atual = this.paginaExibida();
    const inicio = Math.max(1, Math.min(atual - 1, total - 2));
    const fim = Math.min(total, Math.max(atual + 1, 3));
    const paginas: number[] = [];
    for (let i = inicio; i <= fim; i++) paginas.push(i);
    return paginas;
  });

  constructor() {
    effect(
      () => {
        this.busca();
        this.filtro();
        this.paginaAtual.set(1);
      },
      { allowSignalWrites: true },
    );
  }

  buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  selecionarFiltro(valor: FiltroStatus): void {
    this.filtro.set(valor);
  }

  mudarOrdenacao(evento: Event): void {
    this.ordenacao.set((evento.target as HTMLSelectElement).value as Ordenacao);
  }

  mudarTamanhoPagina(evento: Event): void {
    this.tamanhoPagina.set(Number((evento.target as HTMLSelectElement).value));
    this.paginaAtual.set(1);
  }

  irParaPagina(pagina: number): void {
    this.paginaAtual.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  alternarExpandido(id: string): void {
    this.expandidoId.update((atual) => (atual === id ? null : id));
  }

  limparFiltros(): void {
    this.busca.set('');
    this.filtro.set('todos');
  }

  pedirExclusao(evento: Event, projeto: Projeto): void {
    evento.stopPropagation();
    this.paraExcluir.set(projeto);
  }

  cancelarExclusao(): void {
    this.paraExcluir.set(null);
  }

  confirmarExclusao(): void {
    const projeto = this.paraExcluir();
    if (projeto) this.excluirProjeto.emit(projeto.id);
    this.paraExcluir.set(null);
  }

  aoEscape(): void {
    if (this.paraExcluir()) this.cancelarExclusao();
  }
}
