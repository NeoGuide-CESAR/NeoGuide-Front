import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';

import { CatalogoService, OcupacaoComercial } from '../../core/catalogo/catalogo.service';
import { DadosProjeto, mascaraCep } from '../../core/projetos/dados-projeto';
import { ABAS_CARGAS, CampoCarga, ComplementosCalculo, EspacoComercial, errosCalculo, espacosComerciaisParaEnvio } from '../../core/projetos/dados-calculo';
import { ABAS_AREA_COMUM } from '../../core/projetos/wizard-routes';
import { PreCalculoComercial } from '../../core/projetos/projetos.api';
import { ProjetosService } from '../../core/projetos/projetos.service';

/** Finalidades que aparecem no topo da lista (as do design). O restante segue a ordem alfabética. */
const FINALIDADES_EM_DESTAQUE = ['LOJAS', 'ESCRITORIOS', 'RESTAURANTES_BARES'];
/** Atraso antes de pedir o pré-cálculo ao back, para não chamar a cada tecla. */
const ATRASO_PREVIA_MS = 400;

@Component({
  selector: 'app-etapas-calculo', standalone: true, imports: [FormsModule],
  templateUrl: './etapas-calculo.component.html', styleUrl: './etapas-calculo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtapasCalculoComponent {
  private readonly elemento: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly catalogo = inject(CatalogoService);
  private readonly projetos = inject(ProjetosService);
  readonly etapa = input.required<number>();
  /** Limite de espaços comerciais por projeto (o mesmo do back). */
  readonly limiteEspacos = 100;
  readonly dados = input.required<DadosProjeto>();
  readonly valores = input.required<ComplementosCalculo>();
  readonly projetoValido = input(false);
  /** Aba da área comum a abrir (tomadas, aquecimento, fornos ou motores), vinda da Revisão. */
  readonly abaInicial = input<string | null>(null);
  readonly alterado = output<ComplementosCalculo>();
  readonly editar = output<number>();
  readonly aba = signal(0);
  readonly tentadas = signal<number[]>([]);
  readonly abas = ABAS_CARGAS;
  readonly mascaraCep = mascaraCep;

  /** Tabela 22 do back (finalidades da etapa comercial). Lista vazia enquanto carrega ou se falhar. */
  readonly ocupacoes = toSignal(
    this.catalogo.ocupacoesComerciais().pipe(catchError(() => of([] as OcupacaoComercial[]))),
    { initialValue: [] as OcupacaoComercial[] },
  );
  readonly ocupacoesOrdenadas = computed(() => [...this.ocupacoes()].sort((a, b) => {
    const pa = FINALIDADES_EM_DESTAQUE.indexOf(a.codigo);
    const pb = FINALIDADES_EM_DESTAQUE.indexOf(b.codigo);
    if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    return a.rotulo.localeCompare(b.rotulo, 'pt-BR');
  }));

  /** Pré-cálculo do back para a etapa comercial (Dc e alerta por espaço). Só existe com a lista válida. */
  private readonly espacosParaPrevia = new Subject<EspacoComercial[]>();
  readonly previa = toSignal(
    this.espacosParaPrevia.pipe(
      debounceTime(ATRASO_PREVIA_MS),
      switchMap(espacos => espacos.length
        ? this.projetos.preCalcularComercial(espacos).pipe(catchError(() => of(null)))
        : of(null as PreCalculoComercial | null)),
    ),
    { initialValue: null as PreCalculoComercial | null },
  );

  /** Ordem de arraste dos espaços (reordenação por arrastar e soltar). */
  private origemArraste: number | null = null;

  constructor() {
    effect(() => {
      const indice = ABAS_AREA_COMUM.indexOf((this.abaInicial() ?? '') as typeof ABAS_AREA_COMUM[number]);
      if (indice >= 0) untracked(() => this.aba.set(indice));
    }, { allowSignalWrites: true });
    effect(() => {
      const envio = this.etapa() === 3 ? espacosComerciaisParaEnvio(this.dados(), this.valores()) : null;
      this.espacosParaPrevia.next(envio ?? []);
    });
  }

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
  potencia(campo: CampoCarga, valor: number | null): void { this.atualizar(c => c.potencias[campo] = valor); }
  adicionarEspaco(): void { this.atualizar(c => c.comercial.push({ ocupacao: '', area: null, carga: null })); }

  /** Remove o espaço; pede confirmação só quando ele já tem dados preenchidos. */
  /** Confirmação nativa, isolada em método para que os testes a substituam (o diálogo bloqueia o navegador headless). */
  pedirConfirmacao(mensagem: string): boolean { return window.confirm(mensagem); }
  removerEspaco(i: number): void {
    const espaco = this.valores().comercial[i];
    const preenchido = !!espaco && (!!espaco.ocupacao || espaco.area != null || espaco.carga != null);
    if (preenchido && !this.pedirConfirmacao(`Remover o espaço ${i + 1}? Os dados preenchidos serão perdidos.`)) return;
    this.atualizar(c => c.comercial.splice(i, 1));
  }
  finalidade(i: number, codigo: string): void { this.atualizar(c => c.comercial[i].ocupacao = codigo); }
  areaEspaco(i: number, valor: number | null): void { this.atualizar(c => c.comercial[i].area = valor); }
  cargaEspaco(i: number, valor: number | null): void { this.atualizar(c => c.comercial[i].carga = valor); }
  /** Formata kVA no padrão brasileiro (2 casas), pelo Intl do navegador. */
  formatarKva(valor: number | null): string {
    return valor == null ? '—' : valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  rotuloOcupacao(codigo: string): string { return this.ocupacoes().find(o => o.codigo === codigo)?.rotulo ?? ''; }
  /** Aviso (não bloqueia) de carga abaixo do mínimo da ocupação, calculado no back. */
  alertaDoEspaco(i: number): string | null { return this.previa()?.espacos[i]?.alerta ?? null; }

  inicioArraste(i: number, evento: DragEvent): void {
    this.origemArraste = i;
    if (evento.dataTransfer) {
      evento.dataTransfer.effectAllowed = 'move';
      evento.dataTransfer.setData('text/plain', String(i));
    }
  }
  fimArraste(): void { this.origemArraste = null; }
  soltar(destino: number): void {
    const origem = this.origemArraste;
    this.origemArraste = null;
    if (origem === null || origem === destino) return;
    this.atualizar(c => {
      const [item] = c.comercial.splice(origem, 1);
      c.comercial.splice(destino, 0, item);
    });
  }

  medidor(valor: boolean): void { this.atualizar(c => c.especiais.medidorExclusivo = valor); }
  especial(campo: 'pontos' | 'potenciaVeKw' | 'potenciaCv', valor: number | null): void { this.atualizar(c => c.especiais[campo] = valor); }
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
