import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { NeoStateService } from './neo-state.service';
import { NeoService } from './neo.service';
import { PedidoNeo, RespostaNeo } from './neo.model';

const SESSAO = 'neoguide.sessao';

describe('NeoStateService', () => {
  let estado: NeoStateService;
  let enviarMensagem: jasmine.Spy<(pedido: PedidoNeo) => ReturnType<NeoService['enviarMensagem']>>;

  const resposta = (semFonte = false): RespostaNeo => ({
    conversaId: 'c-1',
    resposta: semFonte ? 'Não encontrei.' : 'Resposta com fonte.',
    fontes: semFonte ? [] : [{ documento: 'DIS-NOR-030', secao: 'Tabela 10' }],
    semFonte,
  });

  beforeEach(() => {
    // Com sessão válida antes de criar o serviço: sem ela, o efeito de sessão limpa as mensagens.
    sessionStorage.setItem(SESSAO, JSON.stringify({ id: '1', nome: 'Maria Souza', email: 'm@x.com', perfil: 'projetista' }));
    enviarMensagem = jasmine.createSpy('enviarMensagem').and.returnValue(of(resposta()));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: NeoService, useValue: { enviarMensagem, listarConversas: () => of([]), abrirConversa: () => of(), excluirConversa: () => of(undefined) } },
      ],
    });
    estado = TestBed.inject(NeoStateService);
  });

  afterEach(() => sessionStorage.removeItem(SESSAO));

  it('envia a pergunta e acrescenta a resposta com fonte', () => {
    estado.enviar('  Carga reserva?  ');
    const [usuario, neo] = estado.mensagens();
    expect(usuario.autor).toBe('usuario');
    expect(usuario.texto).toBe('Carga reserva?');
    expect(neo.autor).toBe('neo');
    expect(neo.fontes).toEqual([{ documento: 'DIS-NOR-030', secao: 'Tabela 10' }]);
    expect(estado.emAndamento()).toBeFalse();
  });

  it('conta respostas não lidas quando o painel está minimizado', () => {
    estado.enviar('Pergunta');
    expect(estado.naoLidas()).toBe(1);
    estado.abrirPainel();
    expect(estado.naoLidas()).toBe(0);
  });

  it('marca resposta sem fonte', () => {
    enviarMensagem.and.returnValue(of(resposta(true)));
    estado.enviar('Algo fora da norma');
    expect(estado.mensagens().at(-1)?.semFonte).toBeTrue();
  });

  it('mostra erro com tentativa e reenvia sem duplicar a pergunta', () => {
    enviarMensagem.and.returnValue(throwError(() => new Error('falhou')));
    estado.enviar('Pergunta');
    expect(estado.mensagens().at(-1)?.falhou).toBeTrue();

    enviarMensagem.and.returnValue(of(resposta()));
    estado.tentarNovamente();
    const autores = estado.mensagens().map((m) => m.autor);
    expect(autores).toEqual(['usuario', 'neo']);
    expect(estado.mensagens().some((m) => m.falhou)).toBeFalse();
  });

  it('ignora perguntas vazias e acima do limite', () => {
    estado.enviar('   ');
    estado.enviar('x'.repeat(501));
    expect(enviarMensagem).not.toHaveBeenCalled();
  });

  it('usa o projeto da rota como contexto e avisa quando muda de projeto', () => {
    estado.aoNavegar('/projetos/p2/calculo');
    expect(estado.contextoAtivo()?.id).toBe('p2');

    estado.enviar('Pergunta');
    expect(enviarMensagem.calls.mostRecent().args[0].projetoId).toBe('p2');

    estado.aoNavegar('/projetos/p3/calculo');
    expect(estado.mensagens().at(-1)).toEqual(jasmine.objectContaining({ autor: 'sistema' }));
    expect(estado.mensagens().at(-1)?.texto).toContain('Residencial Boa Viagem');
  });

  it('sem projeto na rota não há contexto nem aviso', () => {
    estado.aoNavegar('/projetos/p2/calculo');
    estado.aoNavegar('/meus-projetos');
    expect(estado.contextoAtivo()).toBeNull();
    expect(estado.mensagens().some((m) => m.autor === 'sistema')).toBeFalse();
  });

  it('remover o contexto tira o projeto do envio', () => {
    estado.aoNavegar('/projetos/p2/calculo');
    estado.removerContexto();
    estado.enviar('Pergunta');
    expect(enviarMensagem.calls.mostRecent().args[0].projetoId).toBeUndefined();
    expect(estado.contextoRemovidoVisivel()).toBeTrue();
  });
});
