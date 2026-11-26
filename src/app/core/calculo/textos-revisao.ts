/** Concordância em português: 1 → singular; qualquer outro número → plural. */
export const pluralizar = (n: number, singular: string, plural: string): string => (n === 1 ? singular : plural);

/** "1 erro impede o cálculo e 2 pontos merecem atenção." (a parte de atenção some quando é zero). */
export function textoBannerErro(erros: number, alertas: number): string {
  const base = `${erros} ${pluralizar(erros, 'erro impede', 'erros impedem')} o cálculo`;
  return alertas ? `${base} e ${alertas} ${pluralizar(alertas, 'ponto merece', 'pontos merecem')} atenção.` : `${base}.`;
}

export function textoBannerAtencao(alertas: number): string {
  return `${alertas} ${pluralizar(alertas, 'ponto merece', 'pontos merecem')} atenção. Você pode calcular.`;
}

export function textoRodape(erros: number, alertas: number): { texto: string; tom: 'ok' | 'erro' | 'atencao' } {
  if (erros) return { texto: `Corrija ${erros} ${pluralizar(erros, 'erro', 'erros')} para calcular`, tom: 'erro' };
  if (alertas) return { texto: `Pronto para calcular, com ${alertas} ${pluralizar(alertas, 'ponto', 'pontos')} de atenção.`, tom: 'atencao' };
  return { texto: 'Tudo certo para calcular', tom: 'ok' };
}
