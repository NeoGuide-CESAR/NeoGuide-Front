import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ProjetosApiService } from './projetos-api.service';
import { ProjetoCompleto } from './projeto-http';
import { ProjetoDetalhado } from './projeto.model';

export function apresentarProjeto(p: ProjetoCompleto): ProjetoDetalhado {
  const c = p.complementos;
  return {
    ...p,
    residencial: { aplicavel: p.dados.tipoEdificacao !== 'Comercial', grupos: c.residencial.grupos.filter(g => g.unidades !== null || g.area !== null) },
    areaComum: { aplicavel: true, cargas: c.cargas },
    // Exibe dados fornecidos, inclusive a loja do artboard Aurora, sem apagá-los pelo tipo da edificação.
    comercial: { aplicavel: c.comercial.length > 0 || p.dados.tipoEdificacao !== 'Residencial multifamiliar', espacos: c.comercial },
    veiculoBomba: { aplicavel: p.dados.temVe || p.dados.temBomba, temVeiculo: p.dados.temVe, temBomba: p.dados.temBomba, ...c.especiais },
    resultado: p.resultadoInvalidado ? null : p.resultado ?? null,
  };
}

/** Fachada de leitura das telas 24 e 22, sem qualquer fórmula de demanda. */
@Injectable({ providedIn: 'root' })
export class ProjetoService {
  private readonly api = inject(ProjetosApiService);
  obter(id: string): Observable<ProjetoDetalhado> {
    // TODO NEO-38/40: validar o DTO com resultado incluído no GET do projeto.
    // Com environment.mockApi=false, a mesma chamada usa environment.apiUrl e a API real.
    return this.api.obter(id).pipe(map(apresentarProjeto));
  }
}
