import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AtualizarPerfil, PerfilProjetista, PerfilService } from '../../core/perfil/perfil.service';
import { LinkNav, SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';

type Campo = 'nome' | 'empresa' | 'crea' | 'email' | 'senhaAtual' | 'novaSenha' | 'confirmacaoNovaSenha';
const tamanho = (min: number, max: number, obrigatorio = false): ValidatorFn => c => {
  const valor = String(c.value ?? '').trim();
  if (!valor) return obrigatorio ? { required: true } : null;
  return valor.length < min || valor.length > max ? { tamanho: true } : null;
};
const senhas: ValidatorFn = grupo => {
  const { senhaAtual, novaSenha, confirmacaoNovaSenha } = grupo.value;
  return (senhaAtual || novaSenha || confirmacaoNovaSenha) && novaSenha !== confirmacaoNovaSenha ? { diferentes: true } : null;
};

@Component({
  selector: 'app-perfil-page', standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './perfil.page.html', styleUrl: './perfil.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilPage {
  readonly auth = inject(AuthService);
  private readonly service = inject(PerfilService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elemento: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly fb = inject(FormBuilder);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erroGeral = signal('');
  readonly sucesso = signal('');
  readonly perfil = signal<PerfilProjetista | null>(null);
  readonly errosServidor = signal<Partial<Record<Campo, string>>>({});
  readonly visiveis = signal<Campo[]>([]);
  readonly iniciais = computed(() => (this.perfil()?.name ?? this.auth.usuario()?.nome ?? '').split(/\s+/).filter(Boolean).map(p => p[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase());
  readonly links: LinkNav[] = [{ rotulo: 'Início', rota: '/inicio' }, { rotulo: 'Meus Projetos', rota: '/meus-projetos' }, { rotulo: 'Cálculo de Demanda', rota: '/projetos/novo/calculo', submenu: true }, { rotulo: 'Documentos', href: '#' }];
  readonly form = this.fb.nonNullable.group({
    nome: ['', tamanho(3, 100, true)], empresa: ['', tamanho(2, 150)], crea: ['', tamanho(3, 50)],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    senhaAtual: [''], novaSenha: [''], confirmacaoNovaSenha: [''],
  }, { validators: senhas });
  readonly camposDados: { id: Campo; rotulo: string; autocomplete: string; max: number }[] = [
    { id: 'nome', rotulo: 'Nome completo *', autocomplete: 'name', max: 100 },
    { id: 'empresa', rotulo: 'Empresa', autocomplete: 'organization', max: 150 },
    { id: 'crea', rotulo: 'CREA', autocomplete: 'off', max: 50 },
    { id: 'email', rotulo: 'E-mail *', autocomplete: 'email', max: 150 },
  ];
  readonly camposSenha: { id: Campo; rotulo: string; autocomplete: string }[] = [
    { id: 'senhaAtual', rotulo: 'Senha atual', autocomplete: 'current-password' },
    { id: 'novaSenha', rotulo: 'Nova senha', autocomplete: 'new-password' },
    { id: 'confirmacaoNovaSenha', rotulo: 'Confirmar nova senha', autocomplete: 'new-password' },
  ];
  constructor() {
    for (const campo of Object.keys(this.form.controls) as Campo[]) this.form.controls[campo].valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.errosServidor.update(erros => { const proximo = { ...erros }; delete proximo[campo]; return proximo; });
      this.sucesso.set('');
    });
    this.carregar();
  }
  carregar(): void {
    if (this.carregando() || this.salvando()) return;
    this.carregando.set(true); this.erroGeral.set('');
    this.service.carregar().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.carregando.set(false))).subscribe({
      next: p => this.aplicarPerfil(p), error: e => this.tratarErro(e, 'Não foi possível carregar seu perfil. Tente novamente.'),
    });
  }
  private aplicarPerfil(p: PerfilProjetista): void {
    this.perfil.set(p);
    this.form.reset({ nome: p.name, empresa: p.empresa ?? '', crea: p.crea ?? '', email: p.email, senhaAtual: '', novaSenha: '', confirmacaoNovaSenha: '' }, { emitEvent: false });
    this.errosServidor.set({}); this.visiveis.set([]);
    this.auth.atualizarUsuario({ nome: p.name, email: p.email });
  }
  cancelar(): void {
    if (this.salvando()) return;
    const p = this.perfil(); if (p) this.aplicarPerfil(p);
    this.erroGeral.set(''); this.sucesso.set('');
    void this.router.navigateByUrl('/inicio');
  }
  sair(): void { this.auth.sair(); void this.router.navigateByUrl('/login'); }
  alternarSenha(campo: Campo): void { this.visiveis.update(v => v.includes(campo) ? v.filter(c => c !== campo) : [...v, campo]); }
  mensagem(campo: Campo): string {
    const servidor = this.errosServidor()[campo]; if (servidor) return servidor;
    const c = this.form.controls[campo]; if (!c.touched) return '';
    const v = this.form.getRawValue();
    const alterandoSenha = !!(v.senhaAtual || v.novaSenha || v.confirmacaoNovaSenha);
    if (campo === 'senhaAtual' && alterandoSenha && !v.senhaAtual) return 'Informe sua senha atual.';
    if (campo === 'novaSenha' && alterandoSenha) {
      if (!v.novaSenha) return 'Informe a nova senha.';
      if (v.novaSenha.trim().length < 8 || v.novaSenha.trim().length > 64) return 'Use de 8 a 64 caracteres.';
      if (!/[A-Za-zÀ-ÿ]/.test(v.novaSenha) || !/\d/.test(v.novaSenha)) return 'Inclua ao menos uma letra e um número.';
    }
    if (campo === 'confirmacaoNovaSenha' && alterandoSenha) {
      if (!v.confirmacaoNovaSenha) return 'Confirme a nova senha.';
      if (v.novaSenha !== v.confirmacaoNovaSenha) return 'As senhas não conferem.';
    }
    if (c.hasError('required')) return 'Informe seu nome completo.';
    if (c.hasError('tamanho')) return campo === 'nome' ? 'Use de 3 a 100 caracteres.' : campo === 'empresa' ? 'Use de 2 a 150 caracteres.' : 'Use de 3 a 50 caracteres.';
    return '';
  }
  private focarErro(): void { setTimeout(() => this.elemento.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); }
  salvar(): void {
    if (this.salvando() || this.carregando() || !this.perfil()) return;
    this.errosServidor.set({}); this.sucesso.set(''); this.erroGeral.set(''); this.form.markAllAsTouched();
    if (this.form.invalid || this.camposSenha.some(c => this.mensagem(c.id))) { this.focarErro(); return; }
    const v = this.form.getRawValue(); const atual = this.perfil()!;
    const mudancas: AtualizarPerfil = {};
    if (v.nome.trim() !== atual.name) mudancas.name = v.nome.trim();
    if (v.empresa.trim() !== (atual.empresa ?? '')) mudancas.empresa = v.empresa.trim();
    if (v.crea.trim() !== (atual.crea ?? '')) mudancas.crea = v.crea.trim();
    const mudouDados = Object.keys(mudancas).length > 0;
    const mudouSenha = !!(v.senhaAtual || v.novaSenha || v.confirmacaoNovaSenha);
    if (!mudouDados && !mudouSenha) { this.sucesso.set('Nenhuma alteração para salvar.'); return; }
    this.salvando.set(true); this.form.disable({ emitEvent: false });
    let dadosSalvos = false;
    const dados$: Observable<PerfilProjetista> = mudouDados ? this.service.salvar(mudancas) : of(atual);
    dados$.pipe(
      tap(p => {
        if (mudouDados) {
          dadosSalvos = true; this.perfil.set(p);
          this.auth.atualizarUsuario({ nome: p.name, email: p.email });
          this.form.patchValue({ nome: p.name, empresa: p.empresa ?? '', crea: p.crea ?? '', email: p.email }, { emitEvent: false });
        }
      }),
      switchMap(() => mudouSenha ? this.service.alterarSenha({ senhaAtual: v.senhaAtual, novaSenha: v.novaSenha, confirmacaoNovaSenha: v.confirmacaoNovaSenha }) : of(undefined)),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.salvando.set(false); this.form.enable({ emitEvent: false }); this.form.controls.email.disable({ emitEvent: false }); }),
    ).subscribe({
      next: () => { this.aplicarPerfil(this.perfil()!); this.sucesso.set('Alterações salvas com sucesso.'); },
      error: e => this.tratarErro(e, dadosSalvos ? 'Seus dados foram salvos, mas não foi possível concluir a alteração da senha.' : 'Não foi possível salvar as alterações. Tente novamente.'),
    });
  }
  private tratarErro(e: unknown, mensagem: string): void {
    if (e instanceof HttpErrorResponse && e.status === 401) { this.sair(); return; }
    const mapa: Record<string, Campo> = { name: 'nome', nome: 'nome', empresa: 'empresa', crea: 'crea', email: 'email', senhaAtual: 'senhaAtual', novaSenha: 'novaSenha', confirmacaoNovaSenha: 'confirmacaoNovaSenha' };
    const erros: Partial<Record<Campo, string>> = {};
    if (e instanceof HttpErrorResponse && e.error?.errors && typeof e.error.errors === 'object') {
      for (const [chave, valor] of Object.entries(e.error.errors)) if (mapa[chave] && typeof valor === 'string') erros[mapa[chave]] = valor;
    }
    this.errosServidor.set(erros); this.erroGeral.set(mensagem); this.focarErro();
  }
}
