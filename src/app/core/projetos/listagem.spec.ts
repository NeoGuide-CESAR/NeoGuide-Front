import { convertToParamMap } from '@angular/router';
import { Projeto } from './projeto.model';
import {
  ParametrosListagem,
  calcularListagem,
  lerParametros,
  normalizarTexto,
  paraQueryParams,
} from './listagem';

const PROJETOS: Projeto[] = [
  { id: 'a', nome: 'Edifício Ação', status: 'rascunho', atualizadoEm: '2026-10-01', endereco: 'Rua A, 1' },
  { id: 'b', nome: 'Condomínio Boa Vista', status: 'em_analise', atualizadoEm: '2026-10-05', endereco: 'Av. Boa Viagem, 9' },
  { id: 'c', nome: 'Residencial Jardim', status: 'aprovado', atualizadoEm: '2026-09-01', endereco: 'Rua das Flores' },
  { id: 'd', nome: 'Sala Comercial', status: 'reprovado', atualizadoEm: '2026-08-01', endereco: 'Rua B' },
  { id: 'e', nome: 'Zeta Residencial', status: 'reprovado', atualizadoEm: '2026-07-01', endereco: 'Rua C' },
];

const BASE: ParametrosListagem = { busca: '', status: 'todos', ordem: 'recentes', pagina: 1, tamanho: 10 };

describe('listagem de projetos', () => {
  it('normaliza acento, caixa e espaços extras', () => {
    expect(normalizarTexto('  Ação   Boa  ')).toBe('acao boa');
  });

  it('busca ignorando acentos e espaços extras, em nome e endereço', () => {
    expect(calcularListagem(PROJETOS, { ...BASE, busca: '  acao ' }).itens.map((p) => p.id)).toEqual(['a']);
    expect(calcularListagem(PROJETOS, { ...BASE, busca: 'BOA   VIAGEM' }).itens.map((p) => p.id)).toEqual(['b']);
  });

  it('contagens respeitam a busca, mas não o filtro de status', () => {
    const r = calcularListagem(PROJETOS, { ...BASE, busca: 'residencial', status: 'aprovado' });
    expect(r.totais).toEqual({ todos: 2, rascunho: 0, em_analise: 0, aprovado: 1, reprovado: 1 });
    expect(r.total).toBe(1);
    expect(r.totalGeral).toBe(5);
  });

  it('ordena por mais recentes, mais antigos e nome A–Z', () => {
    const ids = (ordem: ParametrosListagem['ordem']) => calcularListagem(PROJETOS, { ...BASE, ordem }).itens.map((p) => p.id);
    expect(ids('recentes')).toEqual(['b', 'a', 'c', 'd', 'e']);
    expect(ids('antigos')).toEqual(['e', 'd', 'c', 'a', 'b']);
    expect(ids('az')).toEqual(['b', 'a', 'c', 'd', 'e']);
  });

  it('pagina e corrige a página quando passa do fim', () => {
    const r = calcularListagem(PROJETOS, { ...BASE, tamanho: 2, pagina: 9 });
    expect(r.totalPaginas).toBe(3);
    expect(r.pagina).toBe(3);
    expect(r.itens.map((p) => p.id)).toEqual(['e']);
  });

  it('lê a query string e cai nos padrões quando o valor é inválido', () => {
    const p = lerParametros(convertToParamMap({ status: 'em-analise', busca: 'boa', ordem: 'az', pagina: '2', tamanho: '20' }));
    expect(p).toEqual({ busca: 'boa', status: 'em_analise', ordem: 'az', pagina: 2, tamanho: 20 });

    const invalido = lerParametros(convertToParamMap({ status: 'xyz', ordem: 'nada', pagina: '-3', tamanho: '7' }));
    expect(invalido).toEqual({ busca: '', status: 'todos', ordem: 'recentes', pagina: 1, tamanho: 10 });
  });

  it('gera query params sem valores padrão, para a URL ficar limpa', () => {
    expect(paraQueryParams(BASE)).toEqual({ busca: null, status: null, ordem: null, pagina: null, tamanho: null });
    expect(paraQueryParams({ busca: ' boa ', status: 'em_analise', ordem: 'antigos', pagina: 2, tamanho: 20 })).toEqual({
      busca: 'boa',
      status: 'em-analise',
      ordem: 'antigos',
      pagina: 2,
      tamanho: 20,
    });
  });
});
