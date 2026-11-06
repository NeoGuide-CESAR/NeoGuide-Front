import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { criarConsultaProjeto } from '../../core/projetos/consulta-projeto';
import { apresentarEtapas } from '../../core/projetos/etapas-apresentacao';
import { ProjetoDetalhado } from '../../core/projetos/projeto.model';
import { ProjetoLayoutComponent } from '../../shared/projeto/projeto-layout.component';
import { ProjetoBreadcrumbComponent } from '../../shared/projeto/projeto-breadcrumb.component';
import { ProjetoStatusComponent } from '../../shared/projeto/projeto-status.component';
import { ProjetoCardComponent } from '../../shared/projeto/projeto-card.component';
import { ProjetoEstadoComponent } from '../../shared/projeto/projeto-estado.component';
import { ProjetoEtapaDadosComponent } from '../../shared/projeto/projeto-etapa-dados.component';
import { KvaPipe } from '../../shared/projeto/kva.pipe';

@Component({
  selector: 'app-resultado-calculo-page', standalone: true,
  imports: [DatePipe, RouterLink, ProjetoLayoutComponent, ProjetoBreadcrumbComponent, ProjetoStatusComponent, ProjetoCardComponent, ProjetoEstadoComponent, ProjetoEtapaDadosComponent, KvaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resultado-calculo.page.html', styleUrl: './resultado-calculo.page.scss',
})
export class ResultadoCalculoPage {
  readonly id = input<string>();
  readonly consulta = criarConsultaProjeto(this.id);
  readonly projeto = this.consulta.projeto;
  readonly gerarMemorial = output<ProjetoDetalhado>();
  readonly breadcrumb = computed(() => [{ rotulo: 'Meus Projetos', rota: '/meus-projetos' }, { rotulo: this.projeto()?.nome ?? 'Projeto' }]);
  readonly etapas = computed(() => { const p = this.projeto(); return p ? apresentarEtapas(p) : []; });
  readonly resumo = computed(() => {
    const p = this.projeto(); const r = p?.resultado?.porEtapa;
    return p && r ? [
      { rotulo: 'Residencial', valor: r.residencial, aplicavel: p.residencial.aplicavel },
      { rotulo: 'Área comum', valor: r.areaComum, aplicavel: p.areaComum.aplicavel },
      { rotulo: 'Comercial', valor: r.comercial, aplicavel: p.comercial.aplicavel },
      { rotulo: 'Veículo elétrico e bomba', valor: r.veiculoBomba, aplicavel: p.veiculoBomba.aplicavel },
    ] : [];
  });
  solicitarMemorial(p: ProjetoDetalhado): void {
    // TODO: conectar a geração do memorial quando a integração correspondente estiver disponível.
    if (p.resultado) this.gerarMemorial.emit(p);
  }
}
