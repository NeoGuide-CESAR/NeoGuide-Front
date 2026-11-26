import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService, ErroAutenticacao } from '../../core/auth/auth.service';
import { ROTA_INICIAL } from '../../core/auth/return-url';
import { cnpjValido, cpfValido } from '../../shared/validators/documento.validator';

/** Nome do campo no back (RegisterRequest) -> nome do controle no formulário. */
const CAMPO_DO_BACK: Record<string, string> = {
  name: 'nome',
  email: 'email',
  cpfCnpj: 'cpfCnpj',
  password: 'senha',
  confirmPassword: 'confirmacaoSenha',
};

/** Regra do back: senha com letras e números (StrongPassword). */
function senhaComLetraENumero(controle: AbstractControl): ValidationErrors | null {
  const valor = String(controle.value ?? '');
  if (!valor) return null;
  return /[A-Za-z]/.test(valor) && /\d/.test(valor) ? null : { senhaFraca: true };
}

/** CPF ou CNPJ opcional: vazio é aceito; preenchido precisa ser válido. */
function cpfOuCnpjOpcional(controle: AbstractControl): ValidationErrors | null {
  const digitos = String(controle.value ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length === 11) return cpfValido(digitos) ? null : { cpf: true };
  if (digitos.length === 14) return cnpjValido(digitos) ? null : { cnpj: true };
  return { documento: true };
}

function senhasIguais(grupo: AbstractControl): ValidationErrors | null {
  const senha = grupo.get('senha')?.value;
  const confirmacao = grupo.get('confirmacaoSenha')?.value;
  return senha && confirmacao && senha !== confirmacao ? { diferentes: true } : null;
}

/**
 * Cadastro de projetista (POST /api/v1/auth/register). Ao concluir, entra com a conta criada.
 * Os erros do back vêm por campo e são mostrados em cada campo; erros gerais ficam no topo do formulário.
 */
@Component({
  selector: 'app-cadastro-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cadastro.page.html',
  styleUrl: './cadastro.page.scss',
})
export class CadastroPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly enviando = signal(false);
  readonly erroGeral = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      cpfCnpj: ['', [cpfOuCnpjOpcional]],
      senha: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), senhaComLetraENumero]],
      confirmacaoSenha: ['', [Validators.required]],
    },
    { validators: [senhasIguais] },
  );

  constructor() {
    // Erro vindo do servidor some assim que o campo é editado.
    for (const nome of Object.values(CAMPO_DO_BACK)) {
      this.form.get(nome)?.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
        const controle = this.form.get(nome);
        if (controle?.hasError('servidor')) {
          const restantes: ValidationErrors = { ...(controle.errors ?? {}) };
          delete restantes['servidor'];
          controle.setErrors(Object.keys(restantes).length ? restantes : null);
        }
      });
    }
  }

  enviar(): void {
    if (this.enviando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.erroGeral.set(null);
    this.enviando.set(true);
    const dados = this.form.getRawValue();

    this.auth
      .cadastrar({
        nome: dados.nome,
        email: dados.email,
        cpfCnpj: dados.cpfCnpj,
        senha: dados.senha,
        confirmacaoSenha: dados.confirmacaoSenha,
      })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl(ROTA_INICIAL),
        error: (erro: unknown) => this.mostrarErro(erro),
      });
  }

  /** Mensagem do campo: erro de validação local ou erro devolvido pelo servidor. */
  mensagem(nome: string): string | null {
    const c = this.form.get(nome);
    if (!c) return null;
    if (c.hasError('servidor')) return c.getError('servidor') as string;
    const deveMostrar = c.touched || c.dirty;
    if (!deveMostrar) return null;
    if (c.hasError('required')) return 'Campo obrigatório.';
    if (c.hasError('minlength')) return `Use no mínimo ${c.getError('minlength').requiredLength} caracteres.`;
    if (c.hasError('maxlength')) return `Use no máximo ${c.getError('maxlength').requiredLength} caracteres.`;
    if (c.hasError('email')) return 'Informe um e-mail válido.';
    if (c.hasError('senhaFraca')) return 'A senha precisa ter letras e números.';
    if (c.hasError('cpf')) return 'CPF inválido. Confira os números.';
    if (c.hasError('cnpj')) return 'CNPJ inválido. Confira os números.';
    if (c.hasError('documento')) return 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos), ou deixe em branco.';
    if (nome === 'confirmacaoSenha' && this.form.hasError('diferentes')) return 'As senhas não conferem.';
    return null;
  }

  private mostrarErro(erro: unknown): void {
    if (!(erro instanceof ErroAutenticacao)) {
      this.erroGeral.set('Não foi possível criar a conta. Tente novamente.');
      return;
    }
    let campoMarcado = false;
    for (const [campoBack, texto] of Object.entries(erro.campos)) {
      const nome = CAMPO_DO_BACK[campoBack];
      const controle = nome ? this.form.get(nome) : null;
      if (controle) {
        controle.setErrors({ ...(controle.errors ?? {}), servidor: texto });
        controle.markAsTouched();
        campoMarcado = true;
      }
    }
    if (campoMarcado) {
      return;
    }
    // Erro geral do back (ex.: "E-mail já cadastrado"): mostra no topo e marca o campo citado.
    this.erroGeral.set(erro.message);
    const texto = erro.message.toLowerCase();
    const alvo = texto.includes('e-mail') ? 'email' : texto.includes('cpf') || texto.includes('cnpj') ? 'cpfCnpj' : null;
    if (alvo) {
      const controle = this.form.get(alvo);
      controle?.setErrors({ ...(controle.errors ?? {}), servidor: erro.message });
    }
  }
}
