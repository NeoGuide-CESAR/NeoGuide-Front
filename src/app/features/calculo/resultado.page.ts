import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { CalculoApi, EtapasApi, lerProblema } from '../../core/calculo/calculo.api';
import { CalculoService } from '../../core/calculo/calculo.service';
import { dataHora, decimal, kva } from '../../core/calculo/formatos';
import {
  LinhaValor, NAO_SE_APLICA, aplicaComercial, aplicaResidencial, gruposResidenciais, linhasComercial,
  linhasEspeciais, linhasProjeto, secoesAreaComum, smartStudio,
} from '../../core/calculo/resumo-etapas';
import { ProjetoCarregado, ProjetosService } from '../../core/projetos/projetos.service';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { AlertBannerComponent } from '../../shared/calculo/alert-banner.component';
import { KeyValueListComponent } from '../../shared/calculo/key-value-list.component';
import { SkeletonComponent } from '../../shared/calculo/skeleton.component';
import { StageResultBoxComponent } from '../../shared/calculo/stage-result-box.component';
import { StatusBadgeComponent } from '../../shared/calculo/status-badge.component';
import { SummaryCardComponent } from '../../shared/calculo/summary-card.component';
import { LINKS_PRINCIPAIS } from '../../shared/layout/links-principais';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { SnackbarComponent } from '../../shared/ui/snackbar.component';

const ROTULO_TIPO: Record<string, string> = {
  RESIDENCIAL_MULTIFAMILIAR: 'Residencial multifamiliar', COMERCIAL: 'Comercial', MISTO: 'Uso misto (residencial e comercial)',
};
const CODIGOS_FORA_DA_LISTA = ['atendimento_mt', 'demanda_ate_50_kva', 'rele_ajustavel'];

/** Resultado do último cálculo gravado (GET /resultado). O front não calcula: só formata o que o back devolve. */
@Component({
  selector: 'app-resultado-page',
  standalone: true,
  imports: [RouterLink, SiteHeaderComponent, SiteFooterComponent, SummaryCardComponent, KeyValueListComponent, StageResultBoxComponent, AlertBannerComponent, StatusBadgeComponent, SkeletonComponent, SnackbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resultado.page.html',
  styleUrls: ['./calculo-paginas.scss', './resultado.page.scss'],
})
export class ResultadoPage implements OnInit {
  private readonly router = inject(Router);
  private readonly projetos = inject(ProjetosService);
  private readonly calculo = inject(CalculoService);
  private readonly snackbar = inject(SnackbarService);
  readonly auth = inject(AuthService);

  readonly id = input.required<string>();
  readonly links = LINKS_PRINCIPAIS;
  readonly naoSeAplica = NAO_SE_APLICA;
  readonly kva = kva;

  readonly carregando = signal(true);
  readonly falhou = signal(false);
  readonly gerando = signal(false);
  /** Verdadeiro quando o back recusou o memorial por cálculo desatualizado (409). */
  private readonly memorialRecusado = signal(false);
  readonly resultado = signal<CalculoApi | null>(null);
  readonly projeto = signal<ProjetoCarregado | null>(null);
  readonly etapas = signal<EtapasApi | null>(null);

  readonly dados = computed(() => this.projeto()?.dados ?? null);
  readonly nome = computed(() => this.dados()?.nome ?? '');
  readonly desatualizado = computed(() => this.resultado()?.situacaoCalculo === 'DESATUALIZADO' || this.memorialRecusado());
  readonly mt = computed(() => this.resultado()?.enquadramento.atendimentoMT ?? false);
  readonly memorialHabilitado = computed(() => !this.desatualizado() && !this.mt() && !this.gerando());
  readonly dataCalculo = computed(() => dataHora(this.resultado()?.calculadoEm));
  readonly tipoEnquadramento = computed(() => {
    const e = this.resultado()?.enquadramento;
    if (!e) return '';
    const rotulo = ROTULO_TIPO[e.tipoEnquadramento] ?? e.tipoEnquadramento;
    return e.motivoEnquadramento ? `${rotulo} (${e.motivoEnquadramento})` : rotulo;
  });
  readonly fornecimento = computed(() => (this.mt() ? 'Média tensão' : 'Baixa tensão · 380/220 V'));

  readonly minis = computed(() => {
    const r = this.resultado()?.resumoDemandas;
    return r ? [
      { rotulo: 'Residencial', valor: kva(r.drf) }, { rotulo: 'Área comum', valor: kva(r.ds) },
      { rotulo: 'Comercial', valor: kva(r.dc) }, { rotulo: 'Veículo elétrico', valor: kva(r.dve) },
      { rotulo: 'Bomba de incêndio', valor: kva(r.dmbi) },
    ] : [];
  });
  readonly dedNumero = computed(() => decimal(this.resultado()?.resumoDemandas.ded));
  readonly info50 = computed(() => this.resultado()?.alertas.find(a => a.codigo === 'demanda_ate_50_kva') ?? null);
  readonly alertasAtencao = computed(() => (this.resultado()?.alertas ?? []).filter(a => a.nivel === 'ALERTA' && !CODIGOS_FORA_DA_LISTA.includes(a.codigo)));
  readonly releAjustavel = computed(() => (this.resultado()?.alertas ?? []).some(a => a.codigo === 'rele_ajustavel'));

  readonly aplicaResidencial = computed(() => !!this.dados() && aplicaResidencial(this.dados()!));
  readonly aplicaComercial = computed(() => !!this.dados() && aplicaComercial(this.dados()!));
  readonly aplicaEspeciais = computed(() => !!this.dados() && (this.dados()!.temVe || this.dados()!.temBomba));

  readonly linhasProjeto = computed<LinhaValor[]>(() => this.dados() ? linhasProjeto(this.dados()!, this.projeto()?.api.responsavel, this.projeto()?.api.crea) : []);
  readonly linhasResidencial = computed<LinhaValor[]>(() => [
    ...gruposResidenciais(this.etapas()).map(g => ({ rotulo: `Grupo ${g.grupo}`, valor: `${g.unidades} unidades de ${g.area}` })),
    { rotulo: 'Smart studio', valor: smartStudio(this.etapas()) },
  ]);
  readonly linhasAreaComum = computed<LinhaValor[]>(() => secoesAreaComum(this.etapas()).map(s => ({
    rotulo: s.titulo,
    valor: s.itens.length ? s.itens.map(i => `${i.rotulo}: ${i.valor}`).join(' · ') : 'Nenhum valor informado',
    muted: !s.itens.length,
  })));
  readonly linhasComercial = computed(() => linhasComercial(this.projeto()?.api.espacosComerciais));
  readonly linhasEspeciais = computed(() => this.dados() ? linhasEspeciais(this.dados()!, this.etapas()) : []);

  readonly linhasEntrada = computed<LinhaValor[]>(() => {
    const e = this.resultado()?.dimensionamentoEntrada;
    const b = this.resultado()?.barramentoQdg;
    if (!e || !b) return [];
    return [
      { rotulo: 'Disjuntor geral', valor: `${e.disjuntorGeralA} A` },
      { rotulo: 'Cabos de fase', valor: `${e.circuitos} ${e.circuitos === 1 ? 'circuito' : 'circuitos'} · ${sinalVezes(e.caboFaseMm2)} XLPE 90 °C` },
      { rotulo: 'Cabo de neutro', valor: sinalVezes(e.caboNeutroMm2) },
      { rotulo: 'Eletroduto', valor: sinalVezes(e.eletrodutoEntrada) },
      { rotulo: 'Barramento do QDG', valor: `${sinalVezes(b.secao)} mm · ${b.capacidadeA} A` },
      { rotulo: 'Corrente de projeto', valor: e.correnteProjetoA == null ? '—' : `Ip = ${decimal(e.correnteProjetoA)} A` },
    ];
  });

  ngOnInit(): void { this.carregar(); }

  carregar(): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.memorialRecusado.set(false);
    forkJoin({ resultado: this.calculo.resultado(this.id()), projeto: this.projetos.buscar(this.id()), etapas: this.calculo.etapas(this.id()) }).subscribe({
      next: ({ resultado, projeto, etapas }) => {
        this.resultado.set(resultado);
        this.projeto.set(projeto);
        this.etapas.set(etapas);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        // Sem cálculo gravado: o caminho é pela Revisão.
        if (lerProblema(erro).regra === 'nao_calculado') {
          void this.router.navigate(['/projetos', this.id(), 'revisao'], { replaceUrl: true });
          return;
        }
        this.falhou.set(true);
        this.carregando.set(false);
      },
    });
  }

  revisar(): void { void this.router.navigate(['/projetos', this.id(), 'revisao']); }
  recalcular(): void { void this.router.navigate(['/projetos', this.id(), 'calculando']); }

  gerarMemorial(): void {
    if (!this.memorialHabilitado()) return;
    this.gerando.set(true);
    this.calculo.memorialPdf(this.id()).subscribe({
      next: blob => {
        this.gerando.set(false);
        baixar(blob, `memorial-${this.resultado()?.protocolo ?? this.id()}.pdf`);
        this.snackbar.mostrar('Memorial gerado.');
      },
      error: (erro: unknown) => {
        this.gerando.set(false);
        if (lerProblema(erro).status === 409) { this.memorialRecusado.set(true); return; }
        this.snackbar.mostrar('Não foi possível gerar o memorial.', { rotulo: 'Tentar novamente', executar: () => this.gerarMemorial() });
      },
    });
  }
}

/** O design usa o sinal × (não a letra x) entre quantidade e medida. */
const sinalVezes = (texto: string): string => texto.replace(/ x /g, ' × ');

function baixar(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}
