import { Injectable } from '@angular/core';
import { DadosProjeto, normalizarDados } from './dados-projeto';
import { ComplementosCalculo, RascunhoCalculo, complementosVazios, lerComplementos } from './dados-calculo';

const CHAVE_RASCUNHO = (id: string) => `neoguide.rascunho.${id}`;
const CHAVE_COMPLEMENTOS = (id: string) => `neoguide.complementos.${id}`;

/**
 * Armazenamento local do wizard.
 * - Rascunhos sem id no back (`rascunho-*`): dados e etapas ficam neste navegador.
 * - Projetos do back: o passo 1 vai para a API; as etapas (complementos) ficam neste navegador,
 *   por id do projeto, até cada etapa ser integrada com a API.
 */
@Injectable({ providedIn: 'root' })
export class RascunhosProjetoService {
  carregar(id: string): DadosProjeto | null {
    const salvo = lerJson(CHAVE_RASCUNHO(id));
    return salvo ? normalizarDados(salvo.dados ?? salvo) : null;
  }

  salvar(dados: DadosProjeto, id?: string): string {
    const complementos = id ? this.carregarCompleto(id)?.complementos ?? complementosVazios() : complementosVazios();
    return this.salvarCompleto(dados, complementos, id);
  }

  carregarCompleto(id: string): RascunhoCalculo | null {
    const dados = this.carregar(id);
    if (!dados) return null;
    const salvo = lerJson(CHAVE_RASCUNHO(id));
    return { dados, complementos: lerComplementos(salvo?.complementos ?? null) };
  }

  salvarCompleto(dados: DadosProjeto, complementos: ComplementosCalculo, id?: string): string {
    const identificador = id ?? `rascunho-${crypto.randomUUID()}`;
    localStorage.setItem(CHAVE_RASCUNHO(identificador), JSON.stringify({ versao: 2, dados: normalizarDados(dados), complementos: lerComplementos(complementos) }));
    return identificador;
  }

  /** Etapas de um projeto do back, guardadas neste navegador. */
  carregarComplementos(projetoId: string): ComplementosCalculo {
    return lerComplementos(lerJson(CHAVE_COMPLEMENTOS(projetoId)));
  }

  salvarComplementos(projetoId: string, complementos: ComplementosCalculo): void {
    localStorage.setItem(CHAVE_COMPLEMENTOS(projetoId), JSON.stringify(lerComplementos(complementos)));
  }
}

function lerJson(chave: string): any | null {
  const bruto = localStorage.getItem(chave);
  return bruto ? JSON.parse(bruto) : null;
}
