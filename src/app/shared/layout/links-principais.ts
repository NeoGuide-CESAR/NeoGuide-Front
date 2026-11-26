import { LinkNav } from './site-header.component';

/** Menu superior das telas autenticadas. */
export const LINKS_PRINCIPAIS: LinkNav[] = [
  { rotulo: 'Início', rota: '/inicio' },
  { rotulo: 'Meus Projetos', rota: '/meus-projetos' },
  { rotulo: 'Cálculo de Demanda', href: '#', submenu: true },
  { rotulo: 'Documentos', rota: '/normas' },
];
