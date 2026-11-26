import { NavigationExtras } from '@angular/router';

import { ETAPAS, EtapaSlug, ItemValidacaoApi } from '../calculo/calculo.api';

/** Abas da etapa de área comum, na ordem em que aparecem. */
export const ABAS_AREA_COMUM = ['tomadas', 'aquecimento', 'fornos', 'motores'] as const;
/** Primeiro campo de cada aba: para onde o foco vai quando o alerta não aponta um campo. */
const PRIMEIRO_CAMPO_DA_ABA: Record<string, string> = {
  tomadas: 'tomadas', aquecimento: 'aquecedoresRapidos', fornos: 'fornos', motores: 'bombasHidraulicas',
};

export interface OpcoesEtapa {
  origem?: 'revisao';
  aba?: string | null;
  campo?: string | null;
  item?: number | null;
}

export interface DestinoWizard { commands: (string | number)[]; extras: NavigationExtras; }

/** Rotas do wizard montadas em um lugar só: absolutas e com o id do projeto. */
export const WizardRoutes = {
  /** Etapa n (1 a 5), com os parâmetros de origem e foco. */
  etapa(id: string, n: number, opcoes: OpcoesEtapa = {}): DestinoWizard {
    const queryParams: Record<string, string | number> = {};
    if (opcoes.origem) queryParams['origem'] = opcoes.origem;
    if (opcoes.aba) queryParams['aba'] = opcoes.aba;
    if (opcoes.campo) queryParams['campo'] = opcoes.campo;
    if (opcoes.item != null) queryParams['item'] = opcoes.item;
    return { commands: ['/projetos', id, `etapa-${n}`], extras: { queryParams } };
  },

  revisao(id: string): DestinoWizard {
    return { commands: ['/projetos', id, 'revisao'], extras: {} };
  },

  /** Destino de um item da validação: etapa, aba, campo e item corretos, voltando para a Revisão. */
  doItem(id: string, item: Pick<ItemValidacaoApi, 'etapa' | 'aba' | 'campo' | 'item'>): DestinoWizard {
    const etapa = ETAPAS.find(e => e.slug === item.etapa) ?? ETAPAS[0];
    return WizardRoutes.etapa(id, etapa.indice + 1, { origem: 'revisao', aba: item.aba, campo: item.campo, item: item.item });
  },
};

/** Id do elemento (na tela da etapa) que recebe o foco, a partir do campo do back. Nulo se não houver campo conhecido. */
export function idDoCampo(etapa: EtapaSlug, campo: string | null | undefined, item: number | null | undefined, aba: string | null | undefined): string | null {
  const i = item ?? 0;
  switch (etapa) {
    case 'projeto':
      return campo === 'titulo' ? 'projeto-nome' : campo ? `projeto-${campo}` : null;
    case 'residencial':
      if (campo === 'quantidadeUnidades') return `unidades-${i}`;
      if (campo === 'areaUtilM2') return `area-grupo-${i}`;
      return campo === 'tipologias' ? 'adicionar-grupo' : item != null ? `unidades-${i}` : null;
    case 'area-comum':
      return aba ? PRIMEIRO_CAMPO_DA_ABA[aba] ?? null : null;
    case 'comercial':
      if (campo === 'ocupacaoCodigo') return `finalidade-${i}`;
      if (campo === 'areaM2') return `area-espaco-${i}`;
      if (campo === 'cargaInstaladaKw') return `carga-espaco-${i}`;
      return null;
    case 'cargas-especiais':
      return { qtdPontosVe: 'pontos', potenciaVeKw: 'potenciaVeKw', potenciaBombaIncendioCv: 'potenciaCv', medidorExclusivo: 'medidorExclusivo' }[campo ?? ''] ?? null;
  }
}
