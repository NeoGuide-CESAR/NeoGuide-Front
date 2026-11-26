import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ETAPAS, EtapaSlug, EtapasApi, ItemValidacaoApi, ValidacaoApi } from '../../core/calculo/calculo.api';
import { CalculoService } from '../../core/calculo/calculo.service';
import {
  NAO_SE_APLICA, aplicaComercial, aplicaResidencial, gruposResidenciais, linhasComercial, linhasEspeciais,
  linhasProjeto, secoesAreaComum, smartStudio,
} from '../../core/calculo/resumo-etapas';
import { textoBannerAtencao, textoBannerErro, textoRodape } from '../../core/calculo/textos-revisao';
import { ProjetoCarregado, ProjetosService } from '../../core/projetos/projetos.service';
import { DestinoWizard, WizardRoutes } from '../../core/projetos/wizard-routes';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { LINKS_PRINCIPAIS } from '../../shared/layout/links-principais';
import { SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { AlertBannerComponent } from '../../shared/calculo/alert-banner.component';
import { KeyValueListComponent } from '../../shared/calculo/key-value-list.component';
import { SkeletonComponent } from '../../shared/calculo/skeleton.component';
import { StatusBadgeComponent, TipoSelo } from '../../shared/calculo/status-badge.component';
import { SummaryCardComponent } from '../../shared/calculo/summary-card.component';

const SELO_DO_STATUS: Record<string, TipoSelo> = {
  RASCUNHO: 'rascunho', EM_ANALISE: 'em_analise', APROVADO: 'aprovado', REPROVADO: 'reprovado', AGUARDANDO_CORRECAO: 'reprovado',
};

/**
 * Etapa 6 do wizard: resumo por etapa e botão CALCULAR DEMANDA.
 * Os erros e alertas vêm só de GET /validacao-normativa (lido do banco a cada abertura); o front apenas exibe.
 */
@Component({
  selector: 'app-revisao-page',
  standalone: true,
  imports: [RouterLink, SiteHeaderComponent, SiteFooterComponent, SummaryCardComponent, KeyValueListComponent, AlertBannerComponent, StatusBadgeComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './revisao.page.html',
  styleUrls: ['./calculo-paginas.scss', './revisao.page.scss'],
})
export class RevisaoPage implements OnInit {
  private readonly router = inject(Router);
  private readonly projetos = inject(ProjetosService);
  private readonly calculo = inject(CalculoService);
  readonly auth = inject(AuthService);

  readonly id = input.required<string>();
  readonly links = LINKS_PRINCIPAIS;
  readonly etapasDoStepper = [...ETAPAS.map(e => e.rotulo), 'Revisão'];
  readonly naoSeAplica = NAO_SE_APLICA;

  readonly carregando = signal(true);
  readonly falhou = signal(false);
  readonly projeto = signal<ProjetoCarregado | null>(null);
  readonly etapas = signal<EtapasApi | null>(null);
  readonly validacao = signal<ValidacaoApi | null>(null);

  readonly dados = computed(() => this.projeto()?.dados ?? null);
  readonly nome = computed(() => this.dados()?.nome ?? '');
  readonly selo = computed<TipoSelo>(() => SELO_DO_STATUS[this.projeto()?.api.status ?? ''] ?? 'rascunho');

  /** Itens que o banner e os cartões mostram: erros e pontos de atenção (INFO não entra). */
  readonly itens = computed<ItemValidacaoApi[]>(() => (this.validacao()?.itens ?? []).filter(i => i.nivel !== 'INFO'));
  readonly totalErros = computed(() => this.validacao()?.totais.erros ?? 0);
  readonly totalAlertas = computed(() => this.validacao()?.totais.alertas ?? 0);
  readonly primeiroErro = computed(() => this.itens().find(i => i.nivel === 'ERRO') ?? null);
  readonly primeiroAlerta = computed(() => this.itens().find(i => i.nivel === 'ALERTA') ?? null);
  readonly textoBannerErro = computed(() => textoBannerErro(this.totalErros(), this.totalAlertas()));
  readonly textoBannerAtencao = computed(() => textoBannerAtencao(this.totalAlertas()));
  readonly rodape = computed(() => textoRodape(this.totalErros(), this.totalAlertas()));
  readonly podeCalcular = computed(() => !this.carregando() && !this.falhou() && this.totalErros() === 0);

  readonly aplicaResidencial = computed(() => !!this.dados() && aplicaResidencial(this.dados()!));
  readonly aplicaComercial = computed(() => !!this.dados() && aplicaComercial(this.dados()!));
  readonly aplicaEspeciais = computed(() => !!this.dados() && (this.dados()!.temVe || this.dados()!.temBomba));

  readonly linhasProjeto = computed(() => this.dados() ? linhasProjeto(this.dados()!, this.projeto()?.api.responsavel, this.projeto()?.api.crea) : []);
  readonly grupos = computed(() => gruposResidenciais(this.etapas()));
  readonly smartStudio = computed(() => smartStudio(this.etapas()));
  readonly secoesAreaComum = computed(() => secoesAreaComum(this.etapas()));
  readonly linhasComercial = computed(() => linhasComercial(this.projeto()?.api.espacosComerciais));
  readonly linhasEspeciais = computed(() => this.dados() ? linhasEspeciais(this.dados()!, this.etapas()) : []);
  /** Aba que o EDITAR da área comum abre: a do primeiro alerta desse cartão ou, sem alerta, a primeira. */
  readonly abaDaAreaComum = computed(() => this.itens().find(i => i.etapa === 'area-comum' && i.aba)?.aba ?? null);

  /** Resumos de uma ou duas linhas usados abaixo de 768 px. */
  readonly resumoMovel = computed(() => {
    const d = this.dados();
    if (!d) return null;
    const unidades = this.grupos().reduce((t, g) => t + g.unidades, 0);
    const total = this.grupos().length;
    const local = [d.endereco, d.municipio && d.uf ? `${d.municipio} / ${d.uf}` : d.municipio].filter(Boolean).join(' · ');
    return {
      projeto: [d.tipoEdificacao, local].filter(Boolean).join(' · '),
      residencial: `${unidades} unidades em ${total} ${total === 1 ? 'grupo' : 'grupos'} · Smart studio: ${this.smartStudio()}`,
      areaComum: this.resumoAreaComum(),
      comercial: `${this.linhasComercial().length} ${this.linhasComercial().length === 1 ? 'espaço comercial' : 'espaços comerciais'}`,
      especiais: this.linhasEspeciais().map(l => l.valor).join(' · '),
    };
  });

  private resumoAreaComum(): string {
    const n = this.secoesAreaComum().reduce((t, s) => t + s.itens.length, 0);
    return n === 0 ? 'Nenhum valor informado' : `${n} ${n === 1 ? 'item informado' : 'itens informados'}`;
  }

  ngOnInit(): void { this.carregar(); }

  /** Busca projeto, etapas e validação sempre de novo: nada fica em cache entre uma edição e a volta. */
  carregar(): void {
    this.carregando.set(true);
    this.falhou.set(false);
    forkJoin({
      projeto: this.projetos.buscar(this.id()),
      etapas: this.calculo.etapas(this.id()),
      validacao: this.calculo.validarNormativa(this.id()),
    }).subscribe({
      next: ({ projeto, etapas, validacao }) => {
        this.projeto.set(projeto);
        this.etapas.set(etapas);
        this.validacao.set(validacao);
        this.carregando.set(false);
      },
      error: () => { this.falhou.set(true); this.carregando.set(false); },
    });
  }

  estadoCartao(slug: EtapaSlug): 'normal' | 'erro' | 'atencao' {
    const itens = this.itens().filter(i => i.etapa === slug);
    if (itens.some(i => i.nivel === 'ERRO')) return 'erro';
    return itens.some(i => i.nivel === 'ALERTA') ? 'atencao' : 'normal';
  }

  mensagensDoCartao(slug: EtapaSlug): ItemValidacaoApi[] {
    return this.itens().filter(i => i.etapa === slug);
  }

  rotuloDaEtapa(slug: EtapaSlug | null | undefined): string {
    return ETAPAS.find(e => e.slug === slug)?.rotulo ?? 'Projeto';
  }

  /** Destino do link de um item: etapa, aba, campo e item corretos, voltando para a Revisão. */
  destino(item: ItemValidacaoApi): DestinoWizard { return WizardRoutes.doItem(this.id(), item); }

  /** Destino da segunda ação de um item (ex.: "Alterar tipo"). */
  destinoAlternativo(item: ItemValidacaoApi): DestinoWizard | null {
    const alt = item.alternativa;
    return alt ? WizardRoutes.doItem(this.id(), { etapa: alt.etapa, campo: alt.campo }) : null;
  }

  /** EDITAR de um cartão: abre a etapa (índice base 0) e volta para a Revisão ao salvar. */
  editar(indice: number, aba?: string | null): void {
    const d = WizardRoutes.etapa(this.id(), indice + 1, { origem: 'revisao', aba });
    void this.router.navigate(d.commands, d.extras);
  }

  voltar(): void {
    const d = WizardRoutes.etapa(this.id(), 5);
    void this.router.navigate(d.commands, d.extras);
  }

  calcular(): void {
    if (this.podeCalcular()) void this.router.navigate(['/projetos', this.id(), 'calculando']);
  }

  /** Passos que o tipo de edificação permite abrir pelo stepper. */
  passoAplicavel(indice: number): boolean {
    if (indice === 1) return this.aplicaResidencial();
    if (indice === 3) return this.aplicaComercial();
    if (indice === 4) return this.aplicaEspeciais();
    return true;
  }
}
