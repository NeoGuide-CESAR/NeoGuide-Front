export const TIPOS_EDIFICACAO = ['Residencial multifamiliar', 'Comercial', 'Uso misto (residencial e comercial)'] as const;
export type TipoEdificacao = typeof TIPOS_EDIFICACAO[number];
export type EstadoCep = 'padrao' | 'buscando' | 'encontrado' | 'nao-encontrado' | 'fora-concessao' | 'falha';
export interface DadosProjeto {
  nome: string;
  tipoEdificacao: TipoEdificacao | '';
  cep: string;
  endereco: string;
  bairro: string;
  municipio: string;
  uf: string;
  temVe: boolean;
  temBomba: boolean;
}
export const dadosVazios = (): DadosProjeto => ({ nome: '', tipoEdificacao: '', cep: '', endereco: '', bairro: '', municipio: '', uf: '', temVe: true, temBomba: true });
export const digitosCep = (valor: string): string => valor.replace(/\D/g, '').slice(0, 8);
export const normalizarUf = (valor: string): string => valor.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
export function mascaraCep(valor: string): string {
  const digitos = digitosCep(valor);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}
/** NEO-64: endereço, bairro e município permanecem separados ao salvar. */
export function normalizarDados(d: DadosProjeto): DadosProjeto {
  return { nome: d.nome.trim(), tipoEdificacao: d.tipoEdificacao, cep: digitosCep(d.cep), endereco: d.endereco.trim(), bairro: d.bairro.trim(), municipio: d.municipio.trim(), uf: normalizarUf(d.uf), temVe: d.temVe, temBomba: d.temBomba };
}
/** Demonstração explícita, acionada apenas pelos controles de teste. */
export const dadosExemplo = (): DadosProjeto => ({ nome: 'Residencial Jardim', tipoEdificacao: 'Residencial multifamiliar', cep: '50050000', endereco: 'Rua do Exemplo, 120, Bloco B', bairro: 'Boa Vista', municipio: 'Recife', uf: 'PE', temVe: true, temBomba: true });

export function etapasAplicaveis(dados: DadosProjeto, valido: boolean): boolean[] {
  if (!valido || !dados.tipoEdificacao) return [true, false, false, false, false, false];
  return [true, dados.tipoEdificacao !== 'Comercial', true, dados.tipoEdificacao !== 'Residencial multifamiliar', dados.temVe || dados.temBomba, true];
}
