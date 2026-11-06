import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, map, of, switchMap } from 'rxjs';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { AuthService } from '../../core/auth/auth.service';
import { DadosProjeto, dadosVazios, normalizarDados } from '../../core/projetos/dados-projeto';
import { RascunhosProjetoService } from '../../core/projetos/rascunhos-projeto.service';
import { ProjetosApiService } from '../../core/projetos/projetos-api.service';
import { ProjetoCompleto } from '../../core/projetos/projeto-http';
import { DuplicacaoContextoService } from '../../core/projetos/duplicacao-contexto.service';
import { chaveEndereco, mesmoEndereco } from '../../core/projetos/endereco-projeto';
import { STATUS_INFO } from '../../core/projetos/projeto.model';
import { RascunhoCalculo, complementosVazios } from '../../core/projetos/dados-calculo';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { SnackbarComponent } from '../../shared/ui/snackbar.component';
import { LinkNav, SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { WizardBodyComponent, WizardBreadcrumbItem } from '../../shared/wizard/wizard-body.component';

@Component({
  selector: 'app-calculo-demanda-page', standalone: true,
  imports: [SiteHeaderComponent, SiteFooterComponent, WizardBodyComponent, RouterLink, SnackbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calculo-demanda.page.html', styleUrl: './calculo-demanda.page.scss',
})
export class CalculoDemandaPage {
  readonly wizard = viewChild(WizardBodyComponent);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogoEndereco');
  private readonly alterarEndereco = viewChild.required<ElementRef<HTMLButtonElement>>('alterarEndereco');
  private readonly router = inject(Router);
  private readonly rascunhos = inject(RascunhosProjetoService);
  private readonly api = inject(ProjetosApiService);
  private readonly contexto = inject(DuplicacaoContextoService);
  private readonly snackbar = inject(SnackbarService);
  private readonly destroy = inject(DestroyRef);
  readonly auth = inject(AuthService);
  readonly id = input<string>();
  readonly duplicadoDe = input<string>();
  readonly dados = signal(dadosVazios());
  readonly complementos = signal(complementosVazios());
  readonly edicao = signal(false);
  readonly salvando = signal(false);
  readonly desfazendo = signal(false);
  readonly confirmandoEndereco = signal(false);
  readonly carregando = signal(false);
  readonly indisponivel = signal(false);
  readonly erro = signal('');
  readonly mensagem = signal('');
  readonly nomeProjeto = signal('');
  readonly projeto = signal<ProjetoCompleto | undefined>(undefined);
  readonly original = signal<ProjetoCompleto | undefined>(undefined);
  readonly statusInfo = STATUS_INFO;
  readonly avisoResultado = computed(() => this.projeto()?.resultadoInvalidado
    ? 'Os dados de cálculo foram alterados. O resultado anterior foi invalidado; será necessário recalcular.'
    : this.projeto() && this.projeto()?.status !== 'rascunho'
      ? 'Este projeto já foi calculado. Alterações nos dados de cálculo invalidam o resultado anterior e exigem um novo cálculo.' : '');
  private idLocal?: string;
  private pendente?: { rascunho: RascunhoCalculo; primeiraEtapa: boolean };

  constructor() {
    effect(limpar => {
      const id = this.id();
      const origem = this.duplicadoDe();
      untracked(() => {
        if (id && id === this.idLocal) return;
        this.erro.set(''); this.mensagem.set(''); this.indisponivel.set(false);
        this.original.set(undefined); this.projeto.set(undefined);
        if (!id || id === 'novo' || id.startsWith('rascunho-')) {
          const salvo = id?.startsWith('rascunho-') ? this.rascunhos.carregarCompleto(id) : null;
          this.idLocal = salvo ? id : undefined;
          this.dados.set(salvo?.dados ?? dadosVazios()); this.complementos.set(salvo?.complementos ?? complementosVazios());
          this.nomeProjeto.set(salvo?.dados.nome ?? ''); this.edicao.set(!!salvo); this.carregando.set(false);
          return;
        }
        this.carregando.set(true);
        const requisicao = this.api.obter(id).pipe(
          switchMap(p => {
            const originalId = origem || p.origemId;
            const original$: Observable<ProjetoCompleto | undefined> = originalId ? this.api.obter(originalId) : of(undefined);
            return original$.pipe(map(original => ({ p, original })));
          }),
        ).subscribe({
          next: ({ p, original }) => {
            this.projeto.set(p); this.original.set(original); this.dados.set(p.dados); this.complementos.set(p.complementos);
            this.nomeProjeto.set(p.nome); this.edicao.set(true); this.carregando.set(false);
            this.mostrarDuplicacao(p, original);
          },
          error: () => { this.carregando.set(false); this.indisponivel.set(true); this.erro.set('Não foi possível carregar o projeto.'); },
        });
        limpar(() => requisicao.unsubscribe());
      });
    }, { allowSignalWrites: true });
  }

  private mostrarDuplicacao(p: ProjetoCompleto, original?: ProjetoCompleto): void {
    if (!original) return;
    const contexto = this.contexto.carregar(p.id) ?? { originalId: original.id, retorno: `/projetos/${encodeURIComponent(original.id)}` };
    if (contexto.avisoExibido) return;
    this.contexto.salvar(p.id, { ...contexto, avisoExibido: true });
    this.snackbar.mostrar('Projeto duplicado com sucesso.', { rotulo: 'DESFAZER', executar: () => this.desfazerDuplicacao() }, 10000);
  }

  salvar(dados: DadosProjeto): void {
    this.solicitarSalvamento({ dados, complementos: this.wizard()?.complementos() ?? this.complementos() }, true);
  }

  salvarAutomatico(rascunho: RascunhoCalculo): void {
    // A criação existente continua local; na edição HTTP, salva ao avançar/revisar.
    if (this.projeto() && !this.wizard()?.aguardandoPersistencia()) return;
    this.solicitarSalvamento(rascunho, false);
  }

  private solicitarSalvamento(rascunho: RascunhoCalculo, primeiraEtapa: boolean): void {
    if (this.salvando() || this.desfazendo() || this.confirmandoEndereco() || this.carregando()) return;
    const p = this.projeto();
    const original = this.original();
    if (p && original && mesmoEndereco(rascunho.dados, original.dados)
      && this.contexto.carregar(p.id)?.enderecoConfirmado !== chaveEndereco(rascunho.dados)) {
      this.pendente = { rascunho: structuredClone(rascunho), primeiraEtapa };
      this.confirmandoEndereco.set(true);
      this.dialogo().nativeElement.showModal();
      this.alterarEndereco().nativeElement.focus();
      return;
    }
    this.persistir(rascunho, primeiraEtapa);
  }

  manterEndereco(): void {
    const pendente = this.pendente;
    const p = this.projeto();
    const original = this.original();
    if (!pendente || !p || !original) return;
    const contexto = this.contexto.carregar(p.id) ?? { originalId: original.id, retorno: `/projetos/${encodeURIComponent(original.id)}` };
    this.contexto.salvar(p.id, { ...contexto, enderecoConfirmado: chaveEndereco(pendente.rascunho.dados) });
    this.pendente = undefined; this.confirmandoEndereco.set(false); this.dialogo().nativeElement.close();
    this.persistir(pendente.rascunho, pendente.primeiraEtapa);
  }

  cancelarEndereco(evento?: Event): void {
    evento?.preventDefault();
    this.pendente = undefined; this.confirmandoEndereco.set(false); this.dialogo().nativeElement.close();
    this.wizard()?.confirmarPersistencia(false);
    this.wizard()?.focarCep();
  }

  private persistir(rascunho: RascunhoCalculo, primeiraEtapa: boolean): void {
    const p = this.projeto();
    this.erro.set('');
    if (!p) {
      try {
        const novo = !this.idLocal;
        this.idLocal = this.rascunhos.salvarCompleto(rascunho.dados, rascunho.complementos, this.idLocal);
        this.nomeProjeto.set(rascunho.dados.nome); this.edicao.set(true); this.mensagem.set('Rascunho salvo neste navegador.');
        if (primeiraEtapa) this.wizard()?.confirmarSalvamento(); else this.wizard()?.confirmarPersistencia(true);
        if (novo) void this.router.navigate(['/projetos', this.idLocal, 'calculo'], { replaceUrl: true });
      } catch { this.falhaSalvamento(); }
      return;
    }
    const d = normalizarDados(rascunho.dados);
    const mudouCalculo = chaveEndereco(d) !== chaveEndereco(p.dados) || d.tipoEdificacao !== p.dados.tipoEdificacao
      || d.temVe !== p.dados.temVe || d.temBomba !== p.dados.temBomba || JSON.stringify(rascunho.complementos) !== JSON.stringify(p.complementos);
    const projeto = mudouCalculo && p.status !== 'rascunho' ? { ...p, status: 'rascunho' as const, resultadoInvalidado: true } : p;
    this.salvando.set(true);
    this.api.salvar(projeto, rascunho).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.salvando.set(false))).subscribe({
      next: salvo => {
        this.projeto.set(salvo); this.nomeProjeto.set(salvo.nome); this.mensagem.set('Projeto salvo.');
        if (primeiraEtapa) this.wizard()?.confirmarSalvamento(); else this.wizard()?.confirmarPersistencia(true);
      },
      error: () => this.falhaSalvamento(),
    });
  }

  private falhaSalvamento(): void {
    this.wizard()?.confirmarPersistencia(false); this.mensagem.set(''); this.erro.set('Não foi possível salvar o projeto. Tente novamente.');
  }

  desfazerDuplicacao(): void {
    const p = this.projeto();
    if (!p || this.desfazendo() || this.salvando()) return;
    const retorno = this.contexto.carregar(p.id)?.retorno ?? '/meus-projetos';
    this.desfazendo.set(true);
    this.api.excluir(p.id).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.desfazendo.set(false))).subscribe({
      next: () => { void this.router.navigateByUrl(/^\/(meus-projetos(?:\?|$)|projetos\/)/.test(retorno) ? retorno : '/meus-projetos', { replaceUrl: true }); },
      error: () => this.snackbar.mostrar('Não foi possível desfazer. A cópia continua em Meus Projetos.'),
    });
  }

  readonly links: LinkNav[] = [
    { rotulo: 'Início', rota: '/inicio' }, { rotulo: 'Meus Projetos', rota: '/meus-projetos' },
    { rotulo: 'Cálculo de Demanda', href: '#', submenu: true }, { rotulo: 'Documentos', href: '#' },
  ];
  readonly breadcrumbWizard = computed<WizardBreadcrumbItem[]>(() => [
    { label: 'Meus Projetos', href: '/meus-projetos' }, { label: this.edicao() ? this.nomeProjeto() : 'Novo projeto' },
  ]);
  cancelar(): void { void this.router.navigateByUrl('/meus-projetos'); }
  concluir(): void { this.mensagem.set(this.projeto() ? 'Revisão concluída. Projeto salvo.' : 'Revisão concluída. Dados salvos neste navegador.'); }
}
