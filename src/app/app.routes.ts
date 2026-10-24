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
  {
    path: 'perfil',
    title: 'Meu perfil · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/perfil/perfil.page').then(m => m.PerfilPage),
  },
  {
    path: 'meus-projetos',
    title: 'Meus Projetos · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/meus-projetos/meus-projetos.page').then((m) => m.MeusProjetosPage),
  },
  {
    path: 'projetos/:id/calculo',
    title: 'Cálculo de Demanda · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/calculo-demanda/calculo-demanda.page').then((m) => m.CalculoDemandaPage),
  },
  { path: '**', redirectTo: 'login' },
];
