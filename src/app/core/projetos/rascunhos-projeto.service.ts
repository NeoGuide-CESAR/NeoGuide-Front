import { Injectable, inject } from '@angular/core';
import { DadosProjeto, dadosExemplo, normalizarDados } from './dados-projeto';
import { ProjetosService } from './projetos.service';
import { ComplementosCalculo, RascunhoCalculo, complementosVazios, lerComplementos } from './dados-calculo';

/** Persistência local para testar a prancheta; não representa criação no backend. */
@Injectable({ providedIn: 'root' })
export class RascunhosProjetoService {
  private readonly projetos = inject(ProjetosService);
  carregar(id: string): DadosProjeto | null {
    const salvo = localStorage.getItem(`neoguide.rascunho.${id}`);
    if (salvo) { const valor = JSON.parse(salvo); return normalizarDados(valor.dados ?? valor); }
    const mock = this.projetos.projetos().find(p => p.id === id);
    return mock ? { ...dadosExemplo(), nome: mock.nome, tipoEdificacao: id === 'p5' ? 'Comercial' : 'Residencial multifamiliar' } : null;
  }
  salvar(dados: DadosProjeto, id?: string): string {
    const complementos = id ? this.carregarCompleto(id)?.complementos ?? complementosVazios() : complementosVazios();
    return this.salvarCompleto(dados, complementos, id);
  }
  carregarCompleto(id: string): RascunhoCalculo | null {
    const dados = this.carregar(id);
    if (!dados) return null;
    const salvo = localStorage.getItem(`neoguide.rascunho.${id}`);
    return { dados, complementos: lerComplementos(salvo ? JSON.parse(salvo).complementos : null) };
  }
  salvarCompleto(dados: DadosProjeto, complementos: ComplementosCalculo, id?: string): string {
    const identificador = id ?? `rascunho-${crypto.randomUUID()}`;
    localStorage.setItem(`neoguide.rascunho.${identificador}`, JSON.stringify({ versao: 2, dados: normalizarDados(dados), complementos: lerComplementos(complementos) }));
    return identificador;
  }
}
