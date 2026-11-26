import { ChangeDetectionStrategy, Component, ViewChild, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, debounceTime, forkJoin, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { AuthService } from '../../core/auth/auth.service';
import { DadosProjeto, dadosVazios } from '../../core/projetos/dados-projeto';
import { RascunhosProjetoService } from '../../core/projetos/rascunhos-projeto.service';
import { ProjetosService } from '../../core/projetos/projetos.service';
import { mensagemDeErro } from '../../core/projetos/projetos.api';
import { ComplementosCalculo, RascunhoCalculo, complementosVazios, cargasDoServidor, cargasParaEnvio, especiaisParaEnvio, espacosComerciaisParaEnvio, tipologiasParaEnvio } from '../../core/projetos/dados-calculo';
import { CalculoService } from '../../core/calculo/calculo.service';
import { EtapasApi } from '../../core/calculo/calculo.api';

import { LinkNav, SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { ETAPAS_CALCULO_DEMANDA, WizardBodyComponent, WizardBreadcrumbItem } from '../../shared/wizard/wizard-body.component';
import { EtapaEstadoApi } from '../../core/projetos/projetos.api';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { SnackbarComponent } from '../../shared/ui/snackbar.component';

/** Id de projeto do back é numérico; rascunhos locais começam com `rascunho-`. */
const ID_DO_BACK = /^\d+$/;

/**
 * Wizard de cálculo de demanda (artboard 10).
 * - Projeto novo: o passo 1 é criado na API no primeiro "salvar"; depois a tela abre o projeto criado.
 * - Projeto do back: o passo 1 é lido e gravado na API; as etapas ficam neste navegador (por enquanto).
 */
@Component({
  selector: 'app-calculo-demanda-page',
  standalone: true,
  imports: [SiteHeaderComponent, SiteFooterComponent, WizardBodyComponent, RouterLink, SnackbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calculo-demanda.page.html',
  styleUrl: './calculo-demanda.page.scss',
})
export class CalculoDemandaPage {
  @ViewChild(WizardBodyComponent) wizard?: WizardBodyComponent;
  private readonly router = inject(Router);
  private readonly rascunhos = inject(RascunhosProjetoService);
  private readonly projetos = inject(ProjetosService);
  private readonly calculo = inject(CalculoService);
  private readonly snackbar = inject(SnackbarService);
  /** Estado das etapas decidido no servidor; atualizado depois de cada gravação. */
  readonly estadosEtapas = signal<EtapaEstadoApi[]>([]);
  /** Etapa a abrir quando a pedida está bloqueada (a primeira ainda não concluída). */
  readonly etapaRedirecionada = signal<number | null>(null);
  /** Alterações aguardam um instante e a gravação anterior é cancelada quando chega outra. */
  private readonly alteracoes = new Subject<RascunhoCalculo>();
  readonly auth = inject(AuthService);

  readonly dados = signal(dadosVazios());
  readonly complementos = signal(complementosVazios());
  readonly edicao = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal('');
  readonly mensagem = signal('');
  readonly nomeProjeto = signal('');

  /** Id do projeto no back (quando existe). */
  private idProjeto?: string;
  /** Id de rascunho local (projeto que ainda não está no back). */
  private idLocal?: string;

  /** Id do projeto, vindo do parâmetro de rota `:id` (withComponentInputBinding). */
  readonly id = input<string>();
  /** Etapa a abrir (índice, base 0) e origem da navegação, vindos da Revisão (EDITAR). */
  readonly etapa = input<number | string>();
  readonly origem = input<string>();
  readonly aba = input<string>();
  readonly campo = input<string>();
  readonly item = input<string>();
  /** Número da etapa na rota (etapa-1 a etapa-5, base 1) -> índice do wizard (base 0). */
  readonly etapaInicial = computed(() => {
    const n = Number(this.etapa());
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n - 1 : 0;
  });
  readonly itemFoco = computed(() => {
    const n = Number(this.item());
    return this.item() != null && Number.isInteger(n) ? n : null;
  });

  constructor() {
    this.alteracoes.pipe(debounceTime(400), switchMap(r => this.gravar(r)), takeUntilDestroyed()).subscribe();
    effect(() => {
      const id = this.id();
      if (id && (id === this.idProjeto || id === this.idLocal)) return;
      if (id && ID_DO_BACK.test(id)) this.abrirProjeto(id);
      else if (id && id !== 'novo') this.abrirRascunhoLocal(id);
      else this.novoProjeto();
    }, { allowSignalWrites: true });
  }

  readonly links: LinkNav[] = [
    { rotulo: 'Início', rota: '/inicio' },
    { rotulo: 'Meus Projetos', rota: '/meus-projetos' },
    { rotulo: 'Cálculo de Demanda', href: '#', submenu: true },
    { rotulo: 'Documentos', rota: '/normas' },
  ];

  readonly breadcrumbWizard = computed<WizardBreadcrumbItem[]>(() => [
    { label: 'Meus Projetos', href: '/meus-projetos' },
    { label: this.edicao() ? this.nomeProjeto() : 'Novo projeto' },
  ]);

  /** Passo 1 concluído pelo botão de avançar: cria o projeto (novo) ou atualiza (existente). */
  salvar(dados: DadosProjeto): void {
    this.erro.set('');
    this.mensagem.set('');
    this.salvando.set(true);
    const complementos = this.wizard?.complementos() ?? this.complementos();

    if (this.idProjeto) {
      this.projetos.atualizar(this.idProjeto, dados)
        .pipe(finalize(() => this.salvando.set(false)))
        .subscribe({
          next: () => {
            this.rascunhos.salvarComplementos(this.idProjeto!, complementos);
            this.nomeProjeto.set(dados.nome);
            this.dados.set(dados);
            this.mensagem.set('Dados salvos.');
            this.wizard?.confirmarSalvamento();
          },
          error: (erro: unknown) => this.falharSalvamento(erro),
        });
      return;
    }

    this.projetos.criar(dados)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (novoId) => {
          this.rascunhos.salvarComplementos(novoId, complementos);
          this.idProjeto = novoId;
          this.nomeProjeto.set(dados.nome);
          this.edicao.set(true);
          this.wizard?.confirmarSalvamento();
          void this.router.navigate(['/projetos', novoId, 'calculo'], { replaceUrl: true });
        },
        error: (erro: unknown) => this.falharSalvamento(erro),
      });
  }

  /** Salvamento automático ao alterar o passo 1 (projetos do back) ou as etapas. */
  salvarAutomatico(rascunho: RascunhoCalculo): void {
    if (!this.idProjeto) {
      // Projeto novo: só é criado no back quando o passo 1 é concluído com "salvar".
      this.salvarRascunhoLocal(rascunho);
      return;
    }
    this.rascunhos.salvarComplementos(this.idProjeto, rascunho.complementos);
    this.alteracoes.next(rascunho);
  }

  /** Grava passo 1 e as etapas completas no servidor. Etapa com erro não é enviada: vale a última versão válida. */
  private gravar(rascunho: RascunhoCalculo): Observable<unknown> {
    const id = this.idProjeto!;
    const { dados, complementos } = rascunho;
    const gravacoes: Observable<unknown>[] = [this.projetos.atualizar(id, dados)];
    const tipologias = tipologiasParaEnvio(dados, complementos);
    if (tipologias) gravacoes.push(this.projetos.salvarResidencial(id, tipologias));
    const cargas = cargasParaEnvio(dados, complementos);
    if (cargas) gravacoes.push(this.projetos.salvarAreaComum(id, cargas));
    const espacos = espacosComerciaisParaEnvio(dados, complementos);
    if (espacos) gravacoes.push(this.projetos.salvarComercial(id, espacos));
    const especiais = especiaisParaEnvio(dados, complementos);
    if (especiais) gravacoes.push(this.projetos.salvarEspeciais(id, especiais));
    return forkJoin(gravacoes).pipe(
      tap(() => {
        this.nomeProjeto.set(dados.nome);
        this.erro.set('');
        this.mensagem.set('Rascunho salvo.');
        this.atualizarEstados();
        this.wizard?.confirmarPersistencia(true);
      }),
      catchError((erro: unknown) => {
        this.wizard?.confirmarPersistencia(false);
        this.mensagem.set('');
        this.erro.set(mensagemDeErro(erro, 'Não foi possível salvar o rascunho. Tente novamente.'));
        return EMPTY;
      }),
    );
  }

  cancelar(): void {
    this.router.navigateByUrl('/inicio');
  }

  /** O wizard avançou de uma etapa: registra no servidor a etapa mais adiantada (a que conclui as opcionais sem dados). */
  registrarAvanco(idEtapa: string): void {
    if (!this.idProjeto) return;
    const indice = ETAPAS_CALCULO_DEMANDA.findIndex(e => e.id === idEtapa);
    if (indice < 0) return;
    this.projetos.registrarEtapa(this.idProjeto, indice + 2).subscribe({ next: () => this.atualizarEstados(), error: () => undefined });
  }

  private atualizarEstados(): void {
    if (!this.idProjeto) return;
    this.projetos.buscar(this.idProjeto).subscribe({ next: c => this.estadosEtapas.set(c.api.etapas ?? []), error: () => undefined });
  }

  /** Guarda o estado e, se a etapa pedida pela URL estiver bloqueada, abre a primeira não concluída. */
  private aplicarEstados(estados: EtapaEstadoApi[]): void {
    this.estadosEtapas.set(estados);
    if (!estados.length) return;
    const pedida = this.etapaInicial() + 1;
    if (estados.find(e => e.numero === pedida)?.estado !== 'BLOQUEADA') return;
    const primeira = estados.find(e => e.estado !== 'CONCLUIDA' && e.estado !== 'NAO_SE_APLICA');
    this.etapaRedirecionada.set((primeira?.numero ?? 1) - 1);
    this.snackbar.mostrar('Conclua as etapas anteriores primeiro.');
  }

  /** Chamado pelo guard de saída: com alteração ainda não confirmada pelo servidor, pergunta antes de sair. */
  podeSair(): boolean {
    return !this.wizard?.temAlteracaoPendente() || window.confirm('Descartar alterações?');
  }

  /** A Revisão é uma rota própria (etapa 6). */
  abrirRevisao(): void {
    if (this.idProjeto) void this.router.navigate(['/projetos', this.idProjeto, 'revisao']);
  }

  private novoProjeto(): void {
    this.dados.set(dadosVazios());
    this.complementos.set(complementosVazios());
    this.nomeProjeto.set('');
    this.edicao.set(false);
    this.idProjeto = undefined;
    this.idLocal = undefined;
  }

  private abrirProjeto(id: string): void {
    this.erro.set('');
    forkJoin({
      carregado: this.projetos.buscar(id),
      etapas: this.calculo.etapas(id).pipe(catchError(() => of(null as EtapasApi | null))),
    }).subscribe({
      next: ({ carregado, etapas }) => {
        const { dados, espacosComerciais } = carregado;
        this.idProjeto = id;
        this.idLocal = undefined;
        this.dados.set(dados);
        this.nomeProjeto.set(dados.nome);
        // O que está gravado no servidor prevalece sobre a cópia local.
        this.aplicarEstados(carregado.api.etapas ?? []);
        this.complementos.set(this.mesclarComServidor(this.rascunhos.carregarComplementos(id), espacosComerciais, etapas));
        this.edicao.set(true);
      },
      error: (erro: unknown) => this.erro.set(mensagemDeErro(erro, 'Não foi possível abrir este projeto.')),
    });
  }

  private mesclarComServidor(local: ComplementosCalculo, espacos: ComplementosCalculo['comercial'], etapas: EtapasApi | null): ComplementosCalculo {
    const c: ComplementosCalculo = { ...local, comercial: espacos };
    if (etapas?.residencial.tipologias.length) {
      c.residencial = { grupos: etapas.residencial.tipologias.map(t => ({ unidades: t.quantidadeUnidades, area: t.areaUtilM2, smartStudio: t.smartStudio })) };
    }
    if (etapas?.areaComum.cargas.length) Object.assign(c, cargasDoServidor(etapas.areaComum.cargas));
    const e = etapas?.cargasEspeciais;
    if (e) c.especiais = { pontos: e.qtdPontosVe || null, potenciaVeKw: e.potenciaVeKw, potenciaCv: e.potenciaBombaIncendioCv };
    return c;
  }

  private abrirRascunhoLocal(id: string): void {
    try {
      const salvo = this.rascunhos.carregarCompleto(id);
      if (!salvo) {
        this.erro.set('Rascunho não encontrado neste navegador.');
        return;
      }
      this.idLocal = id;
      this.idProjeto = undefined;
      this.dados.set(salvo.dados);
      this.nomeProjeto.set(salvo.dados.nome);
      this.complementos.set(salvo.complementos);
      this.edicao.set(true);
    } catch {
      this.erro.set('Não foi possível carregar o rascunho salvo.');
    }
  }

  private salvarRascunhoLocal(rascunho: RascunhoCalculo): void {
    try {
      this.idLocal = this.rascunhos.salvarCompleto(rascunho.dados, rascunho.complementos, this.idLocal);
      this.nomeProjeto.set(rascunho.dados.nome);
      this.erro.set('');
      this.mensagem.set('Rascunho salvo neste navegador.');
      this.wizard?.confirmarPersistencia(true);
    } catch {
      this.wizard?.confirmarPersistencia(false);
      this.mensagem.set('');
      this.erro.set('Não foi possível salvar o rascunho. Confira o armazenamento do navegador e tente novamente.');
    }
  }

  private falharSalvamento(erro: unknown): void {
    this.erro.set(mensagemDeErro(erro, 'Não foi possível salvar o projeto. Tente novamente.'));
    this.wizard?.confirmarPersistencia(false);
  }
}
