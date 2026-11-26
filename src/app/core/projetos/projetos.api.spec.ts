import { ProjetoApi, paraDadosProjeto, paraPayloadProjeto, paraProjeto, paraResumo, paraTotaisFiltro, situacoesDoFiltro } from './projetos.api';

const API: ProjetoApi = {
  id: 7,
  protocolo: 'NEO-2026-000007',
  nome: 'Residencial Jardim',
  status: 'AGUARDANDO_CORRECAO',
  statusDescricao: 'Aguardando correção',
  tipoEdificacao: 'RESIDENCIAL_MULTIFAMILIAR',
  tipoEdificacaoDescricao: 'Residencial multifamiliar',
  uf: 'PE',
  municipio: 'Recife',
  endereco: 'Rua do Exemplo, 120',
  bairro: 'Boa Vista',
  cep: '50050000',
  tensaoFornecimento: '380_220V',
  possuiComercial: false,
  possuiVe: true,
  possuiIncendio: false,
  etapaAtual: 3,
  dataSubmissao: '2026-10-01T10:00:00',
  createdAt: '2026-10-01T10:00:00',
  updatedAt: '2026-10-07T09:30:00',
};

describe('projetos: mapeamento da API', () => {
  it('"Aguardando correção" entra no grupo Reprovado, com o rótulo do back', () => {
    const projeto = paraProjeto(API);
    expect(projeto.status).toBe('reprovado');
    expect(projeto.rotuloStatus).toBe('Aguardando correção');
    expect(projeto.id).toBe('7');
    expect(projeto.atualizadoEm).toBe('2026-10-07');
    expect(projeto.enviadoEm).toBe('2026-10-01');
  });

  it('rascunho não mostra "enviado em" e tem a próxima etapa pelo número da etapa atual', () => {
    const rascunho = paraProjeto({ ...API, status: 'RASCUNHO', statusDescricao: 'Rascunho', etapaAtual: 2 });
    expect(rascunho.enviadoEm).toBeUndefined();
    expect(rascunho.proximaEtapa).toBe('Unidades residenciais');
    expect(rascunho.totalEtapas).toBe(6);
  });

  it('chips e indicadores somam Aguardando correção em Reprovado', () => {
    const totais = { todos: 9, rascunho: 2, emAnalise: 3, aguardandoCorrecao: 1, aprovado: 2, reprovado: 1 };
    expect(paraResumo(totais)).toEqual({ rascunho: 2, em_analise: 3, aprovado: 2, reprovado: 2 });
    expect(paraTotaisFiltro(totais)).toEqual({ todos: 9, rascunho: 2, em_analise: 3, aprovado: 2, reprovado: 2 });
  });

  it('filtro Reprovado pede as duas situações ao back; Todos não filtra', () => {
    expect(situacoesDoFiltro('reprovado')).toEqual(['REPROVADO', 'AGUARDANDO_CORRECAO']);
    expect(situacoesDoFiltro('todos')).toEqual([]);
  });

  it('formulário do passo 1 vira o payload do back, com o tipo de edificação em enum', () => {
    const payload = paraPayloadProjeto({
      nome: ' Edifício Novo ',
      tipoEdificacao: 'Uso misto (residencial e comercial)',
      cep: '50050000',
      endereco: 'Rua A, 1',
      bairro: 'Centro',
      municipio: 'Recife',
      uf: 'PE',
      temVe: true,
      temBomba: false,
    });
    expect(payload.titulo).toBe('Edifício Novo');
    expect(payload.tipoEdificacao).toBe('MISTO');
    expect(payload.possuiComercial).toBeTrue();
    expect(payload.possuiVe).toBeTrue();
    expect(payload.possuiIncendio).toBeFalse();
    expect(payload.tensaoFornecimento).toBe('380_220V');
  });

  it('tipo não escolhido vai como null (o back recusa com a mensagem de validação)', () => {
    const payload = paraPayloadProjeto({
      nome: 'X', tipoEdificacao: '', cep: '', endereco: '', bairro: '', municipio: '', uf: '', temVe: false, temBomba: false,
    });
    expect(payload.tipoEdificacao).toBeNull();
    expect(payload.possuiComercial).toBeFalse();
  });

  it('projeto do back abre no passo 1 com o tipo em texto do formulário', () => {
    const dados = paraDadosProjeto(API);
    expect(dados.nome).toBe('Residencial Jardim');
    expect(dados.tipoEdificacao).toBe('Residencial multifamiliar');
    expect(dados.temVe).toBeTrue();
    expect(dados.uf).toBe('PE');
  });
});
