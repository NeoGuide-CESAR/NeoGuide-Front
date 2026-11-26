import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, forkJoin } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { soData } from '../../core/calculo/formatos';
import {
  AVISO_RESPONSABILIDADE, CODIGO_EXIBIDO, CodigoNorma, FORMULA_GERAL, GLOSSARIO, NORMAS_COMPLEMENTARES, PARCELAS_030,
  REGRAS_053, VISAO_GERAL, codigoValido, normalizar,
} from '../../core/normas/conteudo-normas';
import { NormaApi, NormasService, PremissaApi, TabelaNormaApi } from '../../core/normas/normas.service';
import { MODELOS } from '../../core/normas/tabelas-normas';
import { AlertBannerComponent } from '../../shared/calculo/alert-banner.component';
import { SkeletonComponent } from '../../shared/calculo/skeleton.component';
import { LINKS_PRINCIPAIS } from '../../shared/layout/links-principais';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { NormaSectionCardComponent } from '../../shared/normas/norma-section-card.component';
import { NormaTableComponent } from '../../shared/normas/norma-table.component';
import { PremissaBadgeComponent } from '../../shared/normas/premissa-badge.component';
import { RegraCardComponent } from '../../shared/normas/regra-card.component';
import { SnackbarComponent } from '../../shared/ui/snackbar.component';

const ATRASO_BUSCA_MS = 300;
const DURACAO_DESTAQUE_MS = 2000;

interface Secao { id: string; rotulo: string; grupo: string; texto: string; }
interface GrupoIndice { titulo: string; itens: Secao[]; }

/** Página "Normas técnicas": normas vigentes, regras, tabelas do catálogo do back e premissas do projeto. */
@Component({
  selector: 'app-normas-page',
  standalone: true,
  imports: [RouterLink, SiteHeaderComponent, SiteFooterComponent, NormaSectionCardComponent, RegraCardComponent, NormaTableComponent, PremissaBadgeComponent, SkeletonComponent, SnackbarComponent, AlertBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './normas.page.html',
  styleUrls: ['../calculo/calculo-paginas.scss', './normas.page.scss'],
})
export class NormasPage implements OnDestroy {
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly servico = inject(NormasService);
  readonly auth = inject(AuthService);

  /** Código da URL (/normas/:codigo). Sem ele (/normas), abre a DIS-NOR-053 e mostra as normas complementares. */
  readonly codigo = input<string>();
  readonly links = LINKS_PRINCIPAIS;
  readonly soData = soData;
  readonly aviso = AVISO_RESPONSABILIDADE;
  readonly formulaGeral = FORMULA_GERAL;
  readonly regras053 = REGRAS_053;
  readonly parcelas030 = PARCELAS_030;
  readonly glossario = GLOSSARIO;
  readonly complementares = NORMAS_COMPLEMENTARES;

  private readonly fragmento = toSignal(this.rota.fragment, { initialValue: null });
  readonly cod = computed<CodigoNorma>(() => codigoValido(this.codigo()));
  readonly emBase = computed(() => !this.codigo());
  readonly visao = computed(() => VISAO_GERAL[this.cod()]);

  readonly normas = signal<NormaApi[]>([]);
  readonly premissas = signal<PremissaApi[]>([]);
  readonly tabelas = signal<TabelaNormaApi[]>([]);
  readonly estadoBase = signal<'carregando' | 'ok' | 'erro'>('carregando');
  readonly estadoTabelas = signal<'carregando' | 'ok' | 'erro'>('carregando');
  readonly estado = computed(() => {
    if (this.estadoBase() === 'erro' || this.estadoTabelas() === 'erro') return 'erro';
    return this.estadoBase() === 'ok' && this.estadoTabelas() === 'ok' ? 'ok' : 'carregando';
  });

  readonly busca = signal('');
  readonly termo = signal('');
  private readonly digitacao = new Subject<string>();
  readonly destacada = signal<string | null>(null);
  readonly ativo = signal<string>('visao-geral');
  readonly indiceAberto = signal(false);
  private observador: IntersectionObserver | null = null;
  private temporizadorDestaque: ReturnType<typeof setTimeout> | null = null;

  readonly norma = computed(() => this.normas().find(n => n.codigo.toLowerCase() === this.cod()) ?? null);
  readonly normasOrdenadas = computed(() => [...this.normas()].sort((a, b) => (a.papel === b.papel ? 0 : a.papel === 'PRINCIPAL' ? -1 : 1)));
  readonly aprovacao = computed(() => this.norma()?.dataAprovacao ? soData(this.norma()!.dataAprovacao) : null);

  /** Todas as seções da norma escolhida, na ordem da página, com o texto usado pela busca. */
  readonly secoes = computed<Secao[]>(() => {
    const v = this.visao();
    const lista: Secao[] = [
      { id: 'visao-geral', rotulo: 'Visão geral', grupo: 'Geral', texto: `${v.titulo} ${v.paragrafos.join(' ')} ${this.aviso} documento oficial` },
      { id: 'formula-geral', rotulo: 'Como o NeoGuide calcula', grupo: 'Geral', texto: `fórmula geral ${this.formulaGeral.formulas.join(' ')} ${this.formulaGeral.nota} ${this.formulaGeral.parcelas.map(p => `${p.sigla} ${p.texto} ${p.norma}`).join(' ')}` },
    ];
    if (this.cod() === 'dis-nor-053') {
      for (const r of this.regras053) lista.push({ id: r.id, rotulo: r.titulo, grupo: 'Regras-chave', texto: `${r.titulo} ${r.texto} ${r.referencia} ${r.premissa ?? ''} ${r.termos ?? ''}` });
    } else {
      const p = this.parcelas030;
      lista.push({ id: p.id, rotulo: p.titulo, grupo: 'Regras-chave', texto: `${p.titulo} ${p.introducao} ${p.termos} ${p.parcelas.map(x => `${x.letra} ${x.descricao} ${x.tabela} ${x.fatorPotencia}`).join(' ')}` });
    }
    for (const t of this.tabelas()) lista.push({ id: t.ancora, rotulo: t.titulo.split(' · ')[0], grupo: 'Tabelas', texto: `${t.titulo} ${t.referencia} ${MODELOS[t.ancora]?.termos ?? ''} ${t.notasResumidas.join(' ')}` });
    lista.push({ id: 'premissas', rotulo: 'Premissas do NeoGuide', grupo: 'Premissas e glossário', texto: `premissas do projeto ${this.premissas().map(p => `${p.texto} ${p.referencia}`).join(' ')}` });
    lista.push({ id: 'glossario', rotulo: 'Glossário', grupo: 'Premissas e glossário', texto: `glossário ${this.glossario.map(g => `${g.termo} ${g.definicao}`).join(' ')}` });
    if (this.emBase()) lista.push({ id: 'complementares', rotulo: 'Normas complementares', grupo: 'Premissas e glossário', texto: `normas complementares ${this.complementares.itens.map(i => `${i.codigo} ${i.texto}`).join(' ')}` });
    return lista;
  });

  readonly visiveis = computed(() => {
    const t = this.termo();
    return t ? this.secoes().filter(s => normalizar(s.texto).includes(t)) : this.secoes();
  });
  private readonly idsVisiveis = computed(() => new Set(this.visiveis().map(s => s.id)));
  readonly indice = computed<GrupoIndice[]>(() => {
    const grupos: GrupoIndice[] = [];
    for (const s of this.visiveis()) {
      const g = grupos.find(x => x.titulo === s.grupo);
      if (g) g.itens.push(s); else grupos.push({ titulo: s.grupo, itens: [s] });
    }
    return grupos;
  });
  readonly semResultado = computed(() => !!this.termo() && this.visiveis().length === 0);

  constructor() {
    effect(() => {
      const c = this.cod();
      untracked(() => this.carregarTabelas(c));
    });
    // Rola até a âncora da URL quando o conteúdo estiver na tela.
    effect(() => {
      const ancora = this.fragmento();
      if (this.estado() !== 'ok' || !ancora) return;
      setTimeout(() => this.irParaAncora(ancora), 80);
    });
    // Reobserva as seções (item ativo do índice) sempre que a lista visível muda.
    effect(() => {
      this.idsVisiveis();
      if (this.estado() !== 'ok') return;
      setTimeout(() => this.observar(), 120);
    });
    this.digitacao.pipe(debounceTime(ATRASO_BUSCA_MS)).subscribe(v => this.termo.set(normalizar(v.trim())));
    this.carregarBase();
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    if (this.temporizadorDestaque) clearTimeout(this.temporizadorDestaque);
  }

  mostra(id: string): boolean { return this.idsVisiveis().has(id); }
  rotuloDaNorma(c: string): string { return CODIGO_EXIBIDO[codigoValido(c.toLowerCase())]; }

  carregarBase(): void {
    this.estadoBase.set('carregando');
    forkJoin({ normas: this.servico.normas(), premissas: this.servico.premissas() }).subscribe({
      next: ({ normas, premissas }) => { this.normas.set(normas); this.premissas.set(premissas); this.estadoBase.set('ok'); },
      error: () => this.estadoBase.set('erro'),
    });
  }

  private carregarTabelas(codigo: CodigoNorma): void {
    this.estadoTabelas.set('carregando');
    this.servico.tabelas(codigo).subscribe({
      next: t => { this.tabelas.set(t); this.estadoTabelas.set('ok'); },
      error: () => this.estadoTabelas.set('erro'),
    });
  }

  tentarNovamente(): void {
    this.carregarBase();
    this.carregarTabelas(this.cod());
  }

  escolherNorma(codigo: string): void {
    void this.router.navigate(['/normas', codigo.toLowerCase()]);
  }

  aoDigitar(valor: string): void {
    this.busca.set(valor);
    this.digitacao.next(valor);
  }

  limparBusca(): void {
    this.busca.set('');
    this.termo.set('');
  }

  /** Clique no índice: atualiza a URL com a âncora; o efeito rola e destaca. */
  irPara(id: string, evento: Event): void {
    evento.preventDefault();
    this.indiceAberto.set(false);
    void this.router.navigate([], { relativeTo: this.rota, fragment: id, replaceUrl: true });
    if (this.fragmento() === id) this.irParaAncora(id); // mesma âncora de novo: o efeito não dispara
  }

  /** Rola até a seção (ou termo), destaca o cartão por 2 s e dá foco no título. Âncora inexistente: não faz nada. */
  private irParaAncora(ancora: string): void {
    const alvo = document.getElementById(ancora);
    if (!alvo) return;
    alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });
    const secao = (alvo.closest('[data-secao]') as HTMLElement | null) ?? alvo;
    const idSecao = secao.getAttribute('data-secao') ?? ancora;
    this.destacada.set(idSecao);
    if (this.temporizadorDestaque) clearTimeout(this.temporizadorDestaque);
    this.temporizadorDestaque = setTimeout(() => this.destacada.set(null), DURACAO_DESTAQUE_MS);
    const foco = alvo === secao ? (document.getElementById(`${idSecao}-titulo`) ?? alvo) : alvo;
    foco.focus({ preventScroll: true });
  }

  private observar(): void {
    this.observador?.disconnect();
    if (typeof IntersectionObserver === 'undefined') return;
    const visiveis = new Map<string, number>();
    this.observador = new IntersectionObserver(entradas => {
      for (const e of entradas) {
        const id = (e.target as HTMLElement).getAttribute('data-secao') ?? '';
        if (e.isIntersecting) visiveis.set(id, e.boundingClientRect.top); else visiveis.delete(id);
      }
      const primeiro = [...visiveis.entries()].sort((a, b) => a[1] - b[1])[0];
      if (primeiro) this.ativo.set(primeiro[0]);
    }, { rootMargin: '-80px 0px -60% 0px' });
    document.querySelectorAll('[data-secao]').forEach(el => this.observador?.observe(el));
  }
}
