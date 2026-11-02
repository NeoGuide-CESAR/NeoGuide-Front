import { sanitizarRetorno } from './return-url';

describe('sanitizarRetorno', () => {
  it('aceita caminhos internos', () => {
    expect(sanitizarRetorno('/meus-projetos?status=em-analise')).toBe('/meus-projetos?status=em-analise');
  });

  it('recusa URLs externas, protocolo relativo e valores vazios', () => {
    expect(sanitizarRetorno('https://exemplo.com')).toBeNull();
    expect(sanitizarRetorno('//exemplo.com')).toBeNull();
    expect(sanitizarRetorno('/\\exemplo.com')).toBeNull();
    expect(sanitizarRetorno('inicio')).toBeNull();
    expect(sanitizarRetorno('')).toBeNull();
    expect(sanitizarRetorno(null)).toBeNull();
  });
});
