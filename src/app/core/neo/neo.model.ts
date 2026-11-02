/** Fonte documental devolvida pelo back-end (o front só exibe). */
export interface FonteNeo {
  documento: string;
  secao: string;
}

export interface PedidoNeo {
  mensagem: string;
  conversaId?: string;
  projetoId?: string;
}

export interface RespostaNeo {
  conversaId: string;
  resposta: string;
  fontes: FonteNeo[];
  semFonte: boolean;
}

export type AutorMensagem = 'usuario' | 'neo' | 'sistema';

export interface Mensagem {
  id: string;
  autor: AutorMensagem;
  texto: string;
  fontes?: FonteNeo[];
  semFonte?: boolean;
  /** Resposta que não chegou: mostra o aviso e o botão de tentar de novo. */
  falhou?: boolean;
}

export interface ConversaResumo {
  id: string;
  titulo: string;
  atualizadaEm: string; // ISO 8601
  projetoId?: string;
}

export interface ConversaCompleta extends ConversaResumo {
  mensagens: Mensagem[];
}

export interface ContextoProjeto {
  id: string;
  nome: string;
  etapaAtual?: number;
  totalEtapas?: number;
}
