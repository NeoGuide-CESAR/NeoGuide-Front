# Correção da etapa "Revise antes de calcular"

Dois problemas: os botões EDITAR não levavam à etapa certa e os alertas não correspondiam aos dados preenchidos.
Este relatório registra o diagnóstico (feito antes de alterar código), a causa de cada problema e a correção.

## 1. Diagnóstico

Ambiente: back em 8081, front em 4201, Chrome headless dirigido por script. Projeto de teste sem área comum gravada (o caso do "1 ponto merece atenção").

### 1.1 Botões EDITAR

| Cartão | Rota chamada (antes) | Etapa que abria | Rota esperada |
|---|---|---|---|
| 1 · Projeto | `/projetos/11/calculo?etapa=0&retorno=revisao` | Etapa 1 | `/projetos/:id/etapa-1` |
| 2 · Residencial | `/projetos/11/calculo?etapa=1&retorno=revisao` | **Etapa 1** | `/projetos/:id/etapa-2` |
| 3 · Área comum | `/projetos/11/calculo?etapa=2&retorno=revisao` | **Etapa 1** | `/projetos/:id/etapa-3?aba=` |
| 4 · Comercial | `/projetos/11/calculo?etapa=3&retorno=revisao` | **Etapa 1** | `/projetos/:id/etapa-4` |
| 5 · VE e bomba | `/projetos/11/calculo?etapa=4&retorno=revisao` | **Etapa 1** | `/projetos/:id/etapa-5` |

**Causa encontrada.** A URL era absoluta e estava certa; o problema era o wizard. Ao receber os dados do formulário, `receberDados()` fazia
`if (!etapaLiberada(etapaAtual())) etapaSelecionada.set(0)`. Quando a página abre, o formulário ainda não é válido (o projeto carrega de forma assíncrona),
então `etapaLiberada(n)` dava falso e o wizard voltava para a etapa 1. Causas descartadas: `routerLink` relativo, `:id` ausente, nome de rota,
clique capturado pelo cartão, botão `submit` em formulário. Também não havia guard de rota; o redirecionamento vinha do próprio componente.

### 1.2 Alertas

- **Onde eram gerados:** só no back (`GET /validacao-normativa`). O front apenas exibia.
- **Alerta visto:** `area_comum_vazia` (ALERTA, etapa `area-comum`), "Área comum sem cargas informadas: a demanda de serviços (Ds) entra como zero."
- **Regra que o disparou:** nenhuma carga de área comum gravada no banco. Valor lido: 0 linhas em `common_area_loads`.
- **Valor realmente salvo:** a área comum que o usuário preencheu no wizard **não é gravada no servidor** (fica só no navegador), então o banco estava mesmo vazio.

**Causa encontrada.** O alerta era uma regra que eu criei e que não faz parte do catálogo da especificação. Ela disparava para qualquer projeto
criado pelo wizard, porque o wizard não grava a área comum. Outras causas da lista: nomes de campo diferentes (não era o caso),
cache (não havia), INFO contado como atenção (não era o caso), concordância (já estava correta no caso de 1 ponto, mas o texto era montado dentro do template).
Também apareciam na validação, para qualquer projeto, mensagens que dependem do resultado do cálculo (até 50 kVA, média tensão, Ip, relé); foram retiradas.

## 2. Correção dos botões EDITAR

- Rotas `/projetos/:id/etapa-1` a `/etapa-5`, uma por etapa, que abrem a etapa pedida (não a salva no projeto).
- `WizardRoutes` (`core/projetos/wizard-routes.ts`) monta as rotas em um lugar só, usado pelos botões EDITAR, pelo stepper da Revisão e pelos links dos alertas. Rotas absolutas, com o id.
- Parâmetros: `origem=revisao` em todo EDITAR; cartão 3 envia `aba` (a do primeiro alerta do cartão ou, sem alerta, nenhuma, que abre a primeira); links de alerta enviam também `campo` e `item`.
- O wizard, vindo da Revisão (`origemRevisao`): não redireciona para a etapa 1, libera as etapas anteriores e usa o botão **SALVAR E VOLTAR PARA A REVISÃO** (salva, espera a confirmação do servidor e navega para `/revisao`).
- Foco: o wizard aguarda o projeto carregar, abre a aba pedida na área comum e dá foco ao campo (`idDoCampo` traduz o campo do back para o campo da tela, inclusive o índice do grupo ou do espaço).
- Saída com alteração ainda não confirmada pelo servidor: pergunta "Descartar alterações?" (confirmação nativa do navegador, não um diálogo próprio).
- Botões `type="button"`, `aria-label` "Editar etapa …", link só renderizado depois de o projeto carregar.

## 3. Correção dos alertas

### 3.1 Fonte única
- A Revisão busca projeto, etapas e validação sempre de novo ao abrir (sem cache). A validação do back lê só o banco.
- O wizard só navega para a Revisão depois de o servidor confirmar o salvamento; assim a validação já enxerga o último autosave.
- Contrato: `itens[]` com `codigo`, `nivel`, `mensagem`, `campo`, `etapa`, `aba`, `item`, mais `totais {erros, alertas, infos}`.

### 3.2 Catálogo implementado (back, `RegrasValidacaoNormativa`)

| Regra | Nível | Estado |
|---|---|---|
| PROJETO_CAMPO_OBRIGATORIO | ERRO | Nome, tipo, CEP e logradouro. **Responsável e ART não** (ver 5). |
| RESIDENCIAL_SEM_GRUPOS | ERRO | Feita. A opção "não há unidades residenciais" não existe no sistema. |
| RESIDENCIAL_GRUPO_INCOMPLETO | ERRO | Feita (1 a 1000 unidades; 10 a 1000 m²), com índice do grupo. |
| AREA_COMUM_POTENCIA_AUSENTE | ERRO | Feita (quantidade > 0 sem potência; itens do catálogo ficam de fora), com aba e item. |
| AREA_COMUM_VALOR_FORA_FAIXA | ERRO | **Não feita**: os limites do questionário não estão no repositório. |
| COMERCIAL_ESPACO_INCOMPLETO | ERRO | Feita ("Espaço N está sem área."), com índice. |
| COMERCIAL_TIPO_INCOMPATIVEL | ERRO | Feita. O link leva à etapa 4; o link extra para a etapa 1 não foi feito. |
| VE_INCOMPLETO | ERRO | Feita (1 a 500 pontos; 3,70 a 22,0 kW). |
| MOTOBOMBA_INCOMPLETA | ERRO | Feita (1,0 a 50,0 cv). O sistema tem uma motobomba, então não há quantidade. |
| ABA_FORNOS_VAZIA | ALERTA | Feita sobre as cargas de cocção gravadas. Só avalia quando a área comum tem cargas gravadas. |
| MOTOBOMBA_SEM_MEDIDOR_EXCLUSIVO | ALERTA | Feita. Campo `medidorExclusivo` novo (banco, API, etapa 5 e duplicação de projeto). |
| COMERCIAL_CARGA_ABAIXO_MINIMO | ALERTA | Feita, com os valores no texto. |
| SMART_STUDIO_FC_90 | ALERTA | Feita (mais de 15 unidades). |

Registro de regra fora do catálogo que continua: `COMERCIAL_SEM_CARGAS` (ERRO): projeto comercial sem espaço e sem carga. Removidas: `area_comum_vazia` e as mensagens do resultado na Revisão.

### 3.3 Exibição (front)
- Banner de erro (`N erro(s) impede(m) … e M ponto(s) merece(m) atenção.`) e de atenção (`1 ponto merece atenção. Você pode calcular.`), com link para o primeiro item; sem banner quando não há nada.
- Cada item aparece no cartão da sua etapa, com "Corrigir" (ERRO) ou "Revisar" (ALERTA). Borda vermelha com erro, laranja só com alerta.
- A contagem do banner vem de `totais`; teste confere que é igual ao número de mensagens nos cartões. INFO não entra.
- Pluralização em funções próprias (`textos-revisao.ts`), com teste.
- O front não calcula regra nenhuma (teste: validação vazia do back não gera alerta no front).

## 4. Testes

- Back: **364/364**. Novos em `ValidacaoNormativaTest` (um positivo e um negativo por regra, índice do item, totais, validação lendo o banco após alteração, mensagens do resultado ausentes, e teste que confere que cada campo citado existe nos DTOs).
- Front: **103/103**. Novos: rotas `etapa-N`, cada EDITAR, aba do alerta, link com campo e item, contagem do banner, pluralização, wizard aberto pela Revisão, botão de salvar e voltar, alteração pendente.
- Ponta a ponta no navegador (projeto 12):
  1. Tudo preenchido, fornos 1 e cooktops 2: "Tudo certo para calcular", sem banner.
  2. Sem cocção na área comum: "1 ponto merece atenção. Você pode calcular." com a mensagem no cartão 3.
  3. "Revisar": `/projetos/12/etapa-3?origem=revisao&aba=fornos`, aba "Fornos e fogões", foco no campo `fornos`.
  4. Cinco EDITAR: etapas 1 a 5 abertas corretamente.
  5. Etapa 4 aberta pela Revisão: "SALVAR E VOLTAR PARA A REVISÃO" salva e volta para `/projetos/12/revisao`.
  6. VE marcado sem dados (projeto 13): "2 erros impedem o cálculo.", CALCULAR desabilitado, "Corrigir" leva a `/etapa-5?campo=qtdPontosVe` com foco em `pontos`.

## 5. Limitações e decisões em aberto

- **Área comum não é gravada pelo wizard.** O formulário atual coleta só quantidades; o servidor guarda itens com potência. Enquanto isso, a área comum preenchida na tela não chega ao banco: a Revisão mostra "Nenhum valor informado" e o cálculo usa Ds = 0. Por isso `ABA_FORNOS_VAZIA` só dispara quando há cargas gravadas, e o passo "preencher fornos e salvar, o banner some" da especificação só pôde ser testado gravando a área comum pela API.
- **Cenário "Espaço 3 sem área"** não ocorre pelo sistema: o PUT e o formulário recusam espaço sem área (o formulário nem envia), então o banco nunca guarda um espaço incompleto. A regra existe e é testada no back com dado gravado direto no banco.
- **Responsável e ART:** o passo 1 do wizard não coleta esses campos. Torná-los ERRO bloquearia todo projeto criado pela tela; ficaram fora de `PROJETO_CAMPO_OBRIGATORIO` até o passo 1 coletá-los.
- A `etapa` nos itens vai como nome (`residencial`, `area-comum`, …), não como número, para não mudar o contrato já usado pelo erro 422 do cálculo.
- O diálogo "Descartar alterações?" usa a confirmação nativa do navegador (sem os botões CONTINUAR EDITANDO / DESCARTAR).
- Faixas de 1 a 1000 unidades e 10 a 1000 m² passaram a valer na validação; projetos já gravados fora delas passam a ter ERRO.
