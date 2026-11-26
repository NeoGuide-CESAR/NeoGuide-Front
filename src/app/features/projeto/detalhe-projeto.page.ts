import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, throwError } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { CalculoApi, EtapasApi, lerProblema } from '../../core/calculo/calculo.api';
import { CalculoService } from '../../core/calculo/calculo.service';
import { dataHora, decimal, soData } from '../../core/calculo/formatos';
import { SecaoAreaComum, gruposResidenciais, linhasEspeciais, secoesAreaComum, smartStudio } from '../../core/calculo/resumo-etapas';
import { DadosProjeto, mascaraCep } from '../../core/projetos/dados-projeto';
import { ChaveStatus, REGRAS_STATUS, chaveDoStatus } from '../../core/projetos/regras-status';
import { mensagemDeErro } from '../../core/projetos/projetos.api';
import { ProjetoCarregado, ProjetosService } from '../../core/projetos/projetos.service';
import { WizardRoutes } from '../../core/projetos/wizard-routes';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { AlertBannerComponent, VarianteAlerta } from '../../shared/calculo/alert-banner.component';
import { KeyValueListComponent } from '../../shared/calculo/key-value-list.component';
import { LinhaValor } from '../../core/calculo/resumo-etapas';
import { SkeletonComponent } from '../../shared/calculo/skeleton.component';
import { StatusBadgeComponent, TipoSelo } from '../../shared/calculo/status-badge.component';
import { LINKS_PRINCIPAIS } from '../../shared/layout/links-principais';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { SnackbarComponent } from '../../shared/ui/snackbar.component';

/** O esqueleto só aparece se o carregamento passar de 150 ms (evita piscar). */
const ATRASO_ESQUELETO_MS = 150;

const AVISOS: Partial<Record<ChaveStatus, { variante: VarianteAlerta; icone: string; texto: string }>> = {
  em_analise: { variante: 'info', icone: 'schedule', texto: 'Projeto em análise pela Neoenergia. Para alterar, aguarde o parecer ou duplique o projeto.' },
  aprovado: { variante: 'sucesso', icone: 'check_circle', texto: 'Projeto aprovado. Para alterar, duplique o projeto.' },
  reprovado: { variante: 'erro', icone: 'cancel', texto: 'Projeto reprovado. Corrija os itens e calcule novamente.' },
};

/** Detalhamento do projeto (/projetos/:id): dados, informações por etapa, demanda e andamento. */
@Component({
  selector: 'app-detalhe-projeto-page',
  standalone: true,
  imports: [RouterLink, SiteHeaderComponent, SiteFooterComponent, KeyValueListComponent, AlertBannerComponent, StatusBadgeComponent, SkeletonComponent, SnackbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalhe-projeto.page.html',
  styleUrls: ['../calculo/calculo-paginas.scss', './detalhe-projeto.page.scss'],
})
export class DetalheProjetoPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly projetos = inject(ProjetosService);
  private readonly calculo = inject(CalculoService);
  private readonly snackbar = inject(SnackbarService);
  readonly auth = inject(AuthService);

  readonly id = input.required<string>();
  readonly links = LINKS_PRINCIPAIS;
  readonly decimal = decimal;

  readonly estado = signal<'carregando' | 'ok' | 'erro' | 'nao-encontrado'>('carregando');
  readonly esqueleto = signal(false);
  readonly duplicando = signal(false);
  readonly projeto = signal<ProjetoCarregado | null>(null);
  readonly etapas = signal<EtapasApi | null>(null);
  readonly resultado = signal<CalculoApi | null>(null);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  readonly dados = computed<DadosProjeto | null>(() => this.projeto()?.dados ?? null);
  readonly chave = computed<ChaveStatus>(() => chaveDoStatus(this.projeto()?.api.status));
  readonly selo = computed<TipoSelo>(() => this.chave());
  readonly regras = computed(() => REGRAS_STATUS[this.chave()]);
  readonly aviso = computed(() => AVISOS[this.chave()] ?? null);
  readonly atualizadoEm = computed(() => soData(this.projeto()?.api.updatedAt));

  /** Cálculo: NAO_CALCULADO, CALCULADO ou DESATUALIZADO (o back diz; sem resultado gravado, não calculado). */
  readonly situacaoCalculo = computed<'NAO_CALCULADO' | 'CALCULADO' | 'DESATUALIZADO'>(() => this.resultado()?.situacaoCalculo ?? 'NAO_CALCULADO');
  readonly mt = computed(() => this.resultado()?.enquadramento.atendimentoMT ?? false);
  readonly dedNumero = computed(() => decimal(this.resultado()?.resumoDemandas.ded));
  readonly dataDoCalculo = computed(() => soData(this.resultado()?.calculadoEm));
  readonly dataHoraDoCalculo = computed(() => dataHora(this.resultado()?.calculadoEm));
  readonly fornecimento = computed(() => (this.mt() ? 'Média tensão' : 'Baixa tensão · 380/220 V'));

  readonly linhasProjeto = computed<LinhaValor[]>(() => {
    const p = this.projeto();
    const d = this.dados();
    if (!p || !d) return [];
    const logradouro = [d.endereco, d.bairro, d.municipio && d.uf ? `${d.municipio} / ${d.uf}` : d.municipio || d.uf].filter(Boolean).join(' · ');
    const linhas: LinhaValor[] = [
      { rotulo: 'Nome', valor: d.nome || '—' },
      { rotulo: 'CEP', valor: d.cep ? mascaraCep(d.cep) : '—' },
      { rotulo: 'Logradouro completo', valor: logradouro || '—' },
      { rotulo: 'Tipo de edificação', valor: d.tipoEdificacao || '—' },
    ];
    // Só aparece quando o enquadramento difere do tipo escolhido.
    if (p.api.tipoEnquadramento && p.api.tipoEdificacao && p.api.tipoEnquadramento !== p.api.tipoEdificacao) {
      linhas.push({ rotulo: 'Enquadramento', valor: 'Edificação mista — possui espaços comerciais' });
    }
    linhas.push(
      { rotulo: 'Responsável técnico', valor: p.api.responsavel || 'Não informado' },
      { rotulo: 'ART/TRT/RRT', valor: p.api.crea || 'Não informado' },
      { rotulo: 'Protocolo', valor: p.api.protocolo || '—' },
      { rotulo: 'Carregamento de VE', valor: d.temVe ? 'Sim' : 'Não' },
      { rotulo: 'Bomba de incêndio', valor: d.temBomba ? 'Sim' : 'Não' },
    );
    return linhas;
  });

  // ----- informações por etapa
  readonly aplicaResidencial = computed(() => !!this.dados() && this.dados()!.tipoEdificacao !== 'Comercial');
  readonly grupos = computed(() => gruposResidenciais(this.etapas()));
  readonly smartStudio = computed(() => smartStudio(this.etapas()));
  readonly secoesAreaComum = computed<SecaoAreaComum[]>(() => secoesAreaComum(this.etapas()));
  readonly espacos = computed(() => (this.projeto()?.api.espacosComerciais ?? []).map(e => ({
    rotulo: e.rotulo || 'Finalidade não informada',
    area: e.areaM2 == null ? 'área não informada' : `${decimal(e.areaM2, 0)} m²`,
    carga: e.cargaInstaladaKw == null ? null : `${decimal(e.cargaInstaladaKw)} kW`,
  })));
  readonly linhasEspeciais = computed(() => this.dados() ? linhasEspeciais(this.dados()!, this.etapas()) : []);
  /** Etapas sem o dado que exigem: residencial sem grupos; VE/bomba marcados e sem dados. */
  readonly pendenteResidencial = computed(() => this.aplicaResidencial() && this.grupos().length === 0);
  readonly pendenteEspeciais = computed(() => {
    const d = this.dados();
    const e = this.etapas()?.cargasEspeciais;
    if (!d) return false;
    return (d.temVe && !(e?.qtdPontosVe && e.potenciaVeKw)) || (d.temBomba && !e?.potenciaBombaIncendioCv);
  });

  // ----- andamento
  readonly andamento = computed<LinhaValor[]>(() => {
    const p = this.projeto();
    if (!p) return [];
    const enviado = p.api.dataSubmissao ? soData(p.api.dataSubmissao) : '—';
    // O back guarda só a data de envio e a última atualização; esta serve de data da decisão (aprovado/reprovado).
    const decisao = soData(p.api.updatedAt);
    switch (this.chave()) {
      case 'em_analise': return [{ rotulo: 'Enviado em', valor: enviado }, { rotulo: 'Próxima etapa', valor: 'Parecer da Neoenergia' }];
      case 'aprovado': return [{ rotulo: 'Enviado em', valor: enviado }, { rotulo: 'Aprovado em', valor: decisao }, { rotulo: 'Próxima etapa', valor: 'Ligação' }];
      case 'reprovado': return [{ rotulo: 'Enviado em', valor: enviado }, { rotulo: 'Reprovado em', valor: decisao }, { rotulo: 'Próxima etapa', valor: 'Corrigir e reenviar' }];
      default: return [{ rotulo: 'Enviado em', valor: '—' }, { rotulo: 'Próxima etapa', valor: this.todasConcluidas() ? 'Calcular demanda' : 'Completar cadastro' }];
    }
  });
  private todasConcluidas(): boolean {
    const etapas = this.projeto()?.api.etapas ?? [];
    return etapas.length > 0 && etapas.every(e => e.estado === 'CONCLUIDA' || e.estado === 'NAO_SE_APLICA');
  }

  ngOnInit(): void { this.carregar(); }
  ngOnDestroy(): void { if (this.temporizador) clearTimeout(this.temporizador); }

  carregar(): void {
    this.estado.set('carregando');
    this.esqueleto.set(false);
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.esqueleto.set(true), ATRASO_ESQUELETO_MS);
    forkJoin({
      projeto: this.projetos.buscar(this.id()),
      etapas: this.calculo.etapas(this.id()),
      resultado: this.calculo.resultado(this.id()).pipe(
        // Sem cálculo gravado o back responde 404 com a regra nao_calculado: é o estado "Ainda não calculado".
        catchError((erro: unknown) => (lerProblema(erro).regra === 'nao_calculado' ? of(null) : throwError(() => erro))),
      ),
    }).subscribe({
      next: ({ projeto, etapas, resultado }) => {
        this.projeto.set(projeto);
        this.etapas.set(etapas);
        this.resultado.set(resultado ?? null);
        this.estado.set('ok');
        this.esqueleto.set(false);
      },
      error: (erro: unknown) => {
        const status = (erro as { status?: number })?.status;
        this.estado.set(status === 404 || status === 403 ? 'nao-encontrado' : 'erro');
        this.esqueleto.set(false);
      },
    });
  }

  editar(): void {
    const d = WizardRoutes.etapa(this.id(), 1);
    void this.router.navigate(d.commands, d.extras);
  }

  preencher(n: number): void {
    const d = WizardRoutes.etapa(this.id(), n);
    void this.router.navigate(d.commands, d.extras);
  }

  /** Duplica (cópia em rascunho, com todas as etapas), abre a cópia na etapa 1 e oferece DESFAZER por 6 s. */
  duplicar(): void {
    if (this.duplicando()) return;
    this.duplicando.set(true);
    this.projetos.duplicar(this.id()).subscribe({
      next: (copia) => {
        this.duplicando.set(false);
        const d = WizardRoutes.etapa(copia.id, 1);
        void this.router.navigate(d.commands, d.extras);
        this.snackbar.mostrar('Projeto duplicado com sucesso.', {
          rotulo: 'DESFAZER',
          executar: () => this.desfazerDuplicacao(copia.id),
        });
      },
      error: (erro: unknown) => {
        this.duplicando.set(false);
        this.snackbar.mostrar(mensagemDeErro(erro, 'Não foi possível duplicar o projeto.'));
      },
    });
  }

  private desfazerDuplicacao(idCopia: string): void {
    this.projetos.excluir(idCopia).subscribe({
      next: () => {
        this.snackbar.mostrar('Cópia removida.');
        void this.router.navigate(['/projetos', this.id()]);
      },
      error: (erro: unknown) => this.snackbar.mostrar(mensagemDeErro(erro, 'Não foi possível remover a cópia.')),
    });
  }

  /** Volta para a página anterior; sem histórico, para a listagem. */
  voltar(): void {
    if (window.history.length > 1) this.location.back();
    else void this.router.navigate(['/meus-projetos']);
  }
}
