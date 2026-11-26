import { pluralizar, textoBannerAtencao, textoBannerErro, textoRodape } from './textos-revisao';

describe('Textos da Revisão (concordância)', () => {
  it('pluraliza só o 1 no singular', () => {
    expect(pluralizar(1, 'ponto', 'pontos')).toBe('ponto');
    expect(pluralizar(0, 'ponto', 'pontos')).toBe('pontos');
    expect(pluralizar(2, 'ponto', 'pontos')).toBe('pontos');
  });
  it('banner de atenção no singular e no plural', () => {
    expect(textoBannerAtencao(1)).toBe('1 ponto merece atenção. Você pode calcular.');
    expect(textoBannerAtencao(2)).toBe('2 pontos merecem atenção. Você pode calcular.');
  });
  it('banner de erro: concordância e parte de atenção opcional', () => {
    expect(textoBannerErro(1, 0)).toBe('1 erro impede o cálculo.');
    expect(textoBannerErro(1, 1)).toBe('1 erro impede o cálculo e 1 ponto merece atenção.');
    expect(textoBannerErro(2, 3)).toBe('2 erros impedem o cálculo e 3 pontos merecem atenção.');
  });
  it('rodapé: erro, atenção e tudo certo', () => {
    expect(textoRodape(1, 0)).toEqual({ texto: 'Corrija 1 erro para calcular', tom: 'erro' });
    expect(textoRodape(2, 5)).toEqual({ texto: 'Corrija 2 erros para calcular', tom: 'erro' });
    expect(textoRodape(0, 1)).toEqual({ texto: 'Pronto para calcular, com 1 ponto de atenção.', tom: 'atencao' });
    expect(textoRodape(0, 3)).toEqual({ texto: 'Pronto para calcular, com 3 pontos de atenção.', tom: 'atencao' });
    expect(textoRodape(0, 0)).toEqual({ texto: 'Tudo certo para calcular', tom: 'ok' });
  });
});
