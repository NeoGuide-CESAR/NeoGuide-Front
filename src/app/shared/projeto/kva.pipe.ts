import { Pipe, PipeTransform } from '@angular/core';

const numeroKva = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
@Pipe({ name: 'kva', standalone: true, pure: true })
export class KvaPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return typeof valor === 'number' && Number.isFinite(valor) ? `${numeroKva.format(valor)} kVA` : 'Não disponível';
  }
}
