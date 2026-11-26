import { rotaDaFonte, rotaDaNorma } from './rotas-normas';

describe('rotas das normas', () => {
  it('rotaDaNorma monta o caminho em minúsculas, com âncora opcional', () => {
    expect(rotaDaNorma('DIS-NOR-053')).toEqual({ commands: ['/normas', 'dis-nor-053'] });
    expect(rotaDaNorma('DIS-NOR-030', 'tabela-10')).toEqual({ commands: ['/normas', 'dis-nor-030'], fragment: 'tabela-10' });
  });

  it('o cartão de fonte do Neo leva à tabela citada', () => {
    expect(rotaDaFonte('DIS-NOR-030', 'Tabela 10')).toEqual({ commands: ['/normas', 'dis-nor-030'], fragment: 'tabela-10' });
    expect(rotaDaFonte('DIS-NOR-053', 'Quadro 35')).toEqual({ commands: ['/normas', 'dis-nor-053'], fragment: 'quadro-35' });
  });

  it('seção sem tabela abre a norma no topo; documento desconhecido abre a lista de normas', () => {
    expect(rotaDaFonte('DIS-NOR-053', 'Item 6.2.4')).toEqual({ commands: ['/normas', 'dis-nor-053'] });
    expect(rotaDaFonte('Outro documento', 'Tabela 1')).toEqual({ commands: ['/normas'] });
  });
});
