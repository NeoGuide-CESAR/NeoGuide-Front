import { DadosProjeto, mascaraCep } from '../projetos/dados-projeto';
import { EspacoComercialApi } from '../projetos/projetos.api';
import { CargaAreaComumApi, EtapasApi } from './calculo.api';
import { decimal, potenciaKw } from './formatos';

/** Linha de rótulo e valor. `erro` pinta o valor de vermelho; `muted` o deixa em peso regular e cinza. */
export interface LinhaValor { rotulo: string; valor: string; erro?: boolean; muted?: boolean; }
export interface SecaoAreaComum { titulo: string; itens: { rotulo: string; valor: string }[]; semPotencia: boolean; }

export const NAO_SE_APLICA = 'Não se aplica a este projeto';

const SECOES_AREA_COMUM: { titulo: string; submodulos: string[] }[] = [
  { titulo: 'Tomadas e lâmpadas', submodulos: ['ILUMINACAO_TUG'] },
  { titulo: 'Aquecimento e eletrodomésticos', submodulos: ['AQUECIMENTO', 'CLIMATIZACAO'] },
  { titulo: 'Fornos e fogões', submodulos: ['COCCAO'] },
  { titulo: 'Motores e equipamentos', submodulos: ['MOTORES'] },
];

export const aplicaResidencial = (d: DadosProjeto): boolean => d.tipoEdificacao !== 'Comercial';
/** A etapa Comercial é sempre disponível e opcional, para qualquer tipo de edificação. */
export const aplicaComercial = (_d: DadosProjeto): boolean => true;

const sim = (v: boolean) => (v ? 'Sim' : 'Não');

export function linhasProjeto(d: DadosProjeto, responsavel: string | null | undefined, art: string | null | undefined): LinhaValor[] {
  const local = [d.endereco, d.bairro, d.municipio && d.uf ? `${d.municipio} / ${d.uf}` : d.municipio || d.uf, d.cep ? mascaraCep(d.cep) : '']
    .filter(Boolean).join(' · ');
  return [
    { rotulo: 'Nome', valor: d.nome || '—' },
    { rotulo: 'Endereço', valor: local || '—' },
    { rotulo: 'Tipo de edificação', valor: d.tipoEdificacao || '—' },
    { rotulo: 'Responsável técnico', valor: responsavel || 'Não informado' },
    { rotulo: 'ART/TRT/RRT', valor: art || 'Não informado' },
    { rotulo: 'Carregamento de VE', valor: sim(d.temVe) },
    { rotulo: 'Bomba de incêndio', valor: sim(d.temBomba) },
  ];
}

export interface GrupoResidencial { grupo: number; unidades: number; area: string; }

export function gruposResidenciais(etapas: EtapasApi | null): GrupoResidencial[] {
  return (etapas?.residencial.tipologias ?? []).map((t, i) => ({
    grupo: i + 1, unidades: t.quantidadeUnidades, area: `${decimal(t.areaUtilM2, 0)} m²`,
  }));
}

export const smartStudio = (etapas: EtapasApi | null): string => sim((etapas?.residencial.tipologias ?? []).some(t => t.smartStudio));

function rotuloCarga(c: CargaAreaComumApi): string {
  return c.descricao?.trim() || c.tipoEquipamento?.trim() || 'Carga';
}

export function secoesAreaComum(etapas: EtapasApi | null): SecaoAreaComum[] {
  const cargas = etapas?.areaComum.cargas ?? [];
  return SECOES_AREA_COMUM.map(secao => {
    const itensSecao = cargas.filter(c => secao.submodulos.includes((c.submodulo ?? '').toUpperCase()) && (c.quantidade ?? 0) > 0);
    return {
      titulo: secao.titulo,
      semPotencia: itensSecao.some(c => c.potenciaNominalKw == null),
      itens: itensSecao.map(c => ({
        rotulo: rotuloCarga(c),
        valor: c.potenciaNominalKw == null ? `${c.quantidade}` : `${c.quantidade} × ${potenciaKw(c.potenciaNominalKw)} kW`,
      })),
    };
  });
}

export function linhasComercial(espacos: EspacoComercialApi[] | null | undefined): LinhaValor[] {
  return (espacos ?? []).map((e, i) => {
    const partes = [e.rotulo || 'Finalidade não informada'];
    partes.push(e.areaM2 == null ? 'área não informada' : `${decimal(e.areaM2, 0)} m²`);
    if (e.cargaInstaladaKw != null) partes.push(`${decimal(e.cargaInstaladaKw)} kW`);
    return { rotulo: `Espaço ${i + 1}`, valor: partes.join(' · '), erro: e.areaM2 == null };
  });
}

export function linhasEspeciais(d: DadosProjeto, etapas: EtapasApi | null): LinhaValor[] {
  const e = etapas?.cargasEspeciais ?? null;
  const ve: LinhaValor = d.temVe
    ? { rotulo: 'Pontos de carregamento', valor: e?.qtdPontosVe ? (e.potenciaVeKw ? `${e.qtdPontosVe} × ${decimal(e.potenciaVeKw)} kW` : `${e.qtdPontosVe}`) : 'Não informado' }
    : { rotulo: 'Pontos de carregamento', valor: NAO_SE_APLICA, muted: true };
  const bomba: LinhaValor = d.temBomba
    ? { rotulo: 'Motobombas de incêndio', valor: e?.potenciaBombaIncendioCv ? `1 × ${decimal(e.potenciaBombaIncendioCv, 0)} cv` : 'Não informado' }
    : { rotulo: 'Motobombas de incêndio', valor: NAO_SE_APLICA, muted: true };
  const linhas = [ve, bomba];
  if (d.temBomba) linhas.push({ rotulo: 'Medidor exclusivo', valor: e?.medidorExclusivo ? 'Sim' : 'Não' });
  return linhas;
}
