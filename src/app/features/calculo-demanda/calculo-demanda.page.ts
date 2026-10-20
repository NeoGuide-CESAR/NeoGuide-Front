import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { LinkNav, SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { WizardBodyComponent, WizardBreadcrumbItem } from '../../shared/wizard/wizard-body.component';

/** Formulário de cálculo de demanda (artboard 10): cabeçalho padrão + wizard de etapas. */
@Component({
  selector: 'app-calculo-demanda-page',
  standalone: true,
  imports: [SiteHeaderComponent, WizardBodyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calculo-demanda.page.html',
  styleUrl: './calculo-demanda.page.scss',
})
export class CalculoDemandaPage {
  private readonly router = inject(Router);

  /** Id do projeto, vindo do parâmetro de rota `:id` (withComponentInputBinding). */
  readonly id = input<string>();

  readonly links: LinkNav[] = [
    { rotulo: 'Início', rota: '/inicio' },
    { rotulo: 'Meus Projetos', href: '#' },
    { rotulo: 'Cálculo de Demanda', href: '#', submenu: true },
    { rotulo: 'Documentos', href: '#' },
  ];

  readonly breadcrumbWizard: WizardBreadcrumbItem[] = [
    { label: 'Meus Projetos', href: '#' },
    { label: 'Cálculo de demanda' },
  ];

  cancelar(): void {
    this.router.navigateByUrl('/inicio');
  }

  concluir(): void {
    this.router.navigateByUrl('/inicio');
  }
}
