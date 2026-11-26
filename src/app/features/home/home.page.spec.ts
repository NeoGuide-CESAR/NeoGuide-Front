import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProjetosService } from '../../core/projetos/projetos.service';
import { HomePage } from './home.page';

describe('Home: projetos recentes', () => {
  it('cada projeto recente leva à mesma rota que o clique em Meus Projetos (/projetos/:id)', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    const projetos = TestBed.inject(ProjetosService) as unknown as { _recentes: { set(v: unknown[]): void } };
    projetos._recentes.set([{ id: '12', nome: 'Residencial Jardim', status: 'rascunho', atualizadoEm: '2026-11-24T10:00:00' }]);
    const f = TestBed.createComponent(HomePage);
    f.detectChanges();
    const link = f.nativeElement.querySelector('a.projeto') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/projetos/12');
  });
});
