import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { STATUS_INFO, StatusProjeto } from '../../core/projetos/projeto.model';

@Component({
  selector: 'app-projeto-status', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="selo" [attr.data-status]="status()"><span class="ms" aria-hidden="true">{{ info().icone }}</span>{{ info().rotulo }}</span>`,
  styles: `
    :host { display:inline-flex; flex-shrink:0; }
    .selo { display:inline-flex; align-items:center; gap:4px; min-height:28px; padding:0 12px; border-radius:var(--ng-raio-pill); background:var(--ng-fundo-suave); color:var(--ng-texto-3); font-size:13px; font-weight:500; }
    .ms { font-size:17px; }
    [data-status=em_analise] { background:var(--ng-info-bg); color:var(--ng-info); }
    [data-status=aprovado], [data-status=calculado] { background:var(--ng-verde-claro); color:var(--ng-aprovado-texto); }
    [data-status=calculado] { min-height:26px; padding-inline:10px; font-size:12px; }
    [data-status=calculado] .ms { font-size:16px; }
    [data-status=reprovado] { background:var(--ng-danger-bg); color:var(--ng-danger); }
  `,
})
export class ProjetoStatusComponent {
  readonly status = input.required<StatusProjeto | 'calculado'>();
  readonly info = computed(() => this.status() === 'calculado' ? { rotulo: 'Calculado', icone: 'check_circle' } : STATUS_INFO[this.status() as StatusProjeto]);
}
