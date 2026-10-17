import { Routes } from '@angular/router';
import { authGuard, visitanteGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login/neoenergia',
    title: 'Acesso Neoenergia · NeoGuide',
    canActivate: [visitanteGuard],
    loadComponent: () => import('./features/login/neoenergia-login.page').then((m) => m.NeoenergiaLoginPage),
  },
  {
    path: 'login',
    title: 'Login · NeoGuide',
    canActivate: [visitanteGuard],
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'inicio',
    title: 'Início · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
  },
  { path: '**', redirectTo: 'login' },
];
