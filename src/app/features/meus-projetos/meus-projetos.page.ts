import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { LinkNav, SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { ProjetosListaComponent } from '../../shared/projetos/projetos-lista.component';
import { PROJETOS_MOCK } from './meus-projetos.mock';

/** Página "Meus Projetos": cabeçalho padrão + busca/filtros/lista/paginação de projetos. */
@Component({
  selector: 'app-meus-projetos-page',
  standalone: true,
  imports: [SiteHeaderComponent, SiteFooterComponent, ProjetosListaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meus-projetos.page.html',
  styleUrl: './meus-projetos.page.scss',
})
export class MeusProjetosPage {
  private readonly router = inject(Router);

  readonly links: LinkNav[] = [
    { rotulo: 'Início', rota: '/inicio' },
    { rotulo: 'Meus Projetos', rota: '/meus-projetos' },
    { rotulo: 'Cálculo de Demanda', href: '#', submenu: true },
    { rotulo: 'Documentos', href: '#' },
  ];

  readonly projetos = signal(PROJETOS_MOCK);

  novoProjeto(): void {
    void this.router.navigate(['/projetos', 'novo', 'calculo']);
  }

  abrirProjeto(id: string): void {
    void this.router.navigate(['/projetos', id, 'calculo']);
  }

  duplicarProjeto(id: string): void {
    this.projetos.update((lista) => {
      const original = lista.find((p) => p.id === id);
      if (!original) return lista;
      const copia = { ...original, id: `${original.id}-copia-${Date.now()}`, nome: `${original.nome} (cópia)`, status: 'rascunho' as const, atualizadoEm: new Date().toISOString().slice(0, 10) };
      return [copia, ...lista];
    });
  }

  excluirProjeto(id: string): void {
    this.projetos.update((lista) => lista.filter((p) => p.id !== id));
  }
}
