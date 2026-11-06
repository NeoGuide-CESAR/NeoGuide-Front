import { ProjetoHttp } from './projeto-http';

/** Aurora/Jardim reproduzem as pranchetas. Boa Viagem é um exemplo aprovado com valores ilustrativos prontos, sem fórmulas. */
export const PROJETOS_ARTBOARDS: ProjetoHttp[] = [
  {
    id: 'p3', nome: 'Residencial Boa Viagem', status: 'APROVADO', cep: '50050000', logradouro: 'Av. Boa Viagem, 2200',
    bairro: 'Boa Viagem', municipio: 'Recife', uf: 'PE', tipoEdificacao: 'Residencial multifamiliar', temVe: true, temBomba: true,
    atualizadoEm: '2026-09-30T12:00:00-03:00', enviadoEm: '2026-09-29T14:30:00-03:00', proximaEtapa: 'Nenhuma pendência',
    complementos: {
      residencial: { grupos: [{ unidades: 64, area: 65, smartStudio: false }] }, cargas: { tomadas: 12, lampadas: 20 },
      comercial: [], especiais: { pontos: 2, bombas: 1, potenciaCv: 5 },
    },
    resultado: { demandaTotal: 152.4, calculadoEm: '2026-09-29T14:20:00-03:00', norma: 'DIS-NOR-053', porEtapa: { residencial: 120, areaComum: 14.4, comercial: null, veiculoBomba: 18, veiculoEletrico: 12, bombaIncendio: 6 } },
  },
  {
    id: 'p2', nome: 'Edifício Aurora', status: 'EM_ANALISE', cep: '50000100', logradouro: 'Av. Exemplo, 450',
    bairro: 'Boa Viagem', municipio: 'Recife', uf: 'PE', tipoEdificacao: 'Residencial multifamiliar', temVe: true, temBomba: false,
    atualizadoEm: '2026-10-06T12:00:00-03:00', enviadoEm: '2026-10-06T12:00:00-03:00', proximaEtapa: 'Parecer da Neoenergia',
    complementos: {
      residencial: { grupos: [{ unidades: 20, area: 70, smartStudio: false }, { unidades: 12, area: 95, smartStudio: false }] },
      cargas: { tomadas: 36, lampadas: 110, chuveiros: 4, lavadoras: 2, arCondicionado: 3, bombasHidraulicas: 2, elevadoresPortoes: 2 },
      comercial: [{ finalidade: 'Loja', area: 90 }], especiais: { pontos: 4, bombas: null, potenciaCv: null },
    },
    resultado: { demandaTotal: 0, calculadoEm: '2026-10-05T00:00:00-03:00', norma: 'DIS-NOR-053', porEtapa: { residencial: 0, areaComum: 0, comercial: 0, veiculoBomba: 0, veiculoEletrico: 0, bombaIncendio: null } },
  },
  {
    id: 'p1', nome: 'Residencial Jardim', status: 'RASCUNHO', cep: '50000000', logradouro: 'Rua do Exemplo, 120',
    bairro: 'Boa Viagem', municipio: 'Recife', uf: 'PE', tipoEdificacao: 'Residencial multifamiliar', temVe: true, temBomba: true,
    atualizadoEm: '2026-10-13T21:40:00-03:00', proximaEtapa: 'Gerar memorial técnico',
    complementos: {
      residencial: { grupos: [{ unidades: 24, area: 65, smartStudio: false }, { unidades: 16, area: 82, smartStudio: false }, { unidades: 8, area: 110, smartStudio: false }] },
      cargas: { tomadas: 40, lampadas: 120, chuveiros: 6, torneiras: 2, secadoras: 2, lavadoras: 2, lavaLoucas: 1, microondas: 3, arCondicionado: 4, fornos: 1, fogoes: 2, bombasHidraulicas: 2, elevadoresPortoes: 3 },
      comercial: [{ finalidade: 'Loja', area: 120 }, { finalidade: 'Escritório', area: 85 }, { finalidade: 'Restaurante', area: 60 }],
      especiais: { pontos: 6, bombas: 1, potenciaCv: 15 },
    },
    resultado: { demandaTotal: 0, calculadoEm: '2026-10-13T21:40:00-03:00', norma: 'DIS-NOR-053', porEtapa: { residencial: 0, areaComum: 0, comercial: 0, veiculoBomba: 0, veiculoEletrico: 0, bombaIncendio: 0 } },
  },
];
