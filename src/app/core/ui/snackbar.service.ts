import { Injectable, signal } from '@angular/core';

export interface AcaoSnackbar {
  rotulo: string;
  executar: () => void;
}

export interface MensagemSnackbar {
  texto: string;
  acao?: AcaoSnackbar;
}

/** Mensagem curta na parte inferior da tela; some sozinha depois de `duracao` ms. */
@Injectable({ providedIn: 'root' })
export class SnackbarService {
  readonly atual = signal<MensagemSnackbar | null>(null);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  mostrar(texto: string, acao?: AcaoSnackbar, duracao = 6000): void {
    this.cancelarTemporizador();
    this.atual.set({ texto, acao });
    this.temporizador = setTimeout(() => this.fechar(), duracao);
  }

  executarAcao(): void {
    const acao = this.atual()?.acao;
    this.fechar();
    acao?.executar();
  }

  fechar(): void {
    this.cancelarTemporizador();
    this.atual.set(null);
  }

  private cancelarTemporizador(): void {
    if (this.temporizador !== null) clearTimeout(this.temporizador);
    this.temporizador = null;
  }
}
