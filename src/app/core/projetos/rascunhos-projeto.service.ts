import { Injectable, inject } from '@angular/core';
import { DadosProjeto, dadosExemplo, normalizarDados } from './dados-projeto';
import { ProjetosService } from './projetos.service';
import { ComplementosCalculo, RascunhoCalculo, complementosVazios, lerComplementos } from './dados-calculo';
import { chaveEndereco } from './endereco-projeto';

function chaveCalculo(r: RascunhoCalculo): string {
  return JSON.stringify([r.dados.tipoEdificacao, r.dados.temVe, r.dados.temBomba, chaveEndereco(r.dados), lerComplementos(r.complementos)]);
}

/** Persistência local para testar a prancheta; não representa criação no backend. */
@Injectable({ providedIn: 'root' })
export class RascunhosProjetoService {
  private readonly projetos = inject(ProjetosService);
  carregar(id: string): DadosProjeto | null {
    const salvo = localStorage.getItem(`neoguide.rascunho.${id}`);
    if (salvo) { const valor = JSON.parse(salvo); return normalizarDados(valor.dados ?? valor); }
    const mock = this.projetos.projetos().find(p => p.id === id);
    return mock ? { ...dadosExemplo(), nome: mock.nome, endereco: mock.endereco ?? dadosExemplo().endereco, tipoEdificacao: mock.tipoEdificacao === 'Comercial' ? 'Comercial' : 'Residencial multifamiliar' } : null;
  }
  salvar(dados: DadosProjeto, id?: string): string {
    const complementos = id ? this.carregarCompleto(id)?.complementos ?? complementosVazios() : complementosVazios();
    return this.salvarCompleto(dados, complementos, id);
  }
  carregarCompleto(id: string): RascunhoCalculo | null {
    const dados = this.carregar(id);
    if (!dados) return null;
    const salvo = localStorage.getItem(`neoguide.rascunho.${id}`);
    const valor = salvo ? JSON.parse(salvo) : null;
    return { dados, complementos: lerComplementos(valor?.complementos) };
  }
  salvarCompleto(dados: DadosProjeto, complementos: ComplementosCalculo, id?: string): string {
    const identificador = id ?? `rascunho-${crypto.randomUUID()}`;
    const anterior = id ? this.carregarCompleto(id) : null;
    const atual = { dados: normalizarDados(dados), complementos: lerComplementos(complementos) };
    const projeto = this.projetos.projetos().find(p => p.id === identificador);
    const mudouCalculo = anterior && chaveCalculo(anterior) !== chaveCalculo(atual);
    const chave = `neoguide.rascunho.${identificador}`;
    const salvoAnterior = localStorage.getItem(chave);
    localStorage.setItem(chave, JSON.stringify({ versao: 2, ...atual }));
    try {
      this.projetos.atualizar({
        ...projeto, id: identificador, nome: atual.dados.nome, tipoEdificacao: atual.dados.tipoEdificacao,
        endereco: atual.dados.endereco, atualizadoEm: new Date().toISOString(),
        status: mudouCalculo ? 'rascunho' : projeto?.status ?? 'rascunho',
        resultadoInvalidado: projeto?.resultadoInvalidado || !!(mudouCalculo && projeto && projeto.status !== 'rascunho'),
      });
    } catch (erro) {
      if (salvoAnterior) localStorage.setItem(chave, salvoAnterior);
      else localStorage.removeItem(chave);
      throw erro;
    }
    return identificador;
  }
}
