/** Rota padrão depois do login quando não há URL de retorno válida. */
export const ROTA_INICIAL = '/inicio';

/**
 * Aceita só caminhos internos (ex.: /meus-projetos). Bloqueia URLs absolutas e
 * caminhos de protocolo relativo (//dominio), para o parâmetro não virar redirecionamento externo.
 */
export function sanitizarRetorno(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.includes('\\')) return null;
  return url;
}
