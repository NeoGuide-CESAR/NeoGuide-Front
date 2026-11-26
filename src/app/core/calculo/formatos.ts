/** Número em pt-BR com 1 casa decimal (telas). O memorial PDF usa 2 casas e é gerado no back. */
export function decimal(valor: number | null | undefined, casas = 1): string {
  if (valor == null || !Number.isFinite(valor)) return '—';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export const kva = (valor: number | null | undefined): string => `${decimal(valor)} kVA`;

/** "yyyy-MM-dd..." -> "dd/MM/yyyy", sem converter fuso (a data vem como foi gravada). */
export function soData(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

/** "yyyy-MM-ddTHH:mm:ss" (hora local do servidor, sem fuso) -> "dd/MM/yyyy às HH:mm". */
export function dataHora(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}` : '—';
}

/** Potência unitária em pt-BR: pelo menos 1 casa e até 3 (uma lâmpada de 0,02 kW não vira 0,0). */
export function potenciaKw(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) return '—';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 });
}
