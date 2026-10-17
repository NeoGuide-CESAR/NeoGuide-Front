import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LoginDialogComponent } from './login-dialog.component';
import { PublicHeaderComponent } from './public-header.component';

interface Conteudo { titulo: string; texto: string; }

@Component({
  selector: 'app-login-page',
  imports: [LoginDialogComponent, RouterLink, PublicHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  host: {
    '(document:keydown.escape)': 'aoEscape($event)',
  },
})
export class LoginPage implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required(LoginDialogComponent);
  private readonly conteudoDialog = viewChild.required<ElementRef<HTMLDialogElement>>('conteudoDialog');
  private readonly chatInput = viewChild.required<ElementRef<HTMLInputElement>>('chatInput');
  private readonly chatBody = viewChild.required<ElementRef<HTMLElement>>('chatBody');
  private readonly chatFab = viewChild.required<ElementRef<HTMLButtonElement>>('chatFab');
  readonly entrar = input<string | undefined>();
  readonly chatAberto = signal(false);
  readonly conteudo = signal<Conteudo>({ titulo: '', texto: '' });
  readonly mensagens = signal([{ autor: 'bot', texto: 'Olá! Sou o Neo. Posso tirar dúvidas sobre a norma DIS-NOR-053. Como posso ajudar?' }]);

  private readonly conteudos: Record<string, Conteudo> = {
    'primeiro-acesso': {
      titulo: 'Primeiro acesso',
      texto: 'Veja como se cadastrar e começar seu primeiro projeto.\n\nO cadastro de projetistas ainda não está disponível nesta versão. Se você já possui acesso, use o botão Login na Área do Projetista.',
    },
    cadastro: {
      titulo: 'Cadastro de projetista',
      texto: 'O cadastro de novas contas ainda não está disponível nesta versão. Se você já possui acesso, use o botão Login na Área do Projetista.',
    },
    norma: {
      titulo: 'Conheça a DIS-NOR-053',
      texto: 'Acesse a norma vigente e entenda seus principais pontos.\n\nO documento oficial não foi incluído no material recebido. Consulte os canais oficiais da sua distribuidora para obter a versão aplicável ao seu projeto.',
    },
    'norma-pontos': {
      titulo: 'Principais pontos da norma',
      texto: 'Antes de iniciar, confirme a versão da DIS-NOR-053 aplicável à sua distribuidora. O resumo técnico depende do documento oficial, que ainda não foi disponibilizado neste projeto.',
    },
    'norma-download': {
      titulo: 'Baixar norma vigente',
      texto: 'O arquivo da norma ainda não foi disponibilizado. Consulte os canais oficiais da sua distribuidora para obter a versão vigente.',
    },
    'passo-a-passo': {
      titulo: 'Passo a passo do cálculo',
      texto: '1. Entre na Área do Projetista.\n2. Inicie um novo projeto.\n3. Preencha os dados solicitados e confira os alertas de validação.\n4. Revise o cálculo e gere o memorial antes do envio.\n\nO cálculo e o envio ainda não estão disponíveis nesta versão.',
    },
    contato: { titulo: 'Contato', texto: 'Os canais de contato e suporte ainda não foram configurados nesta versão.' },
    faq: {
      titulo: 'Dúvidas frequentes',
      texto: 'Como entrar?\nUse Login na Área do Projetista. Para a equipe Neoenergia, selecione Acesso Neoenergia ou Entrar como analista.\n\nComo tirar dúvidas?\nAbra o chat do Neo no canto inferior da página. Nesta versão, ele apresenta uma resposta demonstrativa.\n\nComo criar uma conta?\nO cadastro ainda não está disponível nesta versão.',
    },
    privacidade: { titulo: 'Políticas e Avisos de Privacidade', texto: 'O documento oficial de privacidade ainda não foi disponibilizado. Ele precisa ser incluído antes da publicação do serviço.' },
  };

  ngAfterViewInit(): void {
    if (this.entrar()) queueMicrotask(() => this.abrirLogin());
  }

  abrirLogin(evento?: Event): void {
    evento?.preventDefault();
    this.dialog().abrir();
  }

  limparQuery(): void {
    if (this.entrar()) this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  aoEscape(evento: Event): void {
    if (this.chatAberto() && !(evento.target as HTMLElement)?.closest('dialog')) this.fecharChat();
  }

  abrirConteudo(id: string, evento: Event): void {
    evento.preventDefault();
    this.conteudo.set(this.conteudos[id]);
    this.conteudoDialog().nativeElement.showModal();
  }

  fecharConteudo(): void { this.conteudoDialog().nativeElement.close(); }

  fecharNoFundo(evento: MouseEvent): void {
    if (evento.target === this.conteudoDialog().nativeElement) this.fecharConteudo();
  }

  abrirChat(evento?: Event): void {
    evento?.preventDefault();
    this.chatAberto.set(true);
    queueMicrotask(() => this.chatInput().nativeElement.focus());
  }

  alternarChat(): void {
    if (this.chatAberto()) this.fecharChat();
    else this.abrirChat();
  }

  fecharChat(): void {
    this.chatAberto.set(false);
    this.chatFab().nativeElement.focus();
  }

  enviarMensagem(evento: Event, campo: HTMLInputElement): void {
    evento.preventDefault();
    const texto = campo.value.trim();
    if (!texto) return;
    this.mensagens.update((mensagens) => [...mensagens,
      { autor: 'me', texto },
      { autor: 'bot', texto: 'Obrigado pela pergunta! Faça login na Área do Projetista para que eu possa responder com base no seu projeto.' },
    ]);
    campo.value = '';
    // Aguarda a atualização da lista antes de rolar até a última mensagem.
    requestAnimationFrame(() => {
      const corpo = this.chatBody().nativeElement;
      corpo.scrollTop = corpo.scrollHeight;
    });
    campo.focus();
  }
}
