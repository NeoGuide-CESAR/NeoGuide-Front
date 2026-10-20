import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DadosProjeto, mascaraCep } from '../../core/projetos/dados-projeto';
import { ABAS_CARGAS, CampoCarga, ComplementosCalculo, errosCalculo } from '../../core/projetos/dados-calculo';

@Component({
  selector: 'app-etapas-calculo', standalone: true, imports: [FormsModule],
  templateUrl: './etapas-calculo.component.html', styleUrl: './etapas-calculo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtapasCalculoComponent {
  private readonly elemento: ElementRef<HTMLElement> = inject(ElementRef);
  readonly etapa = input.required<number>();
  readonly dados = input.required<DadosProjeto>();
  readonly valores = input.required<ComplementosCalculo>();
  readonly projetoValido = input(false);
  readonly alterado = output<ComplementosCalculo>();
  readonly editar = output<number>();
  readonly aba = signal(0);
  readonly tentadas = signal<number[]>([]);
  readonly abas = ABAS_CARGAS;
  readonly mascaraCep = mascaraCep;
  proximaAba(): void { this.aba.update(v => Math.min(v + 1, this.abas.length - 1)); }
  selecionarAba(indice: number, focar = false): void {
    this.aba.set(indice);
    if (focar) this.elemento.nativeElement.querySelector<HTMLElement>(`#aba-${indice}`)?.focus();
  }
  abaPreenchida(indice: number): boolean { return this.abas[indice].campos.some(f => this.valores().cargas[f.id] != null); }
  get erros() { return errosCalculo(this.dados(), this.valores()); }
  get errosDaEtapa() { return this.erros.filter(e => e.etapa === this.etapa()); }
  get totalErros() { return this.erros.length + (this.projetoValido() ? 0 : 1); }
  mensagem(campo: string): string { return this.tentadas().includes(this.etapa()) ? this.errosDaEtapa.find(e => e.campo === campo)?.mensagem ?? '' : ''; }
  atualizar(mudar: (c: ComplementosCalculo) => void): void {
    const proximo = structuredClone(this.valores()); mudar(proximo); this.alterado.emit(proximo);
  }
  adicionarGrupo(): void { this.atualizar(c => c.residencial.grupos.push({ unidades: null, area: null, smartStudio: false })); }
  removerGrupo(i: number): void { this.atualizar(c => c.residencial.grupos.splice(i, 1)); }
  grupo(i: number, campo: 'unidades' | 'area', valor: number | null): void { this.atualizar(c => c.residencial.grupos[i][campo] = valor); }
  smartStudio(i: number, valor: boolean): void { this.atualizar(c => c.residencial.grupos[i].smartStudio = valor); }
  carga(campo: CampoCarga, valor: number | null): void { this.atualizar(c => c.cargas[campo] = valor); }
  adicionarEspaco(): void { this.atualizar(c => c.comercial.push({ finalidade: '', area: null })); }
  removerEspaco(i: number): void { this.atualizar(c => c.comercial.splice(i, 1)); }
  finalidade(i: number, valor: string): void { this.atualizar(c => c.comercial[i].finalidade = valor); }
  areaEspaco(i: number, valor: number | null): void { this.atualizar(c => c.comercial[i].area = valor); }
  especial(campo: 'pontos' | 'bombas' | 'potenciaCv', valor: number | null): void { this.atualizar(c => c.especiais[campo] = valor); }
  validar(): boolean {
    this.tentadas.update(t => [...new Set([...t, this.etapa()])]);
    const erro = this.errosDaEtapa[0];
    if (erro) {
      if (this.etapa() === 2) this.aba.set(this.abas.findIndex(a => a.campos.some(f => f.id === erro.campo)));
      setTimeout(() => this.elemento.nativeElement.querySelector<HTMLElement>(`[id="${erro.campo}"]`)?.focus());
    }
    return !erro;
  }
  cargasInformadas(): { nome: string; valor: number }[] {
    return this.abas.flatMap(a => a.campos.map(f => ({ nome: f.nome, valor: this.valores().cargas[f.id] ?? 0 }))).filter(f => f.valor > 0);
  }
  errosNaEtapa(etapa: number): number { return this.erros.filter(e => e.etapa === etapa).length; }
}
