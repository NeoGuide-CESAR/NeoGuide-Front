import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';

@Component({
  selector: 'app-neoenergia-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SiteHeaderComponent, SiteFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './neoenergia-login.page.html',
  styleUrl: './neoenergia-login.page.scss',
})
export class NeoenergiaLoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly mostrarSenha = signal(false);
  readonly enviando = signal(false);
  readonly mensagem = signal('');
  readonly form = this.fb.nonNullable.group({
    documento: ['', [Validators.required, Validators.pattern(/\S/)]],
    senha: ['', Validators.required],
  });

  acessoCorporativo(): void {
    this.mensagem.set('O acesso com conta corporativa ainda não está disponível. Entre em contato com o suporte interno.');
  }

  recuperarSenha(): void {
    this.mensagem.set('Para recuperar sua senha corporativa, entre em contato com o suporte interno da Neoenergia.');
  }

  entrar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.mensagem.set('');
    this.enviando.set(true);
    const dados = this.form.getRawValue();
    this.auth.entrar({ ...dados, documento: dados.documento.trim() }, 'analista')
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => { this.router.navigateByUrl('/inicio'); },
        error: (erro: Error) => this.mensagem.set(erro.message || 'Não foi possível entrar. Tente novamente.'),
      });
  }
}
