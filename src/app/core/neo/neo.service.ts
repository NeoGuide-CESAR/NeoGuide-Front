import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { ConversaCompleta, ConversaResumo, FonteNeo, Mensagem, PedidoNeo, RespostaNeo } from './neo.model';

/** Prefixo do proxy (ng serve) que encaminha para a API Lumi. A chave X-API-Key fica no proxy, não aqui. */
const BASE = '/api/neo';

/** Formato da API Lumi (NeoGuide-NeoChat, docs/05-ARQUITETURA.md). */
interface FonteLumi {
  document_code: string;
  revision: string;
  section: string;
  page: number;
  relevance_score: number;
  snippet: string;
}

interface SessaoCriadaLumi {
  id: string;
  created_at: string;
}

interface RespostaChatLumi {
  session_id: string;
  response: string;
  sources: FonteLumi[];
  created_at: string;
}

interface MensagemLumi {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources: FonteLumi[];
  created_at: string;
}

interface SessaoDetalheLumi {
  id: string;
  updated_at: string;
  messages: MensagemLumi[];
}

/**
 * Cliente da API Lumi para o Neo.
 * Sessões e mensagens vêm do back-end. A Lumi ainda não tem listagem nem exclusão de sessões,
 * então `listarConversas` e `excluirConversa` são provisórios (ver comentários).
 */
@Injectable({ providedIn: 'root' })
export class NeoService {
  private readonly http = inject(HttpClient);

  /**
   * Envia a pergunta. Se não houver sessão, cria uma antes.
   * Se a sessão tiver expirado (404/410, TTL de inatividade), abre outra e reenvia uma vez.
   */
  enviarMensagem(pedido: PedidoNeo): Observable<RespostaNeo> {
    const enviar = (sessionId: string) =>
      this.http
        .post<RespostaChatLumi>(`${BASE}/chat`, { session_id: sessionId, message: pedido.mensagem, stream: false })
        .pipe(map((r) => this.paraResposta(r)));

    if (!pedido.conversaId) {
      return this.criarSessao().pipe(switchMap((id) => enviar(id)));
    }

    return enviar(pedido.conversaId).pipe(
      catchError((erro: unknown) => {
        if (erro instanceof HttpErrorResponse && (erro.status === 404 || erro.status === 410)) {
          return this.criarSessao().pipe(switchMap((id) => enviar(id)));
        }
        return throwError(() => erro);
      }),
    );
  }

  /** TODO: a Lumi não tem GET /sessions (listagem). Até lá, o histórico fica vazio. */
  listarConversas(): Observable<ConversaResumo[]> {
    return of([]);
  }

  abrirConversa(id: string): Observable<ConversaCompleta> {
    return this.http.get<SessaoDetalheLumi>(`${BASE}/sessions/${id}`).pipe(
      map((s) => {
        const mensagens = s.messages.map((m): Mensagem => this.paraMensagem(m));
        const primeira = mensagens.find((m) => m.autor === 'usuario');
        return {
          id: s.id,
          titulo: primeira ? primeira.texto.slice(0, 60) : 'Conversa',
          atualizadaEm: s.updated_at,
          mensagens,
        };
      }),
    );
  }

  /** TODO: a Lumi não tem DELETE de sessão. Hoje só limpa a tela; a conversa continua no banco. */
  excluirConversa(_id: string): Observable<void> {
    return of(undefined);
  }

  private criarSessao(): Observable<string> {
    return this.http.post<SessaoCriadaLumi>(`${BASE}/sessions`, {}).pipe(map((s) => s.id));
  }

  private paraResposta(r: RespostaChatLumi): RespostaNeo {
    return {
      conversaId: r.session_id,
      resposta: r.response,
      fontes: this.paraFontes(r.sources),
      semFonte: r.sources.length === 0,
    };
  }

  private paraMensagem(m: MensagemLumi): Mensagem {
    if (m.role === 'user') return { id: m.id, autor: 'usuario', texto: m.content };
    if (m.role === 'system') return { id: m.id, autor: 'sistema', texto: m.content };
    return {
      id: m.id,
      autor: 'neo',
      texto: m.content,
      fontes: this.paraFontes(m.sources),
      semFonte: m.sources.length === 0,
    };
  }

  private paraFontes(fontes: FonteLumi[]): FonteNeo[] {
    return fontes.map((f) => ({ documento: f.document_code, secao: f.section }));
  }
}
