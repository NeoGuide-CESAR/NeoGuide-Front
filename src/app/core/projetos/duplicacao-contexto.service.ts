import { Injectable } from '@angular/core';

export interface ContextoDuplicacao {
  originalId: string;
  retorno: string;
  avisoExibido?: boolean;
  enderecoConfirmado?: string;
}

/** Estado de navegação por cópia; a URL continua identificando o original no refresh. */
@Injectable({ providedIn: 'root' })
export class DuplicacaoContextoService {
  private readonly memoria = new Map<string, ContextoDuplicacao>();
  carregar(id: string): ContextoDuplicacao | undefined {
    try {
      const salvo = sessionStorage.getItem(`neoguide.duplicacao.${id}`);
      if (salvo) return JSON.parse(salvo);
    } catch { /* A navegação continua mesmo sem storage. */ }
    return this.memoria.get(id);
  }
  salvar(id: string, contexto: ContextoDuplicacao): void {
    this.memoria.set(id, contexto);
    try { sessionStorage.setItem(`neoguide.duplicacao.${id}`, JSON.stringify(contexto)); } catch { /* usa memória */ }
  }
}
