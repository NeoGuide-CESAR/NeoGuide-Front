import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { sanitizarRetorno } from '../../core/auth/return-url';

/**
 * Sessão expirada (estado B). O tempo de sessão ainda não é controlado aqui:
 * o gatilho (rota ou interceptor) depende do back-end.
 * A rota original chega em `returnUrl` e é devolvida depois do novo login.
 */
@Component({
  selector: 'app-sessao-expirada-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sessao-expirada.page.html',
  styleUrl: './sessao-expirada.page.scss',
})
export class SessaoExpiradaPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  entrarNovamente(): void {
    this.auth.sair();
    const retorno = sanitizarRetorno(this.returnUrl());
    void this.router.navigate(['/login'], { queryParams: retorno ? { returnUrl: retorno } : {} });
  }
}
