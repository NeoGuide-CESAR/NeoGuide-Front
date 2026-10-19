import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const somenteDigitos = (v: string) => v.replace(/\D/g, '');

export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += +base[i] * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(cpf.slice(0, 9), 10) === +cpf[9] && dv(cpf.slice(0, 10), 11) === +cpf[10];
}

export function cnpjValido(valor: string): boolean {
  const cnpj = somenteDigitos(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((acc, p, i) => acc + +base[i] * p, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return dv(cnpj.slice(0, 12)) === +cnpj[12] && dv(cnpj.slice(0, 13)) === +cnpj[13];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Aceita CPF, CNPJ (com ou sem máscara) ou e-mail. */
export const documentoOuEmailValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (!valor) return null; // o `required` cuida do vazio

  if (/[a-z@]/i.test(valor)) {
    return EMAIL_RE.test(valor) ? null : { email: true };
  }
  const digitos = somenteDigitos(valor);
  if (digitos.length === 11) return cpfValido(digitos) ? null : { cpf: true };
  if (digitos.length === 14) return cnpjValido(digitos) ? null : { cnpj: true };
  return { documento: true };
};
