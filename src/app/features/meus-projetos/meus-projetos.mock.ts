import { Projeto } from '../../core/projetos/projeto.model';

/**
 * Dados SIMULADOS para a tela "Meus Projetos" (artboard Meus Projetos).
 * Quando a API existir, troque por um carregamento via HttpClient.
 */
export const PROJETOS_MOCK: Projeto[] = [
  { id: 'p1', nome: 'Residencial Jardim', status: 'rascunho', atualizadoEm: '2026-10-07', criadoEm: '2026-02-04', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Av. Caxangá, 450 - Boa Viagem', unidadesConsumidoras: 32, etapaAtual: 3, totalEtapas: 6, proximaEtapa: 'Cargas da área comum' },
  { id: 'p2', nome: 'Condomínio Aurora', status: 'em_analise', atualizadoEm: '2026-10-22', criadoEm: '2026-01-18', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua das Graças, 120 - Graças', unidadesConsumidoras: 48 },
  { id: 'p3', nome: 'Residencial Boa Viagem', status: 'aprovado', atualizadoEm: '2026-09-30', criadoEm: '2025-12-02', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Av. Boa Viagem, 2200 - Boa Viagem', unidadesConsumidoras: 64 },
  { id: 'p4', nome: 'Condomínio Atlântico', status: 'reprovado', atualizadoEm: '2026-09-22', criadoEm: '2025-11-14', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Av. Boa Viagem, 980 - Pina', unidadesConsumidoras: 40 },
  { id: 'p5', nome: 'Condomínio Recife Sul', status: 'em_analise', atualizadoEm: '2026-09-18', criadoEm: '2025-10-28', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua Real da Torre, 300 - Torre', unidadesConsumidoras: 56 },
  { id: 'p6', nome: 'Condomínio Mar Azul', status: 'aprovado', atualizadoEm: '2026-09-10', criadoEm: '2025-09-21', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Av. Conselheiro Aguiar, 1500 - Boa Viagem', unidadesConsumidoras: 72 },
  { id: 'p7', nome: 'Residencial Parque das Rosas', status: 'rascunho', atualizadoEm: '2026-09-02', criadoEm: '2025-08-30', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua Setúbal, 850 - Boa Viagem', unidadesConsumidoras: 24, etapaAtual: 1, totalEtapas: 6, proximaEtapa: 'Unidades residenciais' },
  { id: 'p8', nome: 'Condomínio Jaguaribe', status: 'em_analise', atualizadoEm: '2026-08-27', criadoEm: '2025-08-02', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua Jaguaribe, 410 - Boa Vista', unidadesConsumidoras: 36 },
  { id: 'p9', nome: 'Edifício Vitória Régia', status: 'aprovado', atualizadoEm: '2026-08-19', criadoEm: '2025-07-11', tipoEdificacao: 'Comercial', endereco: 'Av. República do Líbano, 251 - Pina', unidadesConsumidoras: 18 },
  { id: 'p10', nome: 'Condomínio Monte Verde', status: 'reprovado', atualizadoEm: '2026-08-05', criadoEm: '2025-06-23', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua do Futuro, 600 - Graças', unidadesConsumidoras: 44 },
  { id: 'p11', nome: 'Residencial Costa Dourada', status: 'rascunho', atualizadoEm: '2026-07-29', criadoEm: '2025-06-01', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Av. Herculano Bandeira, 180 - Pina', unidadesConsumidoras: 28, etapaAtual: 2, totalEtapas: 6, proximaEtapa: 'Espaços comerciais' },
  { id: 'p12', nome: 'Condomínio Brisa do Mar', status: 'aprovado', atualizadoEm: '2026-07-14', criadoEm: '2025-05-19', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua Barão de Itamaracá, 90 - Boa Vista', unidadesConsumidoras: 52 },
  { id: 'p13', nome: 'Edifício Comercial Rio Branco', status: 'em_analise', atualizadoEm: '2026-06-30', criadoEm: '2025-04-28', tipoEdificacao: 'Comercial', endereco: 'Av. Rio Branco, 300 - Santo Antônio', unidadesConsumidoras: 12 },
  { id: 'p14', nome: 'Condomínio Villa Bela', status: 'aprovado', atualizadoEm: '2026-06-18', criadoEm: '2025-04-02', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua Dezessete, 220 - Casa Forte', unidadesConsumidoras: 60 },
  { id: 'p15', nome: 'Residencial Alto da Boa Vista', status: 'reprovado', atualizadoEm: '2026-05-25', criadoEm: '2025-03-15', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua Dom Bosco, 75 - Boa Vista', unidadesConsumidoras: 20 },
  { id: 'p16', nome: 'Condomínio Flor de Lis', status: 'em_analise', atualizadoEm: '2026-05-12', criadoEm: '2025-02-20', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua Ribeiro de Brito, 500 - Boa Viagem', unidadesConsumidoras: 38 },
  { id: 'p17', nome: 'Residencial Vale do Sol', status: 'rascunho', atualizadoEm: '2026-04-30', criadoEm: '2025-01-26', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua Sete de Setembro, 310 - Boa Vista', unidadesConsumidoras: 16, etapaAtual: 1, totalEtapas: 6, proximaEtapa: 'Unidades residenciais' },
  { id: 'p18', nome: 'Condomínio Porto Seguro', status: 'aprovado', atualizadoEm: '2026-04-11', criadoEm: '2024-12-09', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Av. Domingos Ferreira, 2300 - Boa Viagem', unidadesConsumidoras: 68 },
  { id: 'p19', nome: 'Edifício Comercial Marco Zero', status: 'em_analise', atualizadoEm: '2026-03-22', criadoEm: '2024-11-14', tipoEdificacao: 'Comercial', endereco: 'Rua do Bom Jesus, 50 - Recife Antigo', unidadesConsumidoras: 10 },
  { id: 'p20', nome: 'Condomínio Nova Esperança', status: 'reprovado', atualizadoEm: '2026-03-05', criadoEm: '2024-10-30', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua Imperial, 420 - São José', unidadesConsumidoras: 30 },
  { id: 'p21', nome: 'Residencial Palmeiras', status: 'aprovado', atualizadoEm: '2026-02-18', criadoEm: '2024-09-17', tipoEdificacao: 'Residencial multifamiliar', endereco: 'Rua das Palmeiras, 88 - Espinheiro', unidadesConsumidoras: 46 },
];
