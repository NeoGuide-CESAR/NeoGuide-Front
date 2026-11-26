/** Situação do projeto em chaves estáveis (AGUARDANDO_CORRECAO conta como reprovado). */
export type ChaveStatus = 'rascunho' | 'em_analise' | 'aprovado' | 'reprovado';

export function chaveDoStatus(status: string | null | undefined): ChaveStatus {
  switch (status) {
    case 'EM_ANALISE': return 'em_analise';
    case 'APROVADO': return 'aprovado';
    case 'REPROVADO':
    case 'AGUARDANDO_CORRECAO': return 'reprovado';
    default: return 'rascunho';
  }
}

/**
 * O que cada situação permite (decisão D1: projeto em análise é somente leitura).
 * Parametrizado aqui para o grupo mudar a regra sem refatorar: o design mostra EDITAR também em "Em análise".
 */
export const REGRAS_STATUS: Record<ChaveStatus, { editar: boolean; duplicar: boolean }> = {
  rascunho: { editar: true, duplicar: true },
  em_analise: { editar: false, duplicar: true },
  aprovado: { editar: false, duplicar: true },
  reprovado: { editar: true, duplicar: true },
};
