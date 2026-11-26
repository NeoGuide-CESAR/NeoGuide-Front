/** Caminho de uma norma (ex.: "/normas/dis-nor-030") com a âncora opcional. */
export function rotaDaNorma(codigo: string, ancora?: string): { commands: string[]; fragment?: string } {
  const slug = codigo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { commands: ['/normas', slug], ...(ancora ? { fragment: ancora } : {}) };
}

/**
 * Destino do cartão "SEÇÃO CONSULTADA" do Neo: a norma e, quando a seção cita uma tabela ou quadro, a âncora dele.
 * Ex.: ("DIS-NOR-030", "Tabela 10") -> /normas/dis-nor-030#tabela-10. Outras seções abrem a norma no topo.
 */
export function rotaDaFonte(documento: string, secao: string): { commands: string[]; fragment?: string } {
  const codigo = /DIS-NOR-0\d\d/i.exec(documento)?.[0];
  if (!codigo) return { commands: ['/normas'] };
  const tabela = /\b(Tabela|Quadro)\s*(\d+)/i.exec(secao);
  return rotaDaNorma(codigo, tabela ? `${tabela[1].toLowerCase()}-${tabela[2]}` : undefined);
}
