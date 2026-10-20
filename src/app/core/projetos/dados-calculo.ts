import { DadosProjeto } from './dados-projeto';

export interface GrupoResidencial { unidades: number | null; area: number | null; smartStudio: boolean; }
export interface EspacoComercial { finalidade: string; area: number | null; }
export const ABAS_CARGAS = [
  { titulo: 'Tomadas e lâmpadas', campos: [
    { id: 'tomadas', nome: 'Tomadas (a)' }, { id: 'lampadas', nome: 'Lâmpadas (a)' },
  ] },
  { titulo: 'Aquecimento e eletrodomésticos', campos: [
    { id: 'aquecedoresRapidos', nome: 'Aquecedores rápidos (b)' }, { id: 'chuveiros', nome: 'Chuveiros elétricos (b)' },
    { id: 'torneiras', nome: 'Torneiras elétricas (b)' }, { id: 'secadoras', nome: 'Secadoras (d)' },
    { id: 'lavadoras', nome: 'Lavadoras (d)' }, { id: 'lavaLoucas', nome: 'Lava-louças (d)' },
    { id: 'microondas', nome: 'Micro-ondas (d)' }, { id: 'arCondicionado', nome: 'Ar-condicionado (f)' },
  ] },
  { titulo: 'Fornos e fogões', campos: [
    { id: 'fornos', nome: 'Fornos elétricos (e)' }, { id: 'fogoes', nome: 'Fogões completos / cooktops de indução (e)' },
  ] },
  { titulo: 'Motores e equipamentos', campos: [
    { id: 'bombasHidraulicas', nome: 'Motores comuns: bombas hidráulicas (g)' },
    { id: 'elevadoresPortoes', nome: 'Equipamentos especiais: elevadores e portões (h)' },
    { id: 'bombasPiscina', nome: 'Bombas de piscina e hidromassagem (i)' },
    { id: 'boilers', nome: 'Aquecedores / boilers (c)' },
  ] },
] as const;
export type CampoCarga = typeof ABAS_CARGAS[number]['campos'][number]['id'];
export interface ComplementosCalculo {
  residencial: { grupos: GrupoResidencial[] };
  cargas: Partial<Record<CampoCarga, number | null>>;
  comercial: EspacoComercial[];
  especiais: { pontos: number | null; bombas: number | null; potenciaCv: number | null };
}
export interface RascunhoCalculo { dados: DadosProjeto; complementos: ComplementosCalculo; }
export interface ErroCalculo { etapa: number; campo: string; mensagem: string; }
export const complementosVazios = (): ComplementosCalculo => ({
  residencial: { grupos: [{ unidades: null, area: null, smartStudio: false }] },
  cargas: {}, comercial: [], especiais: { pontos: null, bombas: null, potenciaCv: null },
});
const positivo = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
const inteiro = (n: unknown): n is number => positivo(n) && Number.isInteger(n);

/** Validação das entradas; as fórmulas de demanda pertencem ao serviço de cálculo. */
export function errosCalculo(dados: DadosProjeto, c: ComplementosCalculo): ErroCalculo[] {
  const erros: ErroCalculo[] = [];
  const erro = (etapa: number, campo: string, mensagem: string) => erros.push({ etapa, campo, mensagem });
  if (dados.tipoEdificacao && dados.tipoEdificacao !== 'Comercial') {
    if (!c.residencial.grupos.length) erro(1, 'adicionar-grupo', 'Adicione ao menos um grupo de unidades.');
    c.residencial.grupos.forEach((g, i) => {
      if (!inteiro(g.unidades)) erro(1, `unidades-${i}`, 'Informe uma quantidade inteira, a partir de 1.');
      if (!positivo(g.area)) erro(1, `area-grupo-${i}`, 'Informe a área em m².');
    });
  }
  for (const aba of ABAS_CARGAS) for (const campo of aba.campos) {
    const valor = c.cargas[campo.id];
    if (valor != null && (!Number.isFinite(valor) || !Number.isInteger(valor) || valor < 0)) {
      erro(2, campo.id, 'Informe uma quantidade inteira, a partir de 0.');
    }
  }
  if (dados.tipoEdificacao && dados.tipoEdificacao !== 'Residencial multifamiliar') c.comercial.forEach((e, i) => {
    if (!e.finalidade.trim()) erro(3, `finalidade-${i}`, 'Informe a finalidade do espaço.');
    if (!positivo(e.area)) erro(3, `area-espaco-${i}`, 'Informe a área em m².');
  });
  if (dados.temVe && !inteiro(c.especiais.pontos)) erro(4, 'pontos', 'Informe uma quantidade inteira, a partir de 1.');
  if (dados.temBomba) {
    if (!inteiro(c.especiais.bombas)) erro(4, 'bombas', 'Informe uma quantidade inteira, a partir de 1.');
    if (!positivo(c.especiais.potenciaCv)) erro(4, 'potenciaCv', 'Informe uma potência maior que zero, em cv.');
  }
  return erros;
}

/** Lê somente os campos conhecidos; rascunhos antigos continuam abrindo na etapa 1. */
export function lerComplementos(valor: unknown): ComplementosCalculo {
  const base = complementosVazios();
  if (!valor || typeof valor !== 'object') return base;
  const v = valor as Partial<ComplementosCalculo>;
  const numero = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? n : null;
  // Antes a seleção valia para todo o projeto; preserva essa escolha nos grupos legados.
  const smartStudioLegado = (v.residencial as { smartStudio?: unknown } | undefined)?.smartStudio === true;
  if (Array.isArray(v.residencial?.grupos)) base.residencial.grupos = v.residencial.grupos.filter(g => g && typeof g === 'object').map(g => ({ unidades: numero(g.unidades), area: numero(g.area), smartStudio: typeof g.smartStudio === 'boolean' ? g.smartStudio : smartStudioLegado }));
  if (v.cargas && typeof v.cargas === 'object') for (const aba of ABAS_CARGAS) for (const f of aba.campos) base.cargas[f.id] = numero(v.cargas[f.id]);
  if (Array.isArray(v.comercial)) base.comercial = v.comercial.filter(e => e && typeof e === 'object').map(e => ({ finalidade: typeof e.finalidade === 'string' ? e.finalidade : '', area: numero(e.area) }));
  if (v.especiais) base.especiais = { pontos: numero(v.especiais.pontos), bombas: numero(v.especiais.bombas), potenciaCv: numero(v.especiais.potenciaCv) };
  return base;
}
