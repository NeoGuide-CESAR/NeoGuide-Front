import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, mergeMap, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjetosService } from './projetos.service';
import { ProjetoCompleto, ProjetoHttp, escreverProjetoHttp } from './projeto-http';
import { dadosExemplo } from './dados-projeto';
import { complementosVazios } from './dados-calculo';
import { PROJETOS_ARTBOARDS } from './projeto-artboards.mock';
import { Projeto, ResultadoCalculo } from './projeto.model';

const PROXIMA_ETAPA = { rascunho: 'Completar cadastro', em_analise: 'Parecer da Neoenergia', aprovado: 'Nenhuma pendência', reprovado: 'Revisar dados conforme o parecer' };

/** Placeholder numérico pronto apenas para cenários de demonstração já enviados. Não calcula demanda. */
function resultadoDemonstracao(p: Projeto): ResultadoCalculo {
  return {
    demandaTotal: 0, calculadoEm: p.atualizadoEm.includes('T') ? p.atualizadoEm : `${p.atualizadoEm}T12:00:00-03:00`, norma: 'DIS-NOR-053',
    porEtapa: { residencial: p.tipoEdificacao === 'Comercial' ? null : 0, areaComum: 0, comercial: p.tipoEdificacao === 'Comercial' ? 0 : null, veiculoBomba: 0, veiculoEletrico: 0, bombaIncendio: 0 },
  };
}

/** Único mock HTTP de projetos. Dados em memória; nenhum servidor é iniciado. */
@Injectable({ providedIn: 'root' })
export class ProjetosMockStore {
  readonly projetos = new Map<string, ProjetoHttp>();
  constructor() {
    for (const p of inject(ProjetosService).projetos()) {
      const complementos = complementosVazios();
      complementos.residencial.grupos = [{ unidades: p.unidadesConsumidoras ?? 24, area: 65, smartStudio: false }];
      complementos.cargas = { tomadas: 12, lampadas: 20 };
      complementos.especiais = { pontos: 2, bombas: 1, potenciaCv: 5 };
      this.projetos.set(p.id, {
        ...dadosExemplo(), id: p.id, nome: p.id === 'p2' ? 'Edifício Aurora' : p.nome,
        status: p.status.toUpperCase(), cep: p.id === 'p2' ? '50000100' : '50050000',
        logradouro: p.id === 'p2' ? 'Av. Exemplo, 450' : p.endereco ?? 'Rua do Exemplo, 120',
        bairro: p.id === 'p2' ? 'Boa Viagem' : 'Boa Vista',
        tipoEdificacao: p.tipoEdificacao === 'Comercial' ? 'Comercial' : 'Residencial multifamiliar',
        complementos, atualizadoEm: p.atualizadoEm,
      });
      const completo = p as Partial<ProjetoCompleto>;
      if (completo.dados && completo.complementos) {
        this.projetos.set(p.id, escreverProjetoHttp(p as ProjetoCompleto, { dados: completo.dados, complementos: completo.complementos }));
      }
      const atual = this.projetos.get(p.id)!;
      if (p.status !== 'rascunho') {
        atual.enviadoEm ??= p.enviadoEm ?? p.atualizadoEm;
        atual.proximaEtapa ??= p.proximaEtapa ?? PROXIMA_ETAPA[p.status];
        if (!atual.resultadoInvalidado && !atual.resultado) atual.resultado = resultadoDemonstracao(p);
      }
    }
    for (const projeto of PROJETOS_ARTBOARDS) {
      const cache = inject(ProjetosService).projetos().find(p => p.id === projeto.id) as Partial<ProjetoCompleto> | undefined;
      if (!cache?.dados) this.projetos.set(projeto.id, structuredClone(projeto));
      else if (projeto.id === 'p3' && cache.status === 'aprovado' && !cache.resultadoInvalidado && !cache.resultado) {
        // Atualiza o cenário legado já aberto no navegador, preservando os dados editados no cache.
        const atual = this.projetos.get(projeto.id)!;
        atual.resultado = structuredClone(projeto.resultado);
        atual.enviadoEm = projeto.enviadoEm;
        atual.proximaEtapa = projeto.proximaEtapa;
      }
    }
  }
}

export const projetosMockInterceptor: HttpInterceptorFn = (req, next) => {
  const rota = /^\/api\/v1\/projects\/([^/?]+)(\/duplicar)?$/.exec(req.url);
  if (!environment.mockApi || !rota) return next(req);
  const store = inject(ProjetosMockStore);
  // Os efeitos acontecem depois da latência e são cancelados ao cancelar a requisição.
  return of(null).pipe(delay(600), mergeMap(() => {
    const id = decodeURIComponent(rota[1]);
    const original = store.projetos.get(id);
    if (!original) return throwError(() => new HttpErrorResponse({ status: 404, url: req.url }));
    if (req.method === 'POST' && rota[2]) {
      const copia: ProjetoHttp = {
        ...structuredClone(original), id: crypto.randomUUID(), nome: `${original.nome} (cópia)`,
        status: 'RASCUNHO', origemId: id, atualizadoEm: new Date().toISOString(), resultadoInvalidado: false, resultado: null,
      };
      store.projetos.set(copia.id, copia);
      return of(new HttpResponse({ status: 201, body: copia }));
    }
    if (!rota[2] && req.method === 'GET') return of(new HttpResponse({ status: 200, body: structuredClone(original) }));
    if (!rota[2] && req.method === 'DELETE') {
      if (original.status !== 'RASCUNHO') return throwError(() => new HttpErrorResponse({ status: 409, url: req.url }));
      store.projetos.delete(id);
      return of(new HttpResponse({ status: 204 }));
    }
    if (!rota[2] && req.method === 'PUT') {
      const atual = { ...original, ...req.body as ProjetoHttp, id, atualizadoEm: new Date().toISOString() };
      store.projetos.set(id, structuredClone(atual));
      return of(new HttpResponse({ status: 200, body: atual }));
    }
    return throwError(() => new HttpErrorResponse({ status: 405, url: req.url }));
  }));
};
