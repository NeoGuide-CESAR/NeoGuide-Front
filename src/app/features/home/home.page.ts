import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { ProjetosService } from '../../core/projetos/projetos.service';
import { STATUS_INFO, StatusProjeto } from '../../core/projetos/projeto.model';
import { LinkNav, SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';

interface Atalho { icone: string; titulo: string; texto: string; rota?: string; href?: string; destaque?: boolean; }

/** Home do projetista (artboard 09). */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [DatePipe, RouterLink, SiteHeaderComponent, SiteFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  host: {
    '(document:click)': 'fecharMenuSeFora($event)',
    '(document:keydown.escape)': 'menuAberto.set(false)',
  },
})
export class HomePage {
  private readonly auth = inject(AuthService);
  private readonly projetos = inject(ProjetosService);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef<HTMLElement>);

  readonly usuario = this.auth.usuario;
  readonly primeiroNome = this.auth.primeiroNome;
  readonly recentes = this.projetos.recentes;
  readonly statusInfo = STATUS_INFO;

  readonly menuAberto = signal(false);

  readonly links: LinkNav[] = [
    { rotulo: 'Início', rota: '/inicio' },
    { rotulo: 'Meus Projetos', href: '#' },
    { rotulo: 'Cálculo de Demanda', href: '#', submenu: true },
    { rotulo: 'Documentos', href: '#' },
  ];

  readonly indicadores = computed(() => {
    const r = this.projetos.resumo();
    const lista: { status: StatusProjeto; rotulo: string; valor: number }[] = [
      { status: 'rascunho', rotulo: 'Rascunhos', valor: r.rascunho },
      { status: 'em_analise', rotulo: 'Em análise', valor: r.em_analise },
      { status: 'aprovado', rotulo: 'Aprovados', valor: r.aprovado },
      { status: 'reprovado', rotulo: 'Reprovados', valor: r.reprovado },
    ];
    return lista;
  });

  readonly atalhos = computed<Atalho[]>(() => {
    const rascunho = this.projetos.rascunhoEmAndamento();
    return [
      { icone: 'add_circle', titulo: 'Novo projeto', texto: 'Comece o cálculo de demanda de uma nova edificação.', href: '#', destaque: true },
      {
        icone: 'bolt',
        titulo: 'Continuar cálculo',
        texto: rascunho
          ? `${rascunho.nome}: etapa ${rascunho.etapaAtual} de ${rascunho.totalEtapas} do preenchimento.`
          : 'Você não tem cálculos em andamento.',
        ...(rascunho ? { rota: `/projetos/${rascunho.id}/calculo` } : { href: '#' }),
      },
      { icone: 'menu_book', titulo: 'Norma DIS-NOR-053', texto: 'Consulte a versão vigente da norma da distribuidora.', href: '#' },
      { icone: 'chat', titulo: 'Tirar dúvidas com o Neo', texto: 'Pergunte sobre a norma enquanto preenche.', href: '#' },
    ];
  });

  alternarMenu(): void {
    this.menuAberto.update((v) => !v);
  }

  fecharMenuSeFora(evento: MouseEvent): void {
    if (!this.menuAberto()) return;
    const menu = (this.el.nativeElement as HTMLElement).querySelector('.usuario');
    if (menu && !menu.contains(evento.target as Node)) this.menuAberto.set(false);
  }

  sair(): void {
    this.auth.sair();
    this.router.navigateByUrl('/login');
  }
}
