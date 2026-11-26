import { DadosProjeto } from './dados-projeto';

export interface GrupoResidencial { unidades: number | null; area: number | null; smartStudio: boolean; }
/** Espaço comercial da etapa 4. `ocupacao` é o código da Tabela 22 (catálogo do back). */
export interface EspacoComercial { ocupacao: string; area: number | null; carga: number | null; }
/** Mínimos da etapa comercial, iguais aos validados no back (CommercialStageService). */
export const AREA_MINIMA_ESPACO_M2 = 1;
export const CARGA_MINIMA_ESPACO_KW = 0.5;
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
  /** Quantidade de cada carga da área comum e a potência unitária (kW) de cada uma. */
  cargas: Partial<Record<CampoCarga, number | null>>;
  potencias: Partial<Record<CampoCarga, number | null>>;
  comercial: EspacoComercial[];
  especiais: { pontos: number | null; potenciaVeKw: number | null; potenciaCv: number | null; medidorExclusivo?: boolean | null };
}
export interface RascunhoCalculo { dados: DadosProjeto; complementos: ComplementosCalculo; }
export interface ErroCalculo { etapa: number; campo: string; mensagem: string; }
export const complementosVazios = (): ComplementosCalculo => ({
  residencial: { grupos: [{ unidades: null, area: null, smartStudio: false }] },
  cargas: {}, potencias: {}, comercial: [], especiais: { pontos: null, potenciaVeKw: null, potenciaCv: null },
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
  for (const aba of ABAS_CARGAS) for (const campo of aba.campos) {
    const quantidade = c.cargas[campo.id];
    const potencia = c.potencias[campo.id];
    if ((quantidade ?? 0) > 0 && !positivo(potencia)) erro(2, `potencia-${campo.id}`, 'Informe a potência de cada unidade, em kW.');
  }
  // A etapa comercial é opcional para qualquer tipo de edificação: sem espaços é válida; cada espaço precisa estar completo.
  c.comercial.forEach((e, i) => {
    if (!e.ocupacao.trim()) erro(3, `finalidade-${i}`, 'Escolha a finalidade deste espaço.');
    if (!positivo(e.area)) erro(3, `area-espaco-${i}`, 'Informe a área deste espaço.');
    else if (e.area < AREA_MINIMA_ESPACO_M2) erro(3, `area-espaco-${i}`, 'A área deve ser de pelo menos 1 m².');
    if (!positivo(e.carga)) erro(3, `carga-espaco-${i}`, 'Informe a carga instalada deste espaço.');
    else if (e.carga < CARGA_MINIMA_ESPACO_KW) erro(3, `carga-espaco-${i}`, 'A carga deve ser de pelo menos 0,5 kW.');
  });
  if (dados.temVe) {
    if (!inteiro(c.especiais.pontos)) erro(4, 'pontos', 'Informe uma quantidade inteira, a partir de 1.');
    if (!positivo(c.especiais.potenciaVeKw)) erro(4, 'potenciaVeKw', 'Informe a potência de cada ponto, em kW.');
  }
  if (dados.temBomba && !positivo(c.especiais.potenciaCv)) erro(4, 'potenciaCv', 'Informe uma potência maior que zero, em cv.');
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
  if (v.potencias && typeof v.potencias === 'object') for (const aba of ABAS_CARGAS) for (const f of aba.campos) base.potencias[f.id] = numero(v.potencias[f.id]);
  if (Array.isArray(v.comercial)) base.comercial = v.comercial.filter(e => e && typeof e === 'object').map(e => ({ ocupacao: typeof e.ocupacao === 'string' ? e.ocupacao : '', area: numero(e.area), carga: numero(e.carga) }));
  if (v.especiais) base.especiais = { pontos: numero(v.especiais.pontos), potenciaVeKw: numero(v.especiais.potenciaVeKw), potenciaCv: numero(v.especiais.potenciaCv), medidorExclusivo: typeof v.especiais.medidorExclusivo === 'boolean' ? v.especiais.medidorExclusivo : null };
  return base;
}

/**
 * Espaços comerciais prontos para gravar na API (PUT etapa-comercial).
 * Lista vazia é válida (etapa opcional). Devolve null enquanto a etapa tiver erro, para não gravar dado incompleto.
 */
export function espacosComerciaisParaEnvio(dados: DadosProjeto, c: ComplementosCalculo): EspacoComercial[] | null {
  if (errosCalculo(dados, c).some(e => e.etapa === 3)) return null;
  return c.comercial;
}

/** Tipologias prontas para gravar (PUT etapa-residencial). Null quando não se aplica ou a etapa tem erro. */
export function tipologiasParaEnvio(dados: DadosProjeto, c: ComplementosCalculo): { areaUtilM2: number; quantidadeUnidades: number; smartStudio: boolean }[] | null {
  if (!dados.tipoEdificacao || dados.tipoEdificacao === 'Comercial') return null;
  if (errosCalculo(dados, c).some(e => e.etapa === 1)) return null;
  return c.residencial.grupos.map(g => ({ areaUtilM2: g.area as number, quantidadeUnidades: g.unidades as number, smartStudio: g.smartStudio }));
}

/** VE e motobomba prontos para gravar (PUT etapa-cargas-especiais). Null quando não se aplica ou a etapa tem erro. */
export function especiaisParaEnvio(dados: DadosProjeto, c: ComplementosCalculo): { qtdPontosVe: number | null; potenciaVeKw: number | null; potenciaBombaIncendioCv: number | null; medidorExclusivo: boolean | null } | null {
  if (!dados.temVe && !dados.temBomba) return null;
  if (errosCalculo(dados, c).some(e => e.etapa === 4)) return null;
  return {
    qtdPontosVe: dados.temVe ? c.especiais.pontos : 0,
    potenciaVeKw: dados.temVe ? c.especiais.potenciaVeKw : null,
    potenciaBombaIncendioCv: dados.temBomba ? c.especiais.potenciaCv : null,
    medidorExclusivo: dados.temBomba ? (c.especiais.medidorExclusivo ?? false) : null,
  };
}

/** Como cada carga da tela é gravada no servidor: origem, submódulo e tipo de equipamento que o motor de cálculo reconhece. */
const CARGAS_NO_SERVIDOR: Record<CampoCarga, { origem: 'CATALOGO' | 'PERSONALIZADO'; submodulo: string; tipo: string }> = {
  tomadas: { origem: 'CATALOGO', submodulo: 'ILUMINACAO_TUG', tipo: 'TUG' },
  lampadas: { origem: 'CATALOGO', submodulo: 'ILUMINACAO_TUG', tipo: 'ILUMINACAO' },
  aquecedoresRapidos: { origem: 'CATALOGO', submodulo: 'AQUECIMENTO', tipo: 'AQUECEDOR_PASSAGEM' },
  chuveiros: { origem: 'CATALOGO', submodulo: 'AQUECIMENTO', tipo: 'CHUVEIRO' },
  torneiras: { origem: 'CATALOGO', submodulo: 'AQUECIMENTO', tipo: 'TORNEIRA' },
  secadoras: { origem: 'PERSONALIZADO', submodulo: 'CLIMATIZACAO', tipo: 'SECADORA' },
  lavadoras: { origem: 'PERSONALIZADO', submodulo: 'CLIMATIZACAO', tipo: 'LAVADORA' },
  lavaLoucas: { origem: 'PERSONALIZADO', submodulo: 'CLIMATIZACAO', tipo: 'LAVA_LOUCAS' },
  microondas: { origem: 'PERSONALIZADO', submodulo: 'CLIMATIZACAO', tipo: 'MICROONDAS' },
  arCondicionado: { origem: 'CATALOGO', submodulo: 'CLIMATIZACAO', tipo: 'AR_CONDICIONADO' },
  fornos: { origem: 'CATALOGO', submodulo: 'COCCAO', tipo: 'FORNO' },
  fogoes: { origem: 'CATALOGO', submodulo: 'COCCAO', tipo: 'COOKTOP' },
  bombasHidraulicas: { origem: 'CATALOGO', submodulo: 'MOTORES', tipo: 'BOMBA_HIDRAULICA' },
  elevadoresPortoes: { origem: 'PERSONALIZADO', submodulo: 'MOTORES', tipo: 'ELEVADOR_PORTAO' },
  bombasPiscina: { origem: 'PERSONALIZADO', submodulo: 'MOTORES', tipo: 'BOMBA_PISCINA' },
  boilers: { origem: 'CATALOGO', submodulo: 'AQUECIMENTO', tipo: 'BOILER' },
};

export interface CargaAreaComumEnvio {
  origem: string; submodulo: string; tipoEquipamento: string; descricao: string;
  quantidade: number; potenciaNominalKw: number; fatorPotencia: number; fatorDemanda: number; isReserva: boolean;
}

/**
 * Cargas da área comum prontas para gravar (PUT etapa-area-comum), na ordem da tela.
 * Null enquanto a etapa tiver erro ou nenhuma carga tiver quantidade (o servidor não aceita lista vazia).
 */
export function cargasParaEnvio(dados: DadosProjeto, c: ComplementosCalculo): CargaAreaComumEnvio[] | null {
  if (!dados.tipoEdificacao || errosCalculo(dados, c).some(e => e.etapa === 2)) return null;
  const itens: CargaAreaComumEnvio[] = [];
  for (const aba of ABAS_CARGAS) for (const campo of aba.campos) {
    const quantidade = c.cargas[campo.id] ?? 0;
    if (quantidade <= 0) continue;
    const destino = CARGAS_NO_SERVIDOR[campo.id];
    itens.push({
      origem: destino.origem, submodulo: destino.submodulo, tipoEquipamento: destino.tipo, descricao: campo.nome,
      quantidade, potenciaNominalKw: c.potencias[campo.id] as number, fatorPotencia: 1, fatorDemanda: 1, isReserva: false,
    });
  }
  return itens.length ? itens : null;
}

/** Cargas gravadas no servidor -> quantidades e potências da tela. */
export function cargasDoServidor(cargas: { tipoEquipamento: string | null; quantidade: number | null; potenciaNominalKw: number | null }[]): Pick<ComplementosCalculo, 'cargas' | 'potencias'> {
  const resultado: Pick<ComplementosCalculo, 'cargas' | 'potencias'> = { cargas: {}, potencias: {} };
  for (const carga of cargas) {
    const campo = (Object.keys(CARGAS_NO_SERVIDOR) as CampoCarga[]).find(k => CARGAS_NO_SERVIDOR[k].tipo === (carga.tipoEquipamento ?? '').toUpperCase());
    if (!campo) continue;
    resultado.cargas[campo] = carga.quantidade;
    resultado.potencias[campo] = carga.potenciaNominalKw;
  }
  return resultado;
}
