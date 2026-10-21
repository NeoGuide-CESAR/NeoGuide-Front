import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap, timeout } from 'rxjs';
import { ConsultaCepService } from '../../core/projetos/consulta-cep.service';
import { DadosProjeto, EstadoCep, TIPOS_EDIFICACAO, TipoEdificacao, dadosExemplo, dadosVazios, digitosCep, mascaraCep, normalizarUf } from '../../core/projetos/dados-projeto';

const obrigatorio = (c: AbstractControl) => String(c.value ?? '').trim() ? null : { required: true };
@Component({
  selector: 'app-dados-projeto-form', standalone: true, imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dados-projeto-form.component.html', styleUrl: './dados-projeto-form.component.scss',
})
export class DadosProjetoFormComponent implements OnChanges {
  private readonly api = inject(ConsultaCepService);
  private readonly destroy = inject(DestroyRef);
  private destruido = false;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly consulta = new Subject<string | null>();
  @Input() dados: DadosProjeto = dadosVazios();
  @Output() alterado = new EventEmitter<{ dados: DadosProjeto; valido: boolean }>();
  readonly estadoCep = signal<EstadoCep>('padrao');
  readonly enviado = signal(false);
  readonly tipos = TIPOS_EDIFICACAO;
  readonly campos = [
    { nome: 'nome', label: 'Nome do projeto *', placeholder: 'Ex.: Residencial Jardim', colunas: 8, erro: 'Informe o nome do projeto.' },
    { nome: 'tipoEdificacao', label: 'Tipo de edificação *', placeholder: '', colunas: 4, erro: 'Escolha o tipo de edificação.' },
    { nome: 'cep', label: 'CEP *', placeholder: '00000-000', colunas: 3, erro: 'Informe um CEP com 8 números.' },
    { nome: 'endereco', label: 'Endereço (rua, número e complemento) *', placeholder: 'Ex.: Rua do Exemplo, 120, Bloco B', colunas: 9, erro: 'Informe a rua e o número.' },
    { nome: 'bairro', label: 'Bairro *', placeholder: '', colunas: 5, erro: 'Informe o bairro.' },
    { nome: 'municipio', label: 'Município *', placeholder: '', colunas: 5, erro: 'Informe o município.' },
    { nome: 'uf', label: 'UF *', placeholder: '', colunas: 2, erro: 'UF com 2 letras.' },
  ] as const;
  readonly opcoes = [
    { nome: 'temVe', label: 'Ponto de carregamento de veículo elétrico', icone: 'ev_station' },
    { nome: 'temBomba', label: 'Bomba de incêndio em situação de emergência', icone: 'local_fire_department' },
  ] as const;
  readonly form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [obrigatorio, Validators.maxLength(120)] }),
    tipoEdificacao: new FormControl<TipoEdificacao | ''>('', { nonNullable: true, validators: [Validators.required, c => TIPOS_EDIFICACAO.includes(c.value) ? null : { tipo: true }] }),
    cep: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{5}-\d{3}$/)] }),
    endereco: new FormControl('', { nonNullable: true, validators: [obrigatorio] }),
    bairro: new FormControl('', { nonNullable: true, validators: [obrigatorio] }),
    municipio: new FormControl('', { nonNullable: true, validators: [obrigatorio] }),
    uf: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[A-Z]{2}$/)] }),
    temVe: new FormControl(true, { nonNullable: true }), temBomba: new FormControl(true, { nonNullable: true }),
  });
  constructor() {
    this.destroy.onDestroy(() => { this.destruido = true; });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.emitir());
    this.consulta.pipe(switchMap(cep => {
      if (!cep || cep.length !== 8) { this.estadoCep.set('padrao'); this.emitir(); return of(undefined); }
      this.estadoCep.set('buscando'); this.emitir();
      return this.api.consultar(cep).pipe(timeout(10000), catchError(() => of(null)));
    }), takeUntilDestroyed()).subscribe(endereco => {
      if (endereco === undefined) return;
      if (endereco === null) this.estadoCep.set('falha');
      else if (endereco.naoEncontrado) this.estadoCep.set('nao-encontrado');
      else if (endereco.foraConcessao) this.estadoCep.set('fora-concessao');
      else {
        this.estadoCep.set('encontrado');
        this.form.patchValue({ endereco: endereco.endereco, bairro: endereco.bairro, municipio: endereco.municipio, uf: normalizarUf(endereco.uf) });
        this.focar('endereco');
      }
      this.emitir();
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dados']) {
      this.consulta.next(null);
      this.form.reset({ ...this.dados, cep: mascaraCep(this.dados.cep), uf: normalizarUf(this.dados.uf) }, { emitEvent: false });
      this.enviado.set(false);
      queueMicrotask(() => { if (!this.destruido) this.emitir(); });
    }
  }
  get cepInvalido(): boolean { return ['nao-encontrado', 'fora-concessao'].includes(this.estadoCep()); }
  get valido(): boolean { return this.form.valid && !this.cepInvalido && this.estadoCep() !== 'buscando'; }
  get quantidadeErros(): number { return this.campos.filter(c => this.form.controls[c.nome].invalid || (c.nome === 'cep' && this.cepInvalido)).length; }
  get resumo(): string {
    const n = this.quantidadeErros;
    return n === 1 ? 'Falta 1 campo obrigatório. Ele está marcado em vermelho.' : `Faltam ${n} campos obrigatórios. Eles estão marcados em vermelho.`;
  }
  erro(campo: typeof this.campos[number]['nome']): boolean {
    return ((this.enviado() || this.form.controls[campo].touched) && this.form.controls[campo].invalid) || (campo === 'cep' && this.cepInvalido);
  }
  normalizar(campo: string, event: Event): void {
    const el = event.target as HTMLInputElement;
    if (campo === 'uf') { el.value = normalizarUf(el.value); this.form.controls.uf.setValue(el.value); }
    if (campo === 'cep') { el.value = mascaraCep(el.value); this.form.controls.cep.setValue(el.value); this.consulta.next(digitosCep(el.value)); }
  }
  emitir(): void { this.alterado.emit({ dados: this.form.getRawValue(), valido: this.valido }); }
  validar(): DadosProjeto | null {
    this.enviado.set(true); this.form.markAllAsTouched();
    if (this.valido) return this.form.getRawValue();
    this.focar(this.campos.find(c => this.form.controls[c.nome].invalid || (c.nome === 'cep' && this.cepInvalido))?.nome ?? 'cep');
    return null;
  }
  focar(campo: string): void {
    const el = this.host.nativeElement.querySelector<HTMLInputElement | HTMLSelectElement>(`#projeto-${campo}`);
    el?.focus();
    if (el instanceof HTMLInputElement && campo === 'endereco') el.setSelectionRange(el.value.length, el.value.length);
  }
  /** Controles explícitos de demonstração; cancelam a consulta real em andamento. */
  demonstrarCep(estado: EstadoCep): void {
    this.consulta.next(null); this.estadoCep.set(estado);
    if (estado !== 'padrao' && !this.form.controls.cep.value) this.form.controls.cep.setValue('50050-000');
    if (estado === 'encontrado') {
      const exemplo = dadosExemplo();
      this.form.patchValue({ endereco: exemplo.endereco, bairro: exemplo.bairro, municipio: exemplo.municipio, uf: exemplo.uf });
      this.focar('endereco');
    }
    this.emitir();
  }
  demonstrarTipo(tipo: TipoEdificacao | ''): void { this.form.controls.tipoEdificacao.setValue(tipo); }
  preencherExemplo(): void {
    this.consulta.next(null); const dados = dadosExemplo();
    this.form.setValue({ ...dados, cep: mascaraCep(dados.cep) }); this.enviado.set(false); this.emitir();
  }
}
