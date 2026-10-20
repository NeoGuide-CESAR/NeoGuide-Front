import { ChangeDetectionStrategy, Component, ViewChild, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { AuthService } from '../../core/auth/auth.service';
import { DadosProjeto, dadosVazios } from '../../core/projetos/dados-projeto';
import { RascunhosProjetoService } from '../../core/projetos/rascunhos-projeto.service';
import { RascunhoCalculo, complementosVazios } from '../../core/projetos/dados-calculo';

import { LinkNav, SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { WizardBodyComponent, WizardBreadcrumbItem } from '../../shared/wizard/wizard-body.component';

/** Formulário de cálculo de demanda (artboard 10): cabeçalho padrão + wizard de etapas. */
@Component({
  selector: 'app-calculo-demanda-page',
  standalone: true,
  imports: [SiteHeaderComponent, SiteFooterComponent, WizardBodyComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calculo-demanda.page.html',
  styleUrl: './calculo-demanda.page.scss',
})
export class CalculoDemandaPage {
  @ViewChild(WizardBodyComponent) wizard?: WizardBodyComponent;
  private readonly router = inject(Router);
  private readonly rascunhos = inject(RascunhosProjetoService);
  readonly auth = inject(AuthService);
  readonly dados = signal(dadosVazios());
  readonly complementos = signal(complementosVazios());
  readonly edicao = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal('');
  readonly mensagem = signal('');
  readonly nomeProjeto = signal('');
  private idLocal?: string;

  /** Id do projeto, vindo do parâmetro de rota `:id` (withComponentInputBinding). */
  readonly id = input<string>();
  constructor() {
    effect(() => {
      const id = this.id();
      if (id && id === this.idLocal) return;
      if (id && id !== 'novo') {
        try {
          const salvo = this.rascunhos.carregarCompleto(id);
          if (salvo) { this.idLocal = id; this.dados.set(salvo.dados); this.nomeProjeto.set(salvo.dados.nome); this.complementos.set(salvo.complementos); this.edicao.set(true); }
          else this.erro.set('Rascunho não encontrado neste navegador.');
        } catch { this.erro.set('Não foi possível carregar o rascunho salvo.'); }
      } else { this.dados.set(dadosVazios()); this.nomeProjeto.set(''); this.complementos.set(complementosVazios()); this.edicao.set(false); this.idLocal = undefined; }
    }, { allowSignalWrites: true });
  }
  salvar(dados: DadosProjeto): void {
    this.erro.set(''); this.salvando.set(true);
    try {
      this.idLocal = this.rascunhos.salvarCompleto(dados, this.wizard?.complementos() ?? this.complementos(), this.idLocal);
      this.nomeProjeto.set(dados.nome);
      this.edicao.set(true); this.mensagem.set('Rascunho salvo neste navegador.');
      this.wizard?.confirmarSalvamento();
      void this.router.navigate(['/projetos', this.idLocal, 'calculo'], { replaceUrl: true });
    } catch { this.erro.set('Não foi possível salvar o rascunho neste navegador. Tente novamente.'); }
    finally { this.salvando.set(false); }
  }
  salvarAutomatico(rascunho: RascunhoCalculo): void {
    try {
      const novo = !this.idLocal;
      this.idLocal = this.rascunhos.salvarCompleto(rascunho.dados, rascunho.complementos, this.idLocal);
      this.nomeProjeto.set(rascunho.dados.nome); this.edicao.set(true);
      if (novo) void this.router.navigate(['/projetos', this.idLocal, 'calculo'], { replaceUrl: true });
      this.erro.set(''); this.mensagem.set('Rascunho salvo neste navegador.');
      this.wizard?.confirmarPersistencia(true);
    } catch { this.wizard?.confirmarPersistencia(false); this.mensagem.set(''); this.erro.set('Não foi possível salvar o rascunho. Confira o armazenamento do navegador e tente novamente.'); }
  }

  readonly links: LinkNav[] = [
    { rotulo: 'Início', rota: '/inicio' },
    { rotulo: 'Meus Projetos', href: '#' },
    { rotulo: 'Cálculo de Demanda', href: '#', submenu: true },
    { rotulo: 'Documentos', href: '#' },
  ];

  readonly breadcrumbWizard = computed<WizardBreadcrumbItem[]>(() => [
    { label: 'Meus Projetos', href: '#' },
    { label: this.edicao() ? this.nomeProjeto() : 'Novo projeto' },
  ]);

  cancelar(): void {
    this.router.navigateByUrl('/inicio');
  }

  concluir(): void {
    this.mensagem.set('Revisão concluída. Dados salvos neste navegador.');
  }
}
