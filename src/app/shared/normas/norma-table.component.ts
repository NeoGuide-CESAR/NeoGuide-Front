import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';

import { normalizar } from '../../core/normas/conteudo-normas';
import { NormasService, TabelaNormaApi } from '../../core/normas/normas.service';
import { LinhaCatalogo, MODELOS, ModeloTabela } from '../../core/normas/tabelas-normas';
import { NeoStateService } from '../../core/neo/neo-state.service';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { NormaSectionCardComponent } from './norma-section-card.component';

/** Tabelas longas mostram só as primeiras linhas até o usuário pedir a tabela completa. */
const LINHAS_INICIAIS = 10;

/** Tabela de uma norma, com os dados do catálogo do back (nenhum valor fixo no código). */
@Component({
  selector: 'app-norma-table',
  standalone: true,
  imports: [NormaSectionCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './norma-table.component.html',
  styleUrl: './norma-table.component.scss',
})
export class NormaTableComponent implements OnInit {
  private readonly normas = inject(NormasService);
  private readonly snackbar = inject(SnackbarService);
  private readonly neo = inject(NeoStateService);

  readonly tabela = input.required<TabelaNormaApi>();
  readonly destacada = input(false);

  readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');
  readonly resposta = signal<unknown>(null);
  readonly filtro = signal('');
  readonly expandida = signal(false);

  readonly modelo = computed<ModeloTabela | null>(() => MODELOS[this.tabela().ancora] ?? null);
  readonly linhas = computed<LinhaCatalogo[]>(() => this.modelo()?.linhas(this.resposta()) ?? []);
  readonly colunas = computed(() => this.modelo()?.colunas ?? []);
  readonly rodape = computed(() => this.modelo()?.rodape?.(this.resposta()) ?? null);
  readonly referencia = computed(() => {
    const t = this.tabela();
    return t.paginaPdf ? `${t.referencia} · página ${t.paginaPdf} do PDF` : t.referencia;
  });

  /** Linhas que combinam com o filtro: texto em qualquer célula ou número dentro da faixa da linha. */
  readonly linhasFiltradas = computed(() => {
    const termo = normalizar(this.filtro().trim());
    const todas = this.linhas();
    if (!termo) return todas;
    const numero = Number(termo.replace(',', '.'));
    const modelo = this.modelo();
    return todas.filter((l, i) => {
      const noIntervalo = Number.isFinite(numero) && modelo?.intervalo ? this.contem(modelo.intervalo(l, i, todas), numero) : false;
      const texto = this.colunas().some(c => normalizar(c.valor(l, i, todas)).includes(termo));
      return noIntervalo || texto;
    });
  });
  readonly filtrando = computed(() => this.filtro().trim().length > 0);
  readonly visiveis = computed(() => {
    const l = this.linhasFiltradas();
    return this.expandida() || this.filtrando() || l.length <= LINHAS_INICIAIS ? l : l.slice(0, LINHAS_INICIAIS);
  });
  readonly temMais = computed(() => !this.filtrando() && this.linhas().length > LINHAS_INICIAIS);

  ngOnInit(): void { this.carregar(); }

  carregar(): void {
    const t = this.tabela();
    if (!t.disponivel || !t.endpointCatalogo) return;
    this.estado.set('carregando');
    this.normas.catalogo(t.endpointCatalogo).subscribe({
      next: r => { this.resposta.set(r); this.estado.set('ok'); },
      error: () => this.estado.set('erro'),
    });
  }

  /** Texto tabulado (cabeçalho e linhas visíveis ou filtradas), para colar em planilha. */
  copiar(): void {
    const todas = this.linhas();
    const cab = this.colunas().map(c => c.titulo).join('\t');
    const corpo = this.linhasFiltradas().map(l => this.colunas().map(c => c.valor(l, todas.indexOf(l), todas)).join('\t'));
    const texto = [cab, ...corpo].join('\n');
    const ok = () => this.snackbar.mostrar('Tabela copiada.');
    const falhou = () => this.snackbar.mostrar('Não foi possível copiar a tabela.');
    try {
      void navigator.clipboard.writeText(texto).then(ok, falhou);
    } catch {
      falhou();
    }
  }

  /** Abre o painel do Neo e já envia a pergunta sobre esta tabela. */
  perguntarAoNeo(): void {
    const nome = this.tabela().titulo.split(' · ')[0];
    this.neo.abrirPainel();
    this.neo.enviar(`Como a ${nome} é usada no cálculo?`);
  }

  valorDe(linha: LinhaCatalogo, coluna: { valor: (l: LinhaCatalogo, i: number, t: LinhaCatalogo[]) => string }): string {
    const todas = this.linhas();
    return coluna.valor(linha, todas.indexOf(linha), todas);
  }

  private contem(faixa: [number, number] | null, numero: number): boolean {
    return !!faixa && numero > faixa[0] - 1e-9 && numero <= faixa[1] + 1e-9;
  }
}
