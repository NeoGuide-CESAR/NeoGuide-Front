# US13 · Duplicar projeto existente

Implementação somente no Angular. Nenhuma API, banco, controller ou migration foi criada, alterada ou executada.

## Rotas e fluxo

- Listagem: `/meus-projetos`, preservando busca, status, ordem, pagina e tamanho.
- Detalhamento: `/projetos/:id`. Antes existia somente um redirecionamento para o cálculo; foi criada a página de detalhe.
- Edição: `/projetos/:id/calculo?duplicadoDe=:originalId`, reaproveitando o wizard existente.
- `POST /api/v1/projects/:id/duplicar`: usa o id da resposta, bloqueia cliques concorrentes e navega para a edição.
- A edição faz `GET /api/v1/projects/:id` e carrega o original identificado pelo query param `duplicadoDe`, com alternativa em `origemId`.
- Snackbar de sucesso por 10 segundos, com DESFAZER. A ação faz `DELETE /api/v1/projects/:idCopia` e retorna à URL de origem com `replaceUrl: true`.
- O endereço é comparado pelo CEP e pelo logradouro completo, incluindo número/complemento. Ignora acentos, caixa, espaços e pontuação.
- Ao salvar, endereço igual abre um diálogo. ALTERAR e ESC cancelam e focam o CEP. MANTER continua o salvamento. A confirmação fica associada à cópia e à chave normalizada do endereço, em sessionStorage com alternativa em memória.
- O salvamento da edição usa `PUT /api/v1/projects/:id`. O wizard aguarda a resposta antes de avançar. Os campos de cálculo alterados invalidam o resultado anterior.

## Testar manualmente

1. Na pasta `NeoGuide-Front`, execute `npm install` e `npm start`. Entre com a autenticação simulada já existente no projeto.
2. Abra Meus Projetos, escolha filtros e uma página e expanda um card. Clique DUPLICAR, inclusive duas vezes rapidamente. Deve ocorrer somente uma requisição; o painel continua expandido até a navegação.
3. Confira o nome terminado em ` (cópia)`, campos preenchidos, etapas aplicáveis liberadas e o snackbar de sucesso.
4. Clique DESFAZER antes de 10 segundos. A cópia deve ser excluída e a URL exata da listagem deve ser restaurada. Repita a partir do detalhamento para conferir o retorno ao original.
5. Duplique novamente, mantenha o endereço e clique SALVAR E AVANÇAR. Confira o diálogo e o foco inicial em ALTERAR ENDEREÇO. Teste ALTERAR e ESC: não devem salvar e o CEP deve receber foco.
6. Salve com MANTER ENDEREÇO; volte à primeira etapa e salve novamente. Não deve perguntar de novo pelo mesmo endereço.
7. Em outra cópia, altere o logradouro e salve: deve avançar sem diálogo. Confira também em largura de 375px.

## Ligar e desligar o mock

- `src/environments/environment.development.ts`: `mockApi: true`. É selecionado por `npm start`.
- Para usar a API real no desenvolvimento, altere essa flag para `false` e reinicie o servidor Angular.
- `src/environments/environment.ts`: `mockApi: false`, selecionado no build de produção.
- O interceptor intercepta exclusivamente os quatro caminhos/métodos documentados acima. Simula 600 ms de latência, POST 201 com a cópia, DELETE 204, GET e PUT. Com a flag desligada, encaminha as mesmas requisições para o transporte HTTP real.
- A lista HTTP de exemplo é mantida em memória, iniciada a partir dos mocks do projeto e do cache da carteira já disponível no front. A carteira guarda um cache opcional em localStorage; o cache não pode transformar uma operação HTTP bem-sucedida em erro.
- As URLs são relativas à origem da aplicação. A API real precisa estar acessível em `/api/v1/projects/...`; nenhum servidor de API é iniciado pelos comandos deste documento.

## Validação automatizada

Verificado: lint aprovado, 71 testes unitários aprovados e build de produção aprovado. Permanecem somente os avisos preexistentes de orçamento de CSS mencionados abaixo.

```powershell
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

O lint cobre os arquivos TypeScript dos projetos, das três telas envolvidas, os componentes compartilhados alterados e environments.

Os testes unitários verificam comparação de endereço, serviço HTTP, bloqueio de duplicação concorrente, erro/retry, origem e navegação, GET/PUT/DELETE do mock, flag desligada, diálogo/foco/ESC, confirmação única por endereço e falhas no DESFAZER. O roteiro manual acima cobre também o layout mobile.

## Decisões conforme o repositório

- Angular 18.2 foi mantido. O repositório não está em Angular 20; não houve migração. O código novo usa standalone, inject, signals, input/viewChild e @if.
- Angular Material não está instalado e não foi adicionado. Foram usados o SnackbarService/SnackbarComponent existentes e um `<dialog>` nativo modal com título/descrição acessíveis, foco inicial, contenção de foco e cancelamento por ESC. O painel expansível existente foi preservado.
- O projeto já carregava Figtree e Material Symbols Outlined. Foi mantida a pilha `IberPangea Text, Figtree, sans-serif`, com Figtree como alternativa disponível; o ícone `edit` foi incluído na fonte de símbolos já carregada.
- Não havia service HTTP de projetos, interceptor de mock ou lint. Foram adicionados ProjetosApiService, um interceptor por flag e ESLint. Os fixtures existentes foram reaproveitados.
- A listagem geral continua usando a carteira simulada existente. Não foi inventado um endpoint de coleção. O fluxo US13 faz as chamadas HTTP especificadas e atualiza a carteira somente após sucesso.
- A criação de projeto novo continua no fluxo local existente. Não foi inventado POST de criação ou PUT de etapas; a edição US13 usa o PUT do projeto solicitado neste escopo.
- O contrato HTTP provisório usa `logradouro`, `cep`, `status` em caixa alta, `origemId` e `complementos`. O adaptador converte para os campos e status já usados no Angular.
- O retorno exato da navegação e a confirmação do endereço ficam no front, fora do corpo enviado à API.
- Os avisos preexistentes do build sobre orçamento de CSS de login, home, listagem e widget NEO não foram tratados fora deste escopo.

## Arquivos criados

- `src/environments/environment.ts`
- `src/environments/environment.development.ts`
- `src/app/core/projetos/endereco-projeto.ts`
- `src/app/core/projetos/projeto-http.ts`
- `src/app/core/projetos/projetos-api.service.ts`
- `src/app/core/projetos/duplicacao-contexto.service.ts`
- `src/app/core/projetos/duplicar-projeto.service.ts`
- `src/app/core/projetos/projetos-mock.interceptor.ts`
- `src/app/core/projetos/projetos-mock.interceptor.spec.ts`
- `src/app/core/projetos/edicao-duplicacao.spec.ts`
- `src/app/features/detalhe-projeto/detalhe-projeto.page.ts`
- `src/app/features/detalhe-projeto/detalhe-projeto.page.html`
- `src/app/features/detalhe-projeto/detalhe-projeto.page.scss`
- `eslint.config.mjs`
- `US13-FRONT.md`

## Arquivos alterados

- `angular.json`
- `package.json`
- `package-lock.json`
- `src/app/app.config.ts`
- `src/app/app.routes.ts`
- `src/app/core/projetos/projeto.model.ts`
- `src/app/core/projetos/projetos.service.ts`
- `src/app/core/projetos/rascunhos-projeto.service.ts`
- `src/app/features/meus-projetos/meus-projetos.page.ts`
- `src/app/features/meus-projetos/meus-projetos.page.html`
- `src/app/features/calculo-demanda/calculo-demanda.page.ts`
- `src/app/features/calculo-demanda/calculo-demanda.page.html`
- `src/app/features/calculo-demanda/calculo-demanda.page.scss`
- `src/app/shared/ui/snackbar.component.ts`
- `src/app/shared/wizard/wizard-body.component.ts`
- `src/app/shared/wizard/wizard-body.component.html`
- `src/app/shared/wizard/wizard-body.component.scss`
- `src/app/shared/wizard/etapas-calculo.component.spec.ts`
- `src/index.html`
- `src/styles/_utils.scss`

## Pendências para o time de back

- POST retornando 201 com o projeto.
- DELETE liberado para rascunho.
- Campo origemId.
- Validação do endereço no servidor.
