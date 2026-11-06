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
    path: 'meus-projetos',
    title: 'Meus Projetos · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/meus-projetos/meus-projetos.page').then((m) => m.MeusProjetosPage),
  },
  {
    path: 'projetos/:id/resultado',
    title: 'Resultado do cálculo · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/resultado-calculo/resultado-calculo.page').then(m => m.ResultadoCalculoPage),
  },
  {
    path: 'projetos/:id',
    title: 'Detalhamento do projeto · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/detalhe-projeto/detalhe-projeto.page').then(m => m.DetalheProjetoPage),
  },
  {
    path: 'projetos/:id/calculo',
    title: 'Cálculo de Demanda · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/calculo-demanda/calculo-demanda.page').then((m) => m.CalculoDemandaPage),
  },
  {
    path: 'sessao-expirada',
    title: 'Sessão expirada · NeoGuide',
    loadComponent: () => import('./features/sessao-expirada/sessao-expirada.page').then((m) => m.SessaoExpiradaPage),
  },
  { path: '**', redirectTo: 'login' },
];
