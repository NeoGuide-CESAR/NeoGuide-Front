import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProjetosApiService } from '../../core/projetos/projetos-api.service';
import { DuplicarProjetoService } from '../../core/projetos/duplicar-projeto.service';
import { ProjetoCompleto } from '../../core/projetos/projeto-http';
import { SnackbarComponent } from '../../shared/ui/snackbar.component';
import { STATUS_INFO } from '../../core/projetos/projeto.model';
import { SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';

@Component({
  selector: 'app-detalhe-projeto-page', standalone: true,
  imports: [RouterLink, DatePipe, SiteHeaderComponent, SiteFooterComponent, SnackbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalhe-projeto.page.html', styleUrl: './detalhe-projeto.page.scss',
})
export class DetalheProjetoPage {
  private readonly api = inject(ProjetosApiService);
  readonly duplicacao = inject(DuplicarProjetoService);
  readonly id = input<string>();
  readonly projeto = signal<ProjetoCompleto | undefined>(undefined);
  readonly carregando = signal(true);
  readonly statusInfo = STATUS_INFO;
  readonly erro = signal('');
  readonly links = [{ rotulo: 'Início', rota: '/inicio' }, { rotulo: 'Meus Projetos', rota: '/meus-projetos' }];
  constructor() {
    effect(limpar => {
      const id = this.id();
      if (!id) return;
      this.carregando.set(true); this.erro.set(''); this.projeto.set(undefined);
      const requisicao = untracked(() => this.api.obter(id).subscribe({
        next: p => { this.projeto.set(p); this.carregando.set(false); },
        error: () => { this.erro.set('Não foi possível carregar o projeto.'); this.carregando.set(false); },
      }));
      limpar(() => requisicao.unsubscribe());
    }, { allowSignalWrites: true });
  }
}
