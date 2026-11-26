import { convertToParamMap } from '@angular/router';
import { ParametrosListagem, lerParametros, paraQueryParams } from './listagem';

const BASE: ParametrosListagem = { busca: '', status: 'todos', ordem: 'recentes', pagina: 1, tamanho: 10 };

describe('listagem de projetos: parâmetros da URL', () => {
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
