import { decimal } from '../calculo/formatos';

/** Uma linha de catálogo como o back devolve (campos variam por tabela). */
export type LinhaCatalogo = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface ColunaTabela {
  /** Nome da coluna como na norma (não o nome técnico do JSON). */
  titulo: string;
  valor: (linha: LinhaCatalogo, indice: number, todas: LinhaCatalogo[]) => string;
  /** Números ficam à direita. */
  direita?: boolean;
}

export interface ModeloTabela {
  colunas: ColunaTabela[];
  /** Extrai as linhas da resposta (algumas vêm dentro de um objeto com `faixas` ou `tabela`). */
  linhas: (resposta: any) => LinhaCatalogo[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Faixa numérica da linha, para o filtro rápido por valor (ex.: 68 m² cai na faixa 66–70). */
  intervalo?: (linha: LinhaCatalogo, indice: number, todas: LinhaCatalogo[]) => [number, number] | null;
  /** Observação exibida abaixo da tabela, vinda dos dados (ex.: fator de potência da tabela). */
  rodape?: (resposta: any) => string | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Palavras que levam a busca até a tabela, além do título. */
  termos: string;
}

const n = (v: number | null | undefined, casas = 2): string => decimal(v, casas);
const vezes = (texto: string | null | undefined): string => (texto ?? '—').replace(/ x /g, ' × ');
const lista = (r: any): LinhaCatalogo[] => (Array.isArray(r) ? r : []); // eslint-disable-line @typescript-eslint/no-explicit-any

/** Faixa de demanda "165 < De ≤ 211" pela linha anterior (Tabelas 1 a 3 do Anexo II). */
function faixaDeDemanda(l: LinhaCatalogo, i: number, todas: LinhaCatalogo[], simbolo: string): string {
  const anterior = i > 0 ? todas[i - 1]['maxDemandaKva'] : 0;
  return `${n(anterior, 0)} < ${simbolo} ≤ ${n(l['maxDemandaKva'], 0)}`;
}
const intervaloDeDemanda = (l: LinhaCatalogo, i: number, todas: LinhaCatalogo[]): [number, number] =>
  [i > 0 ? Number(todas[i - 1]['maxDemandaKva']) : 0, Number(l['maxDemandaKva'])];

/** Faixa de potência de partida: "até 5,0", "5,1 a 15,0" ou "—". */
function faixaCv(min: number | null, max: number | null): string {
  if (min == null && max == null) return '—';
  if (min == null) return `até ${n(max, 1)}`;
  return max == null ? `acima de ${n(min, 1)}` : `${n(min, 1)} a ${n(max, 1)}`;
}

const ENTRADA: ModeloTabela = {
  linhas: lista,
  intervalo: intervaloDeDemanda,
  termos: 'entrada de serviço disjuntor cabo condutor eletroduto',
  colunas: [
    { titulo: 'Demanda máxima da edificação (kVA)', valor: (l, i, t) => faixaDeDemanda(l, i, t, 'De') },
    { titulo: 'Circuitos', valor: l => String(l['circuitos']), direita: true },
    { titulo: 'Seção do condutor', valor: l => vezes(l['secaoCondutor']) },
    { titulo: 'Duto PEAD (mm)', valor: l => vezes(l['dutoPead']) },
    { titulo: 'Duto de aço (mm)', valor: l => vezes(l['dutoAco']) },
    { titulo: 'Corrente total (A)', valor: l => String(l['correnteTotalA']), direita: true },
    { titulo: 'Carcaça do disjuntor', valor: l => l['disjuntorCarcaca'] ?? '—' },
    { titulo: 'Disjuntor geral (A)', valor: l => String(l['disjuntorCorrenteA']), direita: true },
  ],
};

export const MODELOS: Record<string, ModeloTabela> = {
  'quadro-35': {
    linhas: lista,
    intervalo: l => [Number(l['minAreaM2']), Number(l['maxAreaM2'])],
    termos: 'área útil demanda apartamento método da área',
    colunas: [
      { titulo: 'Área útil do apartamento', valor: l => l['rotulo'] },
      { titulo: 'Demanda do apartamento (kVA)', valor: l => n(l['demandaUnitariakVa']), direita: true },
    ],
  },
  'quadro-36': {
    linhas: r => r?.tabela ?? [],
    termos: 'fator de coincidência número de apartamentos smart studio',
    colunas: [
      { titulo: 'Número de apartamentos', valor: l => String(l['totalApartamentos']), direita: true },
      { titulo: 'Fator de coincidência', valor: l => `${n(Number(l['fatorCoincidencia']) * 100, 2)}%`, direita: true },
    ],
    rodape: r => r?.regraEspecialStudios ?? null,
  },
  'quadro-37': {
    linhas: lista,
    intervalo: l => [Number(l['minDrKva']), Number(l['maxDrKva'])],
    termos: 'fator de segurança fr demanda bruta',
    colunas: [
      { titulo: 'Demanda bruta Dr (kVA)', valor: l => (Number(l['maxDrKva']) >= 9999 ? `acima de ${n(Math.floor(Number(l['minDrKva'])), 0)}` : `${n(l['minDrKva'])} a ${n(l['maxDrKva'])}`) },
      { titulo: 'Fator de segurança Fr', valor: l => n(l['fatorSegurancaFr']), direita: true },
    ],
  },
  'quadro-33': {
    linhas: lista,
    termos: 'recarga veicular veículo elétrico vagas ve',
    colunas: [
      { titulo: 'Vagas de recarga', valor: l => l['faixa'] },
      { titulo: 'Fator de demanda', valor: l => n(l['fatorSimultaneidade']), direita: true },
    ],
  },
  'tabela-2': ENTRADA,
  'tabela-1': ENTRADA,
  'tabela-3': {
    linhas: lista,
    intervalo: intervaloDeDemanda,
    termos: 'barramento qdg cobre quadro geral',
    colunas: [
      { titulo: 'Demanda do QDG (kVA)', valor: (l, i, t) => faixaDeDemanda(l, i, t, 'DQDG') },
      { titulo: 'Barra de cobre (mm)', valor: l => vezes(l['dimensaoMm']) },
      { titulo: 'Barra de cobre (pol)', valor: l => vezes(l['dimensaoPol']) },
      { titulo: 'Corrente nominal (A)', valor: l => String(l['correnteNominalA']), direita: true },
    ],
  },
  'tabela-7': {
    linhas: r => r?.faixas ?? [],
    termos: 'chuveiro torneira aquecedor de passagem ferro',
    colunas: [
      { titulo: 'Número de aparelhos', valor: l => String(l['quantidadeAparelhos']), direita: true },
      { titulo: 'Fator de demanda', valor: l => n(l['fatorDemanda']), direita: true },
    ],
    rodape: r => (r?.fatorPotencia != null ? `Fator de potência da tabela: ${n(r.fatorPotencia)}` : null),
  },
  'tabela-8': {
    linhas: r => r?.faixas ?? [],
    termos: 'boiler aquecedor central acumulação',
    colunas: [
      { titulo: 'Número de aquecedores', valor: l => String(l['quantidadeBoilers']), direita: true },
      { titulo: 'Fator de demanda', valor: l => n(l['fatorDemanda']), direita: true },
    ],
    rodape: r => (r?.fatorPotencia != null ? `Fator de potência da tabela: ${n(r.fatorPotencia)}` : null),
  },
  'tabela-9': {
    linhas: lista,
    termos: 'secadora forno elétrico lavadora lava-louça micro-ondas eletrodoméstico',
    colunas: [
      { titulo: 'Número de aparelhos', valor: l => l['faixa'] },
      { titulo: 'Fator de demanda', valor: l => n(l['fatorDemanda']), direita: true },
      { titulo: 'Fator de potência', valor: l => n(l['fatorPotencia']), direita: true },
    ],
  },
  'tabela-10': {
    linhas: r => r?.faixas ?? [],
    termos: 'fogão cooktop indução fogões elétricos',
    colunas: [
      { titulo: 'Número de fogões', valor: l => String(l['quantidade']), direita: true },
      { titulo: 'Fator de demanda', valor: l => n(l['fatorDemanda']), direita: true },
    ],
    rodape: r => (r?.fatorPotencia != null ? `Fator de potência da tabela: ${n(r.fatorPotencia)}` : null),
  },
  'tabela-11': {
    linhas: lista,
    termos: 'condicionador de ar ar-condicionado btu',
    colunas: [
      { titulo: 'Capacidade (BTU/h)', valor: l => n(l['capacidadeBtu'], 0), direita: true },
      { titulo: 'Potência ativa (W)', valor: l => n(l['potenciaAtivaW'], 0), direita: true },
      { titulo: 'Potência aparente (VA)', valor: l => n(l['potenciaAparenteVa'], 0), direita: true },
      { titulo: 'Tensão (V)', valor: l => String(l['tensaoV']), direita: true },
      { titulo: 'Corrente (A)', valor: l => n(l['corrente220vA']), direita: true },
      { titulo: 'Fator de potência', valor: l => n(l['fatorPotencia']), direita: true },
    ],
  },
  'tabela-12': {
    linhas: r => r?.faixas ?? [],
    termos: 'fator de demanda condicionador de ar ar-condicionado',
    colunas: [
      { titulo: 'Número de aparelhos', valor: l => l['faixaAparelhos'] },
      { titulo: 'Fator (comercial)', valor: l => n(l['fatorComercial']), direita: true },
      { titulo: 'Fator (residencial)', valor: l => n(l['fatorResidencial']), direita: true },
    ],
    rodape: r => (r?.fatorPotencia != null ? `Fator de potência da tabela: ${n(r.fatorPotencia)}` : null),
  },
  'tabela-13': { linhas: () => [], termos: 'recarga estação individual veículo elétrico', colunas: [] },
  'tabela-14': {
    linhas: lista,
    termos: 'motores maior motor demais motores reserva',
    colunas: [
      { titulo: 'Motor', valor: l => l['descricao'] },
      { titulo: 'Fator de demanda', valor: l => n(l['fatorDemanda']), direita: true },
    ],
  },
  'tabela-15': {
    linhas: lista,
    termos: 'equipamentos especiais elevador portão elevadores',
    colunas: [
      { titulo: 'Equipamento', valor: l => l['descricao'] },
      { titulo: 'Fator de demanda', valor: l => n(l['fatorDemanda']), direita: true },
      { titulo: 'Fator de potência', valor: l => n(l['fatorPotencia']), direita: true },
    ],
  },
  'tabela-16': {
    linhas: lista,
    termos: 'bombas piscina hidromassagem',
    colunas: [
      { titulo: 'Número de bombas', valor: (l, i, t) => (i === t.length - 1 ? `acima de ${Number(l['quantidadeBombas']) - 1}` : String(l['quantidadeBombas'])), direita: true },
      { titulo: 'Fator de demanda', valor: l => n(l['fatorDemanda']), direita: true },
      { titulo: 'Fator de potência', valor: l => n(l['fatorPotencia']), direita: true },
    ],
  },
  'tabela-17': {
    linhas: lista,
    termos: 'dispositivos de partida motores chave estrela-triângulo compensadora',
    colunas: [
      { titulo: 'Dispositivo de partida', valor: l => l['descricao'] },
      { titulo: 'Potência em 220 V (cv)', valor: l => faixaCv(l['minCv220v'], l['maxCv220v']) },
      { titulo: 'Potência em 380 V (cv)', valor: l => faixaCv(l['minCv380v'], l['maxCv380v']) },
    ],
  },
  'tabela-18': {
    linhas: lista,
    termos: 'motores monofásicos',
    colunas: [
      { titulo: 'Potência (cv)', valor: l => l['potenciaCv'] },
      { titulo: 'Potência (W)', valor: l => n(l['potenciaW'], 0), direita: true },
      { titulo: 'Potência (VA)', valor: l => n(l['potenciaVa'], 0), direita: true },
      { titulo: 'Corrente 110 V (A)', valor: l => n(l['corrente110vA']), direita: true },
      { titulo: 'Corrente 220 V (A)', valor: l => n(l['corrente220vA']), direita: true },
      { titulo: 'Fator de potência', valor: l => n(l['fatorPotencia']), direita: true },
    ],
  },
  'tabela-19': {
    linhas: lista,
    termos: 'motores trifásicos motobomba bomba incêndio demanda cv',
    colunas: [
      { titulo: 'Potência (cv)', valor: l => n(l['potenciaCv']), direita: true },
      { titulo: 'Potência (kW)', valor: l => n(l['potenciaKw']), direita: true },
      { titulo: 'Rendimento (η)', valor: l => n(l['rendimentoEta']), direita: true },
      { titulo: 'Fator de potência', valor: l => n(l['fatorPotencia']), direita: true },
      { titulo: 'Demanda (VA)', valor: l => n(Number(l['demandaUnitariakVa']) * 1000, 0), direita: true },
      { titulo: 'Corrente em 380 V (A)', valor: l => n(l['correnteNominal380vA']), direita: true },
      { titulo: 'Chave de partida', valor: l => String(l['chavePartidaRecomendada'] ?? '—').replace(/_/g, '-').toLowerCase() },
    ],
  },
  'tabela-22': {
    linhas: lista,
    termos: 'carga mínima ocupação comercial iluminação tomadas loja escritório restaurante',
    colunas: [
      { titulo: 'Ocupação', valor: l => l['rotulo'] },
      { titulo: 'Carga mínima (W/m²)', valor: l => n(l['cargaMinimaWm2']), direita: true },
      { titulo: 'Fator de demanda (iluminação)', valor: l => n(l['fatorDemandaIlum']), direita: true },
      { titulo: 'Fator de potência', valor: l => n(l['fatorPotencia']), direita: true },
      { titulo: 'Regra', valor: l => l['regraNormativa'] ?? '—' },
    ],
  },
};
