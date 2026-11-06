import { Projeto, ResultadoCalculo } from './projeto.model';
import { DadosProjeto, dadosVazios, normalizarDados } from './dados-projeto';
import { ComplementosCalculo, RascunhoCalculo, lerComplementos } from './dados-calculo';

/** Contrato provisório a validar com NEO-38/NEO-40. Status HTTP usa caixa alta. */
export interface ProjetoHttp {
  id: string;
  nome: string;
  status: string;
  cep: string;
  logradouro: string;
  bairro: string;
  municipio: string;
  uf: string;
  tipoEdificacao: DadosProjeto['tipoEdificacao'];
  temVe: boolean;
  temBomba: boolean;
  complementos?: ComplementosCalculo;
  origemId?: string;
  atualizadoEm?: string;
  resultadoInvalidado?: boolean;
  resultado?: ResultadoCalculo | null;
  enviadoEm?: string;
  proximaEtapa?: string;
}
export interface ProjetoCompleto extends Projeto, RascunhoCalculo { origemId?: string; }

export function lerProjetoHttp(p: ProjetoHttp): ProjetoCompleto {
  const status = p.status.toLowerCase() as Projeto['status'];
  const dados = normalizarDados({ ...dadosVazios(), ...p, endereco: p.logradouro });
  return {
    id: p.id, nome: p.nome, status, atualizadoEm: p.atualizadoEm ?? new Date().toISOString(),
    endereco: dados.endereco, tipoEdificacao: dados.tipoEdificacao, origemId: p.origemId,
    resultadoInvalidado: p.resultadoInvalidado, dados, complementos: lerComplementos(p.complementos),
    resultado: p.resultadoInvalidado ? null : p.resultado ?? null,
    enviadoEm: p.enviadoEm, proximaEtapa: p.proximaEtapa,
  };
}

export function escreverProjetoHttp(p: ProjetoCompleto, r: RascunhoCalculo): ProjetoHttp {
  const dados = normalizarDados(r.dados);
  const { endereco, ...campos } = dados;
  return {
    ...campos, id: p.id, status: p.status.toUpperCase(), logradouro: endereco,
    complementos: r.complementos, origemId: p.origemId, resultadoInvalidado: p.resultadoInvalidado,
    resultado: p.resultadoInvalidado ? null : p.resultado,
    atualizadoEm: p.atualizadoEm, enviadoEm: p.enviadoEm, proximaEtapa: p.proximaEtapa,
  };
}
