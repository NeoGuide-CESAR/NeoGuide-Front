export interface EnderecoProjeto { cep: string; endereco: string; }

const normalizar = (valor: string): string => valor.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '');

/** Para US13, endereço é CEP + logradouro, incluindo número/complemento. */
export function chaveEndereco(dados: EnderecoProjeto): string {
  return `${dados.cep.replace(/\D/g, '')}|${normalizar(dados.endereco)}`;
}

export function mesmoEndereco(a: EnderecoProjeto, b: EnderecoProjeto): boolean {
  return chaveEndereco(a) === chaveEndereco(b);
}
