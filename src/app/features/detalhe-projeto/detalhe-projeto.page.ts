import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { criarConsultaProjeto } from '../../core/projetos/consulta-projeto';
import { apresentarEtapas, dadosDoProjeto } from '../../core/projetos/etapas-apresentacao';
import { DuplicarProjetoService } from '../../core/projetos/duplicar-projeto.service';
import { ProjetoLayoutComponent } from '../../shared/projeto/projeto-layout.component';
import { ProjetoBreadcrumbComponent } from '../../shared/projeto/projeto-breadcrumb.component';
import { ProjetoStatusComponent } from '../../shared/projeto/projeto-status.component';
import { ProjetoCardComponent } from '../../shared/projeto/projeto-card.component';
import { ProjetoEstadoComponent } from '../../shared/projeto/projeto-estado.component';
import { ProjetoEtapaDadosComponent } from '../../shared/projeto/projeto-etapa-dados.component';
import { KvaPipe } from '../../shared/projeto/kva.pipe';
import { SnackbarComponent } from '../../shared/ui/snackbar.component';

@Component({
  selector: 'app-detalhe-projeto-page', standalone: true,
  imports: [DatePipe, RouterLink, ProjetoLayoutComponent, ProjetoBreadcrumbComponent, ProjetoStatusComponent, ProjetoCardComponent, ProjetoEstadoComponent, ProjetoEtapaDadosComponent, KvaPipe, SnackbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalhe-projeto.page.html', styleUrl: './detalhe-projeto.page.scss',
})
export class DetalheProjetoPage {
  readonly id = input<string>();
  readonly consulta = criarConsultaProjeto(this.id);
  readonly projeto = this.consulta.projeto;
  readonly duplicacao = inject(DuplicarProjetoService);
  readonly breadcrumb = computed(() => [{ rotulo: 'Meus Projetos', rota: '/meus-projetos' }, { rotulo: this.projeto()?.nome ?? 'Projeto' }]);
  readonly dados = computed(() => {
    const p = this.projeto();
    return p ? dadosDoProjeto(p).map(linha => ({ ...linha, rotulo: linha.rotulo === 'Carregamento de veículo elétrico' ? 'Carregamento de VE' : linha.rotulo })) : [];
  });
  readonly etapas = computed(() => { const p = this.projeto(); return p ? apresentarEtapas(p).slice(1) : []; });
}
