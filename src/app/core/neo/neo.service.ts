import { Injectable } from '@angular/core';
import { Observable, defer, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { ConversaCompleta, ConversaResumo, Mensagem, PedidoNeo, RespostaNeo } from './neo.model';

const LATENCIA_RESPOSTA = 900;
const LATENCIA_CONSULTA = 200;

/** Resposta de exemplo; o conteúdo real da norma vem do back-end. */
interface RespostaExemplo {
  resposta: string;
  fontes: { documento: string; secao: string }[];
  semFonte: boolean;
}

/**
 * Serviço SIMULADO do Neo (contrato com o back-end ainda não definido).
 * As respostas são placeholders para testar a interface; não são conteúdo da DIS-NOR-053.
 */
@Injectable({ providedIn: 'root' })
export class NeoService {
  private readonly conversas: ConversaCompleta[] = this.semearConversas();
  private contador = 0;

  enviarMensagem(pedido: PedidoNeo): Observable<RespostaNeo> {
    return defer(() => {
      const conversa = this.conversas.find((c) => c.id === pedido.conversaId) ?? this.criarConversa(pedido);
      const exemplo = responderExemplo(pedido.mensagem);
      conversa.mensagens.push(
        { id: this.novoId(), autor: 'usuario', texto: pedido.mensagem },
        { id: this.novoId(), autor: 'neo', texto: exemplo.resposta, fontes: exemplo.fontes, semFonte: exemplo.semFonte },
      );
      conversa.atualizadaEm = new Date().toISOString();
      return of({ conversaId: conversa.id, resposta: exemplo.resposta, fontes: exemplo.fontes, semFonte: exemplo.semFonte });
    }).pipe(delay(LATENCIA_RESPOSTA));
  }

  listarConversas(): Observable<ConversaResumo[]> {
    return defer(() =>
      of(
        this.conversas
          .map((c) => ({ id: c.id, titulo: c.titulo, atualizadaEm: c.atualizadaEm, projetoId: c.projetoId }))
          .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm)),
      ),
    ).pipe(delay(LATENCIA_CONSULTA));
  }

  abrirConversa(id: string): Observable<ConversaCompleta> {
    const conversa = this.conversas.find((c) => c.id === id);
    if (!conversa) return throwError(() => new Error('Conversa não encontrada.'));
    return of({ ...conversa, mensagens: [...conversa.mensagens] }).pipe(delay(LATENCIA_CONSULTA));
  }

  excluirConversa(id: string): Observable<void> {
    const indice = this.conversas.findIndex((c) => c.id === id);
    if (indice >= 0) this.conversas.splice(indice, 1);
    return of(undefined).pipe(delay(LATENCIA_CONSULTA));
  }

  private criarConversa(pedido: PedidoNeo): ConversaCompleta {
    const conversa: ConversaCompleta = {
      id: `c-${this.novoId()}`,
      titulo: pedido.mensagem.slice(0, 60),
      atualizadaEm: new Date().toISOString(),
      projetoId: pedido.projetoId,
      mensagens: [],
    };
    this.conversas.push(conversa);
    return conversa;
  }

  private novoId(): string {
    return `${++this.contador}-${Date.now()}`;
  }

  private semearConversas(): ConversaCompleta[] {
    const dia = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString();
    const msg = (autor: Mensagem['autor'], texto: string): Mensagem => ({ id: `seed-${Math.random()}`, autor, texto });
    return [
      { id: 'seed-1', titulo: 'Como converto cv em kVA?', atualizadaEm: dia(0), projetoId: 'p1', mensagens: [msg('usuario', 'Como converto cv em kVA?'), msg('neo', 'Exemplo de resposta.')] },
      { id: 'seed-2', titulo: 'Carga reserva entra na demanda?', atualizadaEm: dia(3), mensagens: [msg('usuario', 'Carga reserva entra na demanda?'), msg('neo', 'Exemplo de resposta.')] },
      { id: 'seed-3', titulo: 'Fator de demanda residencial', atualizadaEm: dia(20), mensagens: [msg('usuario', 'Fator de demanda residencial'), msg('neo', 'Exemplo de resposta.')] },
    ];
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function responderExemplo(texto: string): RespostaExemplo {
  const t = normalizar(texto);
  if (/\bcv\b|\bkva\b/.test(t)) {
    return {
      resposta: 'Para converter cv em kVA, use o fator indicado na tabela de conversão da norma.',
      fontes: [{ documento: 'DIS-NOR-030', secao: 'Tabela 10' }],
      semFonte: false,
    };
  }
  if (t.includes('reserva')) {
    return {
      resposta: 'A carga reserva segue a regra de cálculo da norma. Confira o detalhamento na seção de cargas.',
      fontes: [{ documento: 'DIS-NOR-053', secao: 'Cargas reserva' }],
      semFonte: false,
    };
  }
  return {
    resposta: 'Não encontrei essa informação nos documentos da norma. Consulte os canais oficiais da Neoenergia para confirmar.',
    fontes: [],
    semFonte: true,
  };
}
