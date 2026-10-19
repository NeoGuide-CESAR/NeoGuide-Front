import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';
import { documentoOuEmailValidator } from '../../shared/validators/documento.validator';

/**
 * Janela de login do projetista (artboard 07).
 * Usa <dialog> nativo: foco preso dentro da janela, ESC fecha e
 * o fundo escurecido vem do ::backdrop — sem biblioteca extra.
 */
@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-dialog.component.html',
  styleUrl: './login-dialog.component.scss',
})
export class LoginDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly campoDocumento = viewChild.required<ElementRef<HTMLInputElement>>('campoDocumento');

  readonly fechou = output<void>();

  readonly mostrarSenha = signal(false);
  readonly enviando = signal(false);
  readonly erroServidor = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    documento: ['', [Validators.required, documentoOuEmailValidator]],
    senha: ['', [Validators.required]],
  });

  abrir(): void {
    const dlg = this.dialogRef().nativeElement;
    if (!dlg.open) dlg.showModal();
    queueMicrotask(() => this.campoDocumento().nativeElement.focus());
  }

  fechar(): void {
    this.dialogRef().nativeElement.close();
  }

  /** Disparado pelo evento `close` do <dialog> (botão X, ESC ou fechar()). */
  aoFechar(): void {
    this.erroServidor.set(null);
    this.fechou.emit();
  }

  /** Clique fora da janela (no backdrop) também fecha. */
  cliqueNoFundo(evento: MouseEvent): void {
    if (evento.target === this.dialogRef().nativeElement) this.fechar();
  }

  alternarSenha(): void {
    this.mostrarSenha.update((v) => !v);
  }

  mensagemDocumento(): string | null {
    const c = this.form.controls.documento;
    if (!c.touched || c.valid) return null;
    if (c.hasError('required')) return 'Informe seu CPF, CNPJ ou e-mail.';
    if (c.hasError('email')) return 'E-mail inválido. Confira se digitou certo.';
    if (c.hasError('cpf')) return 'CPF inválido. Confira os números.';
    if (c.hasError('cnpj')) return 'CNPJ inválido. Confira os números.';
    return 'Digite um CPF (11 dígitos), CNPJ (14 dígitos) ou e-mail.';
  }

  mensagemSenha(): string | null {
    const c = this.form.controls.senha;
    if (!c.touched || c.valid) return null;
    return 'Informe sua senha.';
  }

  entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.erroServidor.set(null);
    this.enviando.set(true);

    this.auth
      .entrar(this.form.getRawValue())
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.fechar();
          this.router.navigateByUrl('/inicio');
        },
        error: (e: Error) => this.erroServidor.set(e.message || 'Não foi possível entrar. Tente de novo.'),
      });
  }
}
