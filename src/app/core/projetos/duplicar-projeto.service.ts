import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProjetosApiService } from './projetos-api.service';
import { DuplicacaoContextoService } from './duplicacao-contexto.service';
import { SnackbarService } from '../ui/snackbar.service';

@Injectable({ providedIn: 'root' })
export class DuplicarProjetoService {
  private readonly api = inject(ProjetosApiService);
  private readonly router = inject(Router);
  private readonly contexto = inject(DuplicacaoContextoService);
  private readonly snackbar = inject(SnackbarService);
  readonly duplicando = this.api.duplicando.asReadonly();

  executar(id: string, evento?: Event): void {
    evento?.stopPropagation();
    if (this.duplicando()) return;
    const retorno = this.router.url;
    this.api.duplicar(id).subscribe({
      next: copia => {
        this.contexto.salvar(copia.id, { originalId: id, retorno });
        void this.router.navigate(['/projetos', copia.id, 'calculo'], { queryParams: { duplicadoDe: id } });
      },
      error: () => this.snackbar.mostrar('Não foi possível duplicar o projeto. Tente de novo.'),
    });
  }
}
