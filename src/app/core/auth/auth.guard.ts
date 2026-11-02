import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ROTA_INICIAL } from './return-url';

/** Só deixa entrar quem está logado; senão manda para /login, guardando a rota pedida. */
export const authGuard: CanActivateFn = (_rota, estado) => {
  const auth = inject(AuthService);
  return auth.autenticado()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: estado.url } });
};

/** Quem já está logado não precisa ver o login de novo. */
export const visitanteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? inject(Router).createUrlTree([ROTA_INICIAL]) : true;
};
