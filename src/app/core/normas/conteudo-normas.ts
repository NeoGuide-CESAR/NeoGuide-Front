/**
 * Texto da página "Normas técnicas": resumos com palavras próprias, sempre com o item da norma citado.
 * Não há valores de tabela aqui: eles vêm do catálogo do back. O texto integral está no documento oficial.
 */

export type CodigoNorma = 'dis-nor-053' | 'dis-nor-030';
export const CODIGO_PADRAO: CodigoNorma = 'dis-nor-053';

export interface RegraNorma {
  id: string;
  titulo: string;
  texto: string;
  referencia: string;
  formula?: string[];
  /** Parte do texto que é decisão do grupo, e não da norma (leva o selo "Premissa do projeto"). */
  premissa?: string;
  foraDoEscopo?: boolean;
  /** Palavras extras para a busca. */
  termos?: string;
}

export interface ParcelaNorma {
  letra: string;
  descricao: string;
  tabela: string;
  fatorPotencia: string;
}

export interface TermoGlossario {
  id: string;
  termo: string;
  definicao: string;
}

export const AVISO_RESPONSABILIDADE =
  'Esta página resume as normas para apoiar o preenchimento. Em caso de dúvida, vale o documento oficial. '
  + 'A responsabilidade técnica do projeto é do responsável pela ART/TRT/RRT.';

export const VISAO_GERAL: Record<CodigoNorma, { titulo: string; paragrafos: string[] }> = {
  'dis-nor-053': {
    titulo: 'Visão geral · DIS-NOR-053',
    paragrafos: [
      'Regula o fornecimento de energia elétrica a edificações com múltiplas unidades consumidoras, em tensão de até 34,5 kV. '
        + 'É a norma de quem projeta prédios residenciais, comerciais e mistos na área da Neoenergia Pernambuco.',
      'O NeoGuide usa dela o método da área útil para as unidades residenciais, os limites de atendimento em baixa e em média tensão, '
        + 'a recarga de veículos elétricos, a motobomba de incêndio e o dimensionamento da entrada de serviço e do barramento do QDG.',
    ],
  },
  'dis-nor-030': {
    titulo: 'Visão geral · DIS-NOR-030',
    paragrafos: [
      'Regula o fornecimento em tensão secundária de distribuição a edificações individuais, com o método da carga instalada.',
      'Entra no cálculo de prédios com várias unidades porque a DIS-NOR-053 manda usar o método da carga instalada, da DIS-NOR-030, '
        + 'para as áreas comuns e para os espaços comerciais. O NeoGuide usa o item 6.27 e as tabelas do Anexo II.',
    ],
  },
};

export const FORMULA_GERAL = {
  formulas: ['Ded = Drf + Ds + Dc + Dve + Dmbi', 'DQDG = Ded − Dmbi'],
  nota: 'A motobomba de incêndio é derivada antes da proteção geral e não passa pelo QDG (DIS-NOR-053, item 6.20.1).',
  parcelas: [
    { sigla: 'Drf', texto: 'demanda residencial, pelo método da área útil', norma: 'DIS-NOR-053, Anexo I, Quadros 35, 36 e 37', etapa: 2 },
    { sigla: 'Ds', texto: 'demanda dos serviços e áreas comuns, pelo método da carga instalada (parcelas a a i)', norma: 'DIS-NOR-030, item 6.27', etapa: 3 },
    { sigla: 'Dc', texto: 'demanda dos espaços comerciais, pela carga instalada e a Tabela 22', norma: 'DIS-NOR-053, item 6.23.1, e DIS-NOR-030', etapa: 4 },
    { sigla: 'Dve', texto: 'demanda da recarga de veículos elétricos', norma: 'DIS-NOR-053, item 6.26 e Quadro 33', etapa: 5 },
    { sigla: 'Dmbi', texto: 'demanda da motobomba de incêndio, pela conversão por motor', norma: 'DIS-NOR-030, Tabela 19', etapa: 5 },
  ],
};

export const REGRAS_053: RegraNorma[] = [
  {
    id: 'regra-limite-bt', titulo: 'Limite de baixa tensão', referencia: 'DIS-NOR-053 · itens 6.2.4 e 6.2.6',
    texto: 'Edificação residencial é atendida em baixa tensão até 300 kVA; comercial ou mista, até 225 kVA, desde que não haja unidade do Grupo A. '
      + 'Acima disso, o atendimento é em média tensão.',
    premissa: 'No NeoGuide, um prédio residencial com espaços comerciais é tratado como misto (limite de 225 kVA).',
    termos: 'bt mt média tensão baixa tensão 300 225 misto comercial residencial grupo a',
  },
  {
    id: 'regra-tensao-pe', titulo: 'Tensão de fornecimento em Pernambuco', referencia: 'DIS-NOR-053 · item 6.2.2',
    texto: 'Na Neoenergia Pernambuco, a tensão secundária de distribuição é 380/220 V.',
    termos: 'tensão 380 220 volts',
  },
  {
    id: 'regra-smart-studio', titulo: 'Smart studio e similares', referencia: 'DIS-NOR-053 · item 6.25.1 e observação do Quadro 36',
    texto: 'Edificações do tipo Smart, Studio, Home Studio ou semelhantes, com mais de 15 unidades, usam fator de coincidência de 90%.',
    termos: 'smart studio home studio fator de coincidência 90 15 unidades',
  },
  {
    id: 'regra-fr', titulo: 'Fator de segurança', referencia: 'DIS-NOR-053 · Quadro 37',
    texto: 'Usar um fator de segurança acima do recomendado exige justificativa no projeto.',
    termos: 'fator de segurança fr justificativa',
  },
  {
    id: 'regra-motobomba', titulo: 'Motobomba de incêndio', referencia: 'DIS-NOR-053 · itens 6.20.1 e 6.20.2',
    texto: 'A alimentação da motobomba é derivada antes da proteção geral, com medidor exclusivo. Por isso a demanda da motobomba (Dmbi) não entra no QDG.',
    formula: ['DQDG = Ded − Dmbi'],
    termos: 'motobomba incêndio medidor exclusivo dmbi qdg',
  },
  {
    id: 'regra-ve-50', titulo: 'Recarga de veículos elétricos', referencia: 'DIS-NOR-053 · itens 6.26.2 e 6.26.3',
    texto: 'Para estações de recarga na medição de serviço ou em medição exclusiva, a soma Ds + Dve pode chegar a 50% da potência do transformador. '
      + 'Acima disso, é preciso um sistema de limitação de carga.',
    termos: 'recarga veículo elétrico ve 50% transformador limitação de carga',
  },
  {
    id: 'regra-multiplas-torres', titulo: 'Mais de uma edificação no empreendimento', referencia: 'DIS-NOR-053 · Anexo I, itens 9 a 11',
    texto: 'Empreendimentos com mais de uma edificação agrupam as demandas e aplicam o fator de coincidência pelo total de apartamentos '
      + 'alimentados pelo mesmo transformador ou quadro geral.',
    foraDoEscopo: true,
    termos: 'torres várias edificações agrupamento transformador',
  },
  {
    id: 'regra-entrada', titulo: 'Entrada de serviço', referencia: 'DIS-NOR-053 · Anexo II · Tabela 2 e notas',
    texto: 'O disjuntor geral, os condutores e o eletroduto saem da Tabela 2 (380/220 V), pela demanda da edificação. '
      + 'É permitida uma seção acima da indicada, mantendo o disjuntor da faixa. Disjuntores a partir de 250 A têm relé ajustável de 0,9 a 1,2 vezes a corrente nominal.',
    termos: 'entrada de serviço disjuntor geral condutor eletroduto relé 250 a',
  },
  {
    id: 'regra-barramento', titulo: 'Barramento do QDG', referencia: 'DIS-NOR-053 · Anexo II · Tabela 3',
    texto: 'O barramento do QDG sai da Tabela 3, pela demanda do QDG.',
    termos: 'barramento qdg cobre',
  },
];

export const PARCELAS_030 = {
  id: 'parcelas-6-27',
  titulo: 'Item 6.27 · Parcelas da demanda',
  referencia: 'DIS-NOR-030 · item 6.27',
  introducao: 'A demanda de serviços (Ds) é a soma das parcelas abaixo. Cada uma usa uma tabela de fator de demanda e tem o seu fator de potência.',
  parcelas: [
    { letra: 'a', descricao: 'Iluminação e tomadas', tabela: 'Tabela 22', fatorPotencia: '0,80 (LED) para iluminação e 1,00 para tomadas (item 6.27.1.2)' },
    { letra: 'b', descricao: 'Chuveiros, torneiras, aquecedores de passagem e ferros', tabela: 'Tabela 7', fatorPotencia: '1,00' },
    { letra: 'c', descricao: 'Aquecedores centrais ou de acumulação (boilers)', tabela: 'Tabela 8', fatorPotencia: '1,00' },
    { letra: 'd', descricao: 'Secadoras, lavadoras, lava-louças e micro-ondas', tabela: 'Tabela 9', fatorPotencia: '0,92' },
    { letra: 'e', descricao: 'Fornos e fogões', tabela: 'Tabela 9 (item 6.27.5) para fornos; Tabela 10 para fogões e cooktops', fatorPotencia: '1,00' },
    { letra: 'f', descricao: 'Condicionadores de ar', tabela: 'Tabelas 11 e 12', fatorPotencia: '0,92' },
    { letra: 'g', descricao: 'Motores', tabela: 'Tabelas 14, 17, 18 e 19', fatorPotencia: 'conforme a tabela do motor' },
    { letra: 'h', descricao: 'Elevadores, portões e equipamentos especiais', tabela: 'Tabela 15', fatorPotencia: '0,92 quando a placa não informa' },
    { letra: 'i', descricao: 'Bombas de piscina e hidromassagem', tabela: 'Tabela 16', fatorPotencia: '1,00 (item 6.27.9)' },
    { letra: 'j', descricao: 'Recarga de veículos elétricos', tabela: 'Tabela 13, para postos individuais', fatorPotencia: 'do fabricante (item 6.27.10)' },
  ] as ParcelaNorma[],
  termos: 'parcelas iluminação tomadas chuveiro boiler eletrodomésticos fornos fogões cooktop ar-condicionado motores elevadores bombas piscina recarga',
};

export const GLOSSARIO: TermoGlossario[] = [
  { id: 'kw', termo: 'kW', definicao: 'Potência ativa: a parte da energia que realiza trabalho (aquece, ilumina, move).' },
  { id: 'kva', termo: 'kVA', definicao: 'Potência aparente: considera a parte ativa e a reativa. É com ela que a entrada e o transformador são dimensionados.' },
  { id: 'fp', termo: 'Fator de potência (FP)', definicao: 'Relação entre a potência ativa (kW) e a aparente (kVA). Quanto mais perto de 1, melhor.' },
  { id: 'fd', termo: 'Fator de demanda (FD)', definicao: 'Parte da carga instalada que se espera usar ao mesmo tempo.' },
  { id: 'fc', termo: 'Fator de coincidência (Fc)', definicao: 'Reduz a soma das demandas de muitos apartamentos, porque nem todos usam o máximo no mesmo instante.' },
  { id: 'fr', termo: 'Fator de segurança (Fr)', definicao: 'Margem aplicada à demanda residencial bruta; maior para demandas menores.' },
  { id: 'drf', termo: 'Drf', definicao: 'Demanda residencial final, das unidades residenciais.' },
  { id: 'ds', termo: 'Ds', definicao: 'Demanda de serviços: áreas comuns e equipamentos do condomínio.' },
  { id: 'dc', termo: 'Dc', definicao: 'Demanda comercial: espaços comerciais do prédio.' },
  { id: 'dve', termo: 'Dve', definicao: 'Demanda da recarga de veículos elétricos.' },
  { id: 'dmbi', termo: 'Dmbi', definicao: 'Demanda da motobomba de incêndio.' },
  { id: 'ded', termo: 'Ded', definicao: 'Demanda total da edificação: Drf + Ds + Dc + Dve + Dmbi.' },
  { id: 'dqdg', termo: 'DQDG', definicao: 'Demanda do quadro de distribuição geral: a Ded sem a motobomba de incêndio.' },
  { id: 'qdg', termo: 'QDG', definicao: 'Quadro de distribuição geral, onde chega a entrada de serviço e saem os circuitos principais.' },
  { id: 'bt', termo: 'BT', definicao: 'Baixa tensão. Em Pernambuco, 380/220 V.' },
  { id: 'mt', termo: 'MT', definicao: 'Média tensão. O atendimento passa a ser em MT quando a demanda ultrapassa o limite de baixa tensão.' },
  { id: 'grupo-a', termo: 'Grupo A', definicao: 'Unidades consumidoras atendidas em média tensão (a partir de 2,3 kV).' },
  { id: 'art-trt-rrt', termo: 'ART/TRT/RRT', definicao: 'Anotação, termo ou registro de responsabilidade técnica do profissional que assina o projeto.' },
  { id: 'xlpe', termo: 'XLPE', definicao: 'Polietileno reticulado, usado como isolação dos cabos da entrada de serviço.' },
  { id: 'pead', termo: 'PEAD', definicao: 'Polietileno de alta densidade, material dos dutos subterrâneos.' },
];

export const NORMAS_COMPLEMENTARES = {
  introducao: 'Referências citadas nos estudos do projeto. O NeoGuide não aplica regras destas normas no cálculo.',
  itens: [
    { codigo: 'ABNT NBR 5410', texto: 'Instalações elétricas de baixa tensão.' },
    { codigo: 'ABNT NBR 14039', texto: 'Instalações elétricas de média tensão.' },
    { codigo: 'ABNT NBR 17019', texto: 'Instalações elétricas para recarga de veículos elétricos.' },
    { codigo: 'RN ANEEL nº 1.000/2021', texto: 'Regras de fornecimento de energia elétrica e prazos.' },
  ],
};

/** Nome da norma pelo código da URL, para exibição. */
export const CODIGO_EXIBIDO: Record<CodigoNorma, string> = { 'dis-nor-053': 'DIS-NOR-053', 'dis-nor-030': 'DIS-NOR-030' };

export function codigoValido(valor: string | null | undefined): CodigoNorma {
  return valor === 'dis-nor-030' || valor === 'dis-nor-053' ? valor : CODIGO_PADRAO;
}

/** Texto sem acento e em minúsculas, para a busca. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
