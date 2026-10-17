import { ChangeDetectionStrategy, Component, ElementRef, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-public-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-header.component.html',
  styleUrl: './public-header.component.scss',
  host: {
    '(document:click)': 'fecharMenus()',
    '(document:keydown.escape)': 'fecharComTeclado()',
  },
})
export class PublicHeaderComponent {
  readonly login = output<Event>();
  readonly conteudo = output<{ id: string; evento: Event }>();
  readonly chat = output<Event>();
  readonly submenu = signal<number | null>(null);
  readonly menuMobile = signal(false);
  private botaoSubmenu: HTMLButtonElement | null = null;
  private readonly botaoMenu = viewChild.required<ElementRef<HTMLButtonElement>>('navToggle');

  alternarSubmenu(indice: number, evento: MouseEvent): void {
    evento.stopPropagation();
    this.botaoSubmenu = evento.currentTarget as HTMLButtonElement;
    this.submenu.update((atual) => atual === indice ? null : indice);
  }

  alternarMobile(evento: MouseEvent): void {
    evento.stopPropagation();
    this.menuMobile.update((aberto) => !aberto);
    this.submenu.set(null);
  }

  fecharMenus(): void {
    this.submenu.set(null);
    this.menuMobile.set(false);
  }

  fecharComTeclado(): void {
    if (this.submenu() !== null) {
      this.submenu.set(null);
      this.botaoSubmenu?.focus();
    } else if (this.menuMobile()) {
      this.menuMobile.set(false);
      this.botaoMenu().nativeElement.focus();
    }
  }
}
