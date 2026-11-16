import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_BASE } from '../api/api.config';
import { AuthService } from './auth.service';

/**
 * Interceptor da API do back (/api/v1):
 * - anexa `Authorization: Bearer <token>` nas chamadas autenticadas;
 * - em 401 (sessão expirada ou token inválido) limpa a sessão e leva ao Estado B (/sessao-expirada),
 *   guardando a rota atual para voltar depois do novo login.
 * Não se aplica ao login (credenciais erradas são mostradas na própria tela) nem às chamadas do Neo (/api/neo).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const ehLogin = req.url.startsWith(`${API_BASE}/auth/login`);
  const token = auth.token();
  const requisicao = token && !ehLogin ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(requisicao).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse && erro.status === 401 && !ehLogin) {
        auth.sair();
        void router.navigate(['/sessao-expirada'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => erro);
    }),
  );
};
