# Etapa 4 (Comercial) liberada para todos os projetos

A etapa Comercial aparecia bloqueada (cadeado) em projetos residenciais. Pela nova regra ela é sempre disponível e sempre opcional.
Este relatório registra o diagnóstico (feito antes de alterar código), a nova regra e o que foi mudado.

## 1. Diagnóstico

| Pergunta | Resposta encontrada |
|---|---|
| Onde o stepper decidia o bloqueio | No front: `etapasAplicaveis()` (`core/projetos/dados-projeto.ts`), usada por `etapaLiberada()` em `wizard-body.component.ts`. Não vinha do back. |
| Condição usada | Só o tipo de edificação: `comercial = tipo !== 'Residencial multifamiliar'`. A flag `possuiComercial` não participava. |
| Guard de rota | Não havia guard. O bloqueio era do componente do wizard: o `receberDados()` mandava de volta para a etapa 1 quando a etapa pedida não estava liberada (valia também para a URL direta). |
| Back recusava o PUT em residencial | Sim: `saveCommercialStage` lançava `ValidationException` no campo `espacos` ("Espaço comercial exige edificação comercial ou mista…"), HTTP 400. |
| Onde nascia "Edificação residencial não pode ter espaço comercial" | No front, em `errosCalculo` (campo `tipo-residencial`), e no back como `COMERCIAL_TIPO_INCOMPATIVEL` na validação normativa. |
| Check em etapas não preenchidas ("Rua teste") | O `completa()` do wizard tratava todo projeto salvo (`edicao`) como se todas as etapas tivessem sido visitadas: qualquer etapa sem erro local aparecia com check (área comum, VE e Revisão, que aceitam vazio). O estado era deduzido no navegador, não vinha de dado gravado. |

## 2. Nova regra (substitui a decisão D2 e o erro B-VL-07)

- A etapa Comercial é sempre disponível e opcional, para qualquer tipo de edificação. Sem espaços: etapa válida, Dc = 0, o usuário avança. Com espaços: cada espaço precisa de finalidade, área e carga instalada.
- Não há mais erro de tipo incompatível (`COMERCIAL_TIPO_INCOMPATIVEL` e a regra B-VL-07 foram removidos, no front e no back).
- O back deriva um **tipo para o enquadramento**, sem alterar o que o usuário escolheu:

| Escolhido | Espaços comerciais | Tipo de enquadramento | Limite de BT |
|---|---|---|---|
| Residencial multifamiliar | não | Residencial | 300 kVA |
| Residencial multifamiliar | sim | **Misto** | 225 kVA |
| Misto | qualquer | Misto | 225 kVA |
| Comercial | qualquer | Comercial | 225 kVA |

- Quando o derivado difere do escolhido, a validação gera o ALERTA `TIPO_ENQUADRAMENTO_MISTO` (não bloqueia), com os links "Revisar espaços" (etapa 4) e "Alterar tipo" (etapa 1, campo `tipoEdificacao`).
- O cálculo e o resultado usam o tipo derivado e devolvem `tipoEdificacao` (escolhido), `tipoEnquadramento` (derivado) e `motivoEnquadramento`. O memorial informa os dois e a razão.
- `possuiComercial` deixou de controlar a disponibilidade; é derivado dos espaços gravados (verdadeiro quando há ao menos um).

## 3. O que foi feito

### Back
- `saveCommercialStage` aceita qualquer tipo e lista vazia; a resposta traz `tipoEnquadramento`.
- `EnquadramentoEdificacao` (derivação e motivo) usado pelo cálculo, pela validação e pelo `GET` do projeto.
- `EstadoEtapasService`: estado de cada etapa calculado no servidor e devolvido em `GET /projects/{id}` (`etapas[]`, mais `tipoEnquadramento`).
  - `etapaAtual` do projeto passa a ser lida como "a etapa mais adiantada que o usuário alcançou" (1 a 6).
  - CONCLUIDA: o usuário já passou da etapa e os dados exigidos estão gravados. Nada se conclui nem abre com etapa anterior pendente.
  - NAO_SE_APLICA: etapa 5 sem VE nem bomba, e etapa 2 em projeto do tipo Comercial.
  - A etapa 4 nunca depende do tipo de edificação.
- Novo `PUT /projects/{id}/etapa-atual` (`{ "etapa": 1 a 6 }`, nunca recua): é o que marca como concluída uma etapa opcional avançada sem preencher.
- Validação: removido `COMERCIAL_TIPO_INCOMPATIVEL`; adicionado `TIPO_ENQUADRAMENTO_MISTO`. Os itens ganharam `rotuloAcao` e `alternativa`.

### Front
- Stepper exibe exatamente o estado do servidor: check só em CONCLUIDA, cadeado só em BLOQUEADA, círculo com borda em DISPONIVEL, traço e "Não se aplica" em NAO_SE_APLICA (clicável).
- Revisão libera com as etapas 1 a 5 concluídas ou que não se aplicam.
- Texto "Conclua a etapa atual para liberar a próxima." só aparece quando há etapa bloqueada.
- URL direta (`/projetos/:id/etapa-4`) abre a etapa pedida; etapa bloqueada redireciona para a primeira não concluída, com "Conclua as etapas anteriores primeiro.".
- O wizard registra a etapa alcançada ao avançar e atualiza os estados depois de cada gravação.
- Etapa 4: sem erro de tipo; texto de estado vazio; aviso informativo de enquadramento misto (tipo residencial com espaços); botão ADICIONAR ESPAÇO desabilitado em 100 espaços. Etapa 5 explica quando não se aplica.
- Revisão e Resultado tratam Comercial como sempre aplicável ("Nenhum espaço comercial informado" quando vazia); o Resultado mostra o tipo de enquadramento e o motivo.

### Bugs encontrados e corrigidos durante a verificação
1. Ao salvar a etapa 1, o wizard voltava para ela: o reset local rodava com estados do servidor ainda antigos. Com estado do servidor não há mais reset.
2. URL direta para uma etapa abria a etapa 1: o reset rodava antes de o projeto carregar. Agora só roda com o projeto carregado e sem estado do servidor.
3. Uma etapa posterior podia aparecer concluída com uma anterior incompleta: a verificação de sequência passou a vir primeiro.

## 4. Testes

- Back: **372/372**. Novos em `EtapasEEnquadramentoTest` (residencial com espaço e Ded 230 kVA → MT; sem espaço → BT; misto; estados por tipo; sem dado não conclui; lista vazia conclui ao avançar; etapa 5; `etapa-atual`), e ajustados os testes que fixavam a regra antiga. Os valores de Dc (Loja 20 kW = 21,74 kVA; Escritório 30 kW = 29,35 kVA; lista vazia = 0) seguem cobertos pelos testes do motor.
- Front: **117/117**. Novos: stepper com o estado do servidor, Comercial sem cadeado, URL direta, regressão do reset, Revisão com os dois links do alerta, Resultado com o tipo de enquadramento.
- Ponta a ponta no navegador:
  1. Projeto residencial novo: etapas 1 a 3 concluídas e Comercial liberada (sem cadeado); estado vazio com o texto da especificação.
  2. Loja 120 m² 20 kW, Escritório 85 m² 30 kW, Restaurante 60 m² 15 kW gravados; aviso de enquadramento misto; etapa 5 explica que não se aplica.
  3. Revisão: "1 ponto merece atenção. Você pode calcular.", com "Revisar espaços" e "Alterar tipo".
  4. Resultado: "Tipo de enquadramento: Uso misto (edificação residencial com espaços comerciais, tratada como mista)".
  5. Outro projeto residencial, aberto direto em `/etapa-4`: avançou vazio, ficou CONCLUIDA, "Tudo certo para calcular", Dc 0 e enquadramento Residencial.

## 5. Não feito ou diferente da especificação

- **Aparência da etapa 4:** foi mantido o layout atual (cartão por espaço, select, área, carga, lixeira, alça de arrastar). Não foi refeito com Angular Material (`mat-form-field`), que o projeto não usa.
- **Barra inferior:** não tem o indicador "Rascunho salvo automaticamente" com `cloud_done` nem o TENTAR AGORA; continua a mensagem de status atual. A barra fixa do mobile não foi feita.
- **Autosave:** debounce de 400 ms (a especificação pede 500 ms) e gravação a cada alteração, não só no blur.
- **Confirmação de remover espaço:** usa a confirmação nativa do navegador, não o diálogo CANCELAR/REMOVER.
- **Estado ATUAL:** o servidor devolve ATUAL para a etapa mais adiantada; na tela, a etapa aberta é a da rota.
- **Projetos antigos:** como `etapaAtual` passou a ter esse significado de "mais adiantada", projetos criados antes podem mostrar etapas ainda não concluídas até o usuário avançar.
- **Valores das faixas e limites** do relatório de premissas: a nova regra está registrada aqui e na seção 11 de `AUDITORIA-INTEGRACAO.md`.
