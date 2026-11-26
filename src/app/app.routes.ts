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
    path: 'cadastro',
    title: 'Criar conta · NeoGuide',
    canActivate: [visitanteGuard],
    loadComponent: () => import('./features/cadastro/cadastro.page').then((m) => m.CadastroPage),
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
  // "Abrir projeto" leva ao cálculo do projeto
  {
    path: 'projetos/:id',
    pathMatch: 'full',
    title: 'Projeto · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/projeto/detalhe-projeto.page').then((m) => m.DetalheProjetoPage),
  },
  {
    path: 'normas',
    title: 'Normas técnicas · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/normas/normas.page').then((m) => m.NormasPage),
  },
  {
    path: 'normas/:codigo',
    title: 'Normas técnicas · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/normas/normas.page').then((m) => m.NormasPage),
  },
  {
    path: 'perfil',
    title: 'Meu perfil · NeoGuide',
    canActivate: [authGuard],
    // Com alterações não salvas, pergunta antes de sair.
    canDeactivate: [(pagina: { podeSair(): boolean }) => pagina.podeSair()],
    loadComponent: () => import('./features/perfil/perfil.page').then((m) => m.PerfilPage),
  },
  {
    path: 'projetos/:id/calculo',
    title: 'Cálculo de Demanda · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/calculo-demanda/calculo-demanda.page').then((m) => m.CalculoDemandaPage),
  },
  // Uma rota por etapa do wizard (etapa-1 a etapa-5). Abrem a etapa pedida, não a que está salva no projeto.
  ...[1, 2, 3, 4, 5].map((n) => ({
    path: `projetos/:id/etapa-${n}`,
    title: 'Cálculo de Demanda · NeoGuide',
    canActivate: [authGuard],
    canDeactivate: [(pagina: { podeSair(): boolean }) => pagina.podeSair()],
    data: { etapa: n },
    loadComponent: () => import('./features/calculo-demanda/calculo-demanda.page').then((m) => m.CalculoDemandaPage),
  })),
  {
    path: 'projetos/:id/revisao',
    title: 'Revisão · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/calculo/revisao.page').then((m) => m.RevisaoPage),
  },
  {
    path: 'projetos/:id/calculando',
    title: 'Calculando · NeoGuide',
    canActivate: [authGuard],
    // Sair durante o cálculo pede confirmação; o cálculo continua no servidor.
    canDeactivate: [(pagina: { podeSair(): boolean }) => pagina.podeSair()],
    loadComponent: () => import('./features/calculo/calculando.page').then((m) => m.CalculandoPage),
  },
  {
    path: 'projetos/:id/resultado',
    title: 'Resultado do cálculo · NeoGuide',
    canActivate: [authGuard],
    loadComponent: () => import('./features/calculo/resultado.page').then((m) => m.ResultadoPage),
  },
  {
    path: 'sessao-expirada',
    title: 'Sessão expirada · NeoGuide',
    loadComponent: () => import('./features/sessao-expirada/sessao-expirada.page').then((m) => m.SessaoExpiradaPage),
  },
  { path: '**', redirectTo: 'login' },
];
