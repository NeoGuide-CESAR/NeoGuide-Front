import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { PerfilApi, PerfilService, lerErroDePerfil } from '../../core/usuario/perfil.service';
import { SnackbarService } from '../../core/ui/snackbar.service';
import { SkeletonComponent } from '../../shared/calculo/skeleton.component';
import { LINKS_PRINCIPAIS } from '../../shared/layout/links-principais';
import { SiteFooterComponent } from '../../shared/layout/site-footer.component';
import { SiteHeaderComponent } from '../../shared/layout/site-header.component';
import { SnackbarComponent } from '../../shared/ui/snackbar.component';

const MENSAGEM_DESCARTAR = 'Descartar alterações?';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** (00) 00000-0000 ou (00) 0000-0000, conforme os dígitos digitados. */
export function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

/** Meu perfil (/perfil): ver e alterar os próprios dados e a senha, com um único botão SALVAR. */
@Component({
  selector: 'app-perfil-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SiteHeaderComponent, SiteFooterComponent, SkeletonComponent, SnackbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './perfil.page.html',
  styleUrls: ['../calculo/calculo-paginas.scss', './perfil.page.scss'],
})
export class PerfilPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly perfilService = inject(PerfilService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);
  readonly auth = inject(AuthService);
  readonly links = LINKS_PRINCIPAIS;

  readonly form = this.fb.nonNullable.group({
    nome: '', cpfCnpj: '', telefone: '', email: '', registro: '', senhaAtual: '', novaSenha: '', confirmar: '',
  });
  readonly estado = signal<'carregando' | 'ok' | 'erro'>('carregando');
  readonly salvando = signal(false);
  readonly perfil = signal<PerfilApi | null>(null);
  /** Valores carregados (ou salvos por último): base para saber se algo mudou. */
  private readonly original = signal({ nome: '', telefone: '', email: '', registro: '' });
  private readonly valor = signal(this.form.getRawValue());
  private readonly tocados = signal<ReadonlySet<string>>(new Set());
  private readonly tentou = signal(false);
  readonly errosServidor = signal<Record<string, string>>({});
  readonly senhaVisivel = signal({ atual: false, nova: false, confirmar: false });

  readonly nomeExibido = computed(() => this.auth.usuario()?.nome ?? this.perfil()?.nome ?? '');
  readonly emailExibido = computed(() => this.auth.usuario()?.email ?? this.perfil()?.email ?? '');
  readonly iniciais = computed(() => iniciais(this.nomeExibido()));
  readonly rotuloPerfil = computed(() => (this.perfil()?.perfil === 'ANALISTA' ? 'Analista' : 'Projetista'));
  private readonly exigeRegistro = computed(() => this.perfil()?.perfil !== 'ANALISTA');

  readonly emailMudou = computed(() => this.valor().email.trim().toLowerCase() !== this.original().email.toLowerCase());
  /** Troca de senha em andamento. Só a senha atual, com troca de e-mail, é confirmação do e-mail e não uma troca de senha. */
  readonly senhaPreenchida = computed(() => !!(this.valor().novaSenha || this.valor().confirmar || (this.valor().senhaAtual && !this.emailMudou())));
  readonly dadosMudaram = computed(() => {
    const v = this.valor();
    const o = this.original();
    return v.nome.trim() !== o.nome || v.telefone.replace(/\D/g, '') !== o.telefone || this.emailMudou() || v.registro.trim() !== o.registro;
  });
  readonly alterado = computed(() => this.dadosMudaram() || this.senhaPreenchida());

  /** Regras de cada campo (as mesmas do back; o back tem a palavra final). Vazio = sem erro. */
  readonly erros = computed<Record<string, string>>(() => {
    const v = this.valor();
    const e: Record<string, string> = {};
    const nome = v.nome.trim().replace(/\s+/g, ' ');
    if (nome.length < 3 || nome.length > 100 || !nome.includes(' ')) e['nome'] = 'Informe seu nome completo.';
    const tel = v.telefone.replace(/\D/g, '');
    if (tel && tel.length !== 10 && tel.length !== 11) e['telefone'] = 'Telefone inválido.';
    const email = v.email.trim();
    if (!email || email.length > 150 || !EMAIL.test(email)) e['email'] = 'Informe um e-mail válido.';
    const registro = v.registro.trim();
    if (registro.length > 30 || (!registro && this.exigeRegistro())) e['registro'] = 'Informe seu registro profissional.';

    if (this.senhaPreenchida()) {
      if (!v.senhaAtual) e['senhaAtual'] = 'Informe sua senha atual.';
      if (!(v.novaSenha.length >= 8 && /[A-Za-z]/.test(v.novaSenha) && /\d/.test(v.novaSenha))) {
        e['novaSenha'] = 'A nova senha precisa ter 8 caracteres, com letras e números.';
      } else if (v.novaSenha === v.senhaAtual) {
        e['novaSenha'] = 'A nova senha deve ser diferente da atual.';
      }
      if (v.confirmar !== v.novaSenha) e['confirmar'] = 'As senhas não coincidem.';
    } else if (this.emailMudou() && !v.senhaAtual) {
      e['senhaAtual'] = 'Para trocar o e-mail, confirme sua senha atual.';
    }
    return e;
  });
  readonly valido = computed(() => Object.keys(this.erros()).length === 0);
  readonly podeSalvar = computed(() => this.alterado() && this.valido() && !this.salvando());
  /** Com a troca de e-mail, a senha atual passa a ser exigida: o destaque vai para o campo "Senha atual". */
  readonly exigeSenhaAtual = computed(() => this.emailMudou() || this.senhaPreenchida());

  constructor() {
    this.form.valueChanges.subscribe(() => this.valor.set(this.form.getRawValue()));
  }

  ngOnInit(): void { this.carregar(); }

  carregar(): void {
    this.estado.set('carregando');
    this.perfilService.obter().subscribe({
      next: (p) => { this.aplicar(p); this.estado.set('ok'); },
      error: () => this.estado.set('erro'),
    });
  }

  /** Mostra a mensagem do campo: do servidor (até o campo mudar) ou da regra local depois de tocar no campo. */
  mensagem(campo: string): string {
    const servidor = this.errosServidor()[campo];
    if (servidor) return servidor;
    return this.tocados().has(campo) || this.tentou() ? this.erros()[campo] ?? '' : '';
  }

  tocar(campo: string): void {
    this.tocados.update(t => new Set(t).add(campo));
  }

  aoEditar(campo: string): void {
    if (this.errosServidor()[campo]) this.errosServidor.update(({ [campo]: _, ...resto }) => resto);
  }

  aoDigitarTelefone(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const mascarado = mascaraTelefone(campo.value);
    campo.value = mascarado;
    this.form.controls.telefone.setValue(mascarado);
    this.aoEditar('telefone');
  }

  alternarSenha(qual: 'atual' | 'nova' | 'confirmar'): void {
    this.senhaVisivel.update(s => ({ ...s, [qual]: !s[qual] }));
  }

  salvar(): void {
    this.tentou.set(true);
    if (!this.podeSalvar()) return;
    const v = this.form.getRawValue();
    const emailMudou = this.emailMudou();
    const trocarSenha = this.senhaPreenchida();
    this.salvando.set(true);
    this.form.disable({ emitEvent: false });
    this.errosServidor.set({});

    const depoisDosDados = (dadosSalvos: boolean) => {
      if (!trocarSenha) { this.concluir(dadosSalvos, false); return; }
      this.perfilService.alterarSenha(v.senhaAtual, v.novaSenha).subscribe({
        next: () => this.concluir(dadosSalvos, true),
        error: (erro: unknown) => this.falharSenha(erro, dadosSalvos),
      });
    };

    if (!this.dadosMudaram()) { depoisDosDados(false); return; }
    this.perfilService.atualizar({
      nome: v.nome.trim(), telefone: v.telefone.replace(/\D/g, '') || null, email: v.email.trim(),
      registroProfissional: v.registro.trim(), ...(emailMudou ? { senhaAtual: v.senhaAtual } : {}),
    }).subscribe({
      next: (p) => {
        this.aplicar(p, true);
        this.auth.atualizarSessao({ nome: p.nome, email: p.email }, p.token ?? null);
        if (emailMudou && !p.token) {
          window.alert('E-mail alterado. Entre novamente com o novo e-mail.');
          this.auth.sair();
          void this.router.navigate(['/login']);
          return;
        }
        depoisDosDados(true);
      },
      error: (erro: unknown) => {
        const e = lerErroDePerfil(erro);
        this.reabrir();
        if (e.campo) this.errosServidor.set({ [e.campo === 'registroProfissional' ? 'registro' : e.campo]: e.detalhe });
        else this.snackbar.mostrar('Não foi possível salvar. Tente novamente.');
      },
    });
  }

  cancelar(): void {
    if (!this.alterado()) return;
    if (!window.confirm(MENSAGEM_DESCARTAR)) return;
    this.restaurar();
  }

  sair(): void {
    this.auth.sair();
    void this.router.navigate(['/login']);
  }

  /** Guard de saída da rota: com alterações não salvas, pergunta antes. */
  podeSair(): boolean {
    return !this.alterado() || window.confirm(MENSAGEM_DESCARTAR);
  }

  // ------------------------------------------------------------------ internos

  private concluir(dadosSalvos: boolean, senhaTrocada: boolean): void {
    this.reabrir();
    this.form.patchValue({ senhaAtual: '', novaSenha: '', confirmar: '' });
    this.valor.set(this.form.getRawValue());
    this.tocados.set(new Set());
    this.tentou.set(false);
    this.snackbar.mostrar(dadosSalvos && senhaTrocada ? 'Dados e senha atualizados.' : 'Alterações salvas.');
  }

  private falharSenha(erro: unknown, dadosSalvos: boolean): void {
    const e = lerErroDePerfil(erro);
    this.reabrir();
    this.errosServidor.set({ [e.campo ?? 'senhaAtual']: e.detalhe || 'Não foi possível alterar a senha.' });
    if (dadosSalvos) this.snackbar.mostrar('Seus dados foram salvos, mas a senha não foi alterada.');
  }

  private reabrir(): void {
    this.salvando.set(false);
    this.form.enable({ emitEvent: false });
    this.valor.set(this.form.getRawValue());
  }

  /** Carrega (ou recarrega após salvar) os valores do servidor como nova base. `manterSenhas` preserva o que foi digitado. */
  private aplicar(p: PerfilApi, manterSenhas = false): void {
    this.perfil.set(p);
    const telefone = p.telefone ?? '';
    this.original.set({ nome: p.nome, telefone: telefone.replace(/\D/g, ''), email: p.email, registro: p.registroProfissional ?? '' });
    const atuais = this.form.getRawValue();
    this.form.reset({
      nome: p.nome, cpfCnpj: p.cpfCnpj ?? '', telefone: mascaraTelefone(telefone), email: p.email, registro: p.registroProfissional ?? '',
      senhaAtual: manterSenhas ? atuais.senhaAtual : '', novaSenha: manterSenhas ? atuais.novaSenha : '', confirmar: manterSenhas ? atuais.confirmar : '',
    }, { emitEvent: false });
    this.valor.set(this.form.getRawValue());
  }

  private restaurar(): void {
    const p = this.perfil();
    if (p) this.aplicar(p);
    this.tocados.set(new Set());
    this.tentou.set(false);
    this.errosServidor.set({});
  }
}
