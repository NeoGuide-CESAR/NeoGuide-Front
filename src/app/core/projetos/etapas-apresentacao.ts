import { ABAS_CARGAS, CampoCarga } from './dados-calculo';
import { mascaraCep } from './dados-projeto';
import { ProjetoDetalhado } from './projeto.model';

export interface LinhaProjeto { rotulo: string; valor: string; ausente?: boolean; }
export interface DemandaEtapa { rotulo: string; valor: number | null; aplicavel: boolean; }
export interface EtapaApresentacao {
  numero: number;
  titulo: string;
  aplicavel: boolean;
  linhas: LinhaProjeto[];
  linhasDetalhe?: LinhaProjeto[];
  residencial?: ProjetoDetalhado['residencial'];
  demandas: DemandaEtapa[];
}
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
export const formatarNumero = (n: number | null | undefined): string => n == null ? 'Não informado' : numero.format(n);
const simNao = (valor: boolean): string => valor ? 'Sim' : 'Não';
const unidade = (n: number | null): string => n === null ? 'Quantidade não informada' : `${formatarNumero(n)} ${n === 1 ? 'unidade' : 'unidades'}`;
export const logradouroProjeto = (p: ProjetoDetalhado): string => [p.dados.endereco, p.dados.bairro, [p.dados.municipio, p.dados.uf].filter(Boolean).join(' / ')].filter(Boolean).join(' · ');

export function dadosDoProjeto(p: ProjetoDetalhado): LinhaProjeto[] {
  return [
    { rotulo: 'Nome', valor: p.nome }, { rotulo: 'CEP', valor: mascaraCep(p.dados.cep) },
    { rotulo: 'Logradouro completo', valor: logradouroProjeto(p) },
    { rotulo: 'Tipo de edificação', valor: p.dados.tipoEdificacao || 'Não informado' },
    { rotulo: 'Carregamento de veículo elétrico', valor: simNao(p.dados.temVe) },
    { rotulo: 'Bomba de incêndio', valor: simNao(p.dados.temBomba) },
  ];
}

const CARGAS: Record<CampoCarga, [string, string, string]> = {
  tomadas: ['Tomadas (a)', 'tomada', 'tomadas'], lampadas: ['Lâmpadas (a)', 'lâmpada', 'lâmpadas'],
  aquecedoresRapidos: ['Aquecedores rápidos (b)', 'aquecedor rápido', 'aquecedores rápidos'],
  chuveiros: ['Chuveiros (b)', 'chuveiro', 'chuveiros'], torneiras: ['Torneiras (b)', 'torneira elétrica', 'torneiras elétricas'],
  secadoras: ['Secadoras (d)', 'secadora', 'secadoras'], lavadoras: ['Lavadoras (d)', 'lavadora', 'lavadoras'],
  lavaLoucas: ['Lava-louças (d)', 'lava-louças', 'lava-louças'], microondas: ['Micro-ondas (d)', 'micro-ondas', 'micro-ondas'],
  arCondicionado: ['Ar-condicionado (f)', 'ar-condicionado', 'ar-condicionado'],
  fornos: ['Fornos elétricos (e)', 'forno elétrico', 'fornos elétricos'], fogoes: ['Fogões completos / cooktops (e)', 'fogão completo / cooktop', 'fogões completos / cooktops'],
  bombasHidraulicas: ['Bombas hidráulicas (g)', 'bomba hidráulica', 'bombas hidráulicas'],
  elevadoresPortoes: ['Elevadores e portões (h)', 'elevador ou portão', 'elevadores e portões'],
  bombasPiscina: ['Bombas de piscina e hidromassagem (i)', 'bomba de piscina e hidromassagem', 'bombas de piscina e hidromassagem'],
  boilers: ['Aquecedores / boilers (c)', 'aquecedor / boiler', 'aquecedores / boilers'],
};

function apresentarCargas(p: ProjetoDetalhado, detalhe: boolean): LinhaProjeto[] {
  return ABAS_CARGAS.map(aba => {
    const valores = aba.campos.filter(c => p.areaComum.cargas[c.id] != null).map(c => {
      const valor = p.areaComum.cargas[c.id]!;
      return detalhe ? `${CARGAS[c.id][0]}: ${formatarNumero(valor)}` : `${formatarNumero(valor)} ${CARGAS[c.id][valor === 1 ? 1 : 2]}`;
    });
    return { rotulo: aba.titulo, valor: valores.join(' · ') || 'Nenhum valor informado', ausente: !valores.length };
  });
}

/** Só organiza texto e unidades. Nenhum total elétrico é derivado aqui. */
export function apresentarEtapas(p: ProjetoDetalhado): EtapaApresentacao[] {
  const resultado = p.resultado?.porEtapa;
  const vb = p.veiculoBomba;
  return [
    { numero: 1, titulo: 'Projeto', aplicavel: true, linhas: dadosDoProjeto(p), demandas: [] },
    {
      numero: 2, titulo: 'Residencial', aplicavel: p.residencial.aplicavel, residencial: p.residencial,
      linhas: p.residencial.grupos.length ? [
        ...p.residencial.grupos.map((g, i) => ({ rotulo: `Grupo ${i + 1}`, valor: `${unidade(g.unidades)} de ${g.area === null ? 'área não informada' : `${formatarNumero(g.area)} m²`}` })),
        { rotulo: 'Smart studio', valor: simNao(p.residencial.grupos.some(g => g.smartStudio)) },
      ] : [],
      demandas: [{ rotulo: 'Demanda das unidades residenciais', valor: resultado?.residencial ?? null, aplicavel: p.residencial.aplicavel }],
    },
    {
      numero: 3, titulo: 'Área comum', aplicavel: p.areaComum.aplicavel,
      linhas: apresentarCargas(p, false), linhasDetalhe: apresentarCargas(p, true),
      demandas: [{ rotulo: 'Demanda da área comum', valor: resultado?.areaComum ?? null, aplicavel: p.areaComum.aplicavel }],
    },
    {
      numero: 4, titulo: 'Comercial', aplicavel: p.comercial.aplicavel,
      linhas: p.comercial.espacos.map((e, i) => ({ rotulo: `Espaço ${i + 1}`, valor: `${e.finalidade || 'Finalidade não informada'} · ${e.area === null ? 'Área não informada' : `${formatarNumero(e.area)} m²`}` })),
      demandas: [{ rotulo: 'Demanda dos espaços comerciais', valor: resultado?.comercial ?? null, aplicavel: p.comercial.aplicavel }],
    },
    {
      numero: 5, titulo: 'Veículo elétrico e bomba de incêndio', aplicavel: vb.aplicavel,
      linhas: [
        { rotulo: 'Pontos de carregamento', valor: vb.temVeiculo ? formatarNumero(vb.pontos) : 'não se aplica a este projeto', ausente: !vb.temVeiculo },
        { rotulo: 'Motobombas de incêndio', valor: vb.temBomba ? `${formatarNumero(vb.bombas)} × ${formatarNumero(vb.potenciaCv)} cv` : 'não se aplica a este projeto', ausente: !vb.temBomba },
      ],
      demandas: [
        { rotulo: 'Demanda do carregamento de veículos', valor: resultado?.veiculoEletrico ?? null, aplicavel: vb.temVeiculo },
        { rotulo: 'Demanda da bomba de incêndio', valor: resultado?.bombaIncendio ?? null, aplicavel: vb.temBomba },
      ],
    },
  ];
}
