# NeoGuide · Telas 24 e 22

Implementação local do detalhamento e do resultado, baseada nos artboards `Detalhamento.dc.html` e `WizResultado.dc.html`. Também foram consultados Main, Tipografia, Componentes, Estados, Mobile, WizMobile e Carregamento.

## Como conferir

Execute `npm start` em `NeoGuide-Front` e use o acesso simulado já existente:

- `/projetos/p2`: Edifício Aurora, com os grupos 20 × 70 m² e 12 × 95 m², loja de 90 m² e quatro pontos de carregamento.
- `/projetos/p1/resultado`: Residencial Jardim, com três grupos, três espaços comerciais, seis pontos e uma motobomba de 15 cv.
- `/projetos/nao-existe`: estado de projeto não encontrado.
- Outros projetos da carteira sem resultado mostram o estado “Resultado ainda não disponível”.

No mobile, conferir o menu, os botões com largura total, a demanda antes dos dados e a rolagem da tabela no próprio card. O carregamento usa a faixa de progresso e skeletons em tons sand da prancheta 27.

## Validação

- `npm run lint`: aprovado.
- `npm test -- --watch=false --browsers=ChromeHeadless`: 78 testes aprovados, sem Cypress.
- `npm run build`: aprovado, sem warnings novos. Permanecem os quatro avisos anteriores de orçamento de CSS de login, home, listagem e widget Neo.
- Conferência visual no navegador: detalhamento, resultado, navegação entre telas, menu mobile, demanda antes dos dados, tabela com rolagem interna e estado de projeto não encontrado.

## Decisões

- Mantido Angular 18.2, que é a versão efetiva do repositório. Nenhuma migração de framework ou dependência visual foi feita.
- Reutilizados SiteHeaderComponent, SiteFooterComponent, classes de botão e o fluxo de duplicação existente. A navegação mobile é uma opção do header ativada apenas pelo novo layout.
- Criados componentes compartilhados para o layout, a faixa “1ª VERSÃO”, breadcrumb, status, card, estados e apresentação dos dados por etapa.
- Os estilos inline das referências foram convertidos para classes SCSS com os tokens existentes e os tokens complementares medidos nos próprios artboards. Não foram usadas sombras, novas fontes ou cores fora dessas referências.
- A fonte continua IberPangea Text com fallback Figtree; o arquivo proprietário da IberPangea não está no repositório.
- O front não calcula demanda. Total e valores por etapa chegam prontos no DTO, inclusive o subtotal de veículo elétrico e bomba. Os placeholders do moodboard foram representados por números zero e formatados pelo pipe `kva`, resultando em `0,0 kVA`.
- As datas são formatadas como dd/MM/yyyy e HH:mm, com offset -03:00 para manter a exibição consistente em São Paulo.
- Os dados comerciais existentes são exibidos mesmo quando o tipo da edificação é residencial, conforme ocorre no artboard do Aurora. Nenhuma entrada é descartada silenciosamente pelo front.
- Um resultado invalidado não é apresentado como “Calculado”. Dados ausentes e partes não aplicáveis são estados distintos.
- GERAR MEMORIAL emite `gerarMemorial` com o projeto e mantém um TODO de integração. Não gera documentos nem faz chamadas adicionais.

## API e mocks

`ProjetoService` retorna Observable e reaproveita `ProjetosApiService` e o interceptor existente. O DTO de leitura inclui `resultado` com `demandaTotal`, `calculadoEm`, `norma` e `porEtapa`.

O desenvolvimento usa `environment.mockApi = true`. Para a API real, desligue a flag e ajuste `environment.apiUrl`, presente nos dois environments. O caminho de leitura continua `GET {apiUrl}/projects/{id}`. Um TODO na fachada marca o contrato a validar com o time de back. Nenhuma API, banco ou fórmula elétrica foi implementada.

## Arquivos desta entrega

Criados:

- `src/app/core/projetos/projeto.service.ts`
- `src/app/core/projetos/consulta-projeto.ts`
- `src/app/core/projetos/etapas-apresentacao.ts`
- `src/app/core/projetos/projeto-artboards.mock.ts`
- `src/app/core/projetos/projeto-visao.spec.ts`
- `src/app/features/resultado-calculo/resultado-calculo.page.ts`
- `src/app/features/resultado-calculo/resultado-calculo.page.html`
- `src/app/features/resultado-calculo/resultado-calculo.page.scss`
- `src/app/shared/projeto/primeira-versao.component.ts`
- `src/app/shared/projeto/projeto-layout.component.ts`
- `src/app/shared/projeto/projeto-breadcrumb.component.ts`
- `src/app/shared/projeto/projeto-status.component.ts`
- `src/app/shared/projeto/projeto-card.component.ts`
- `src/app/shared/projeto/projeto-estado.component.ts`
- `src/app/shared/projeto/projeto-etapa-dados.component.ts`
- `src/app/shared/projeto/projeto-etapa-dados.component.html`
- `src/app/shared/projeto/projeto-etapa-dados.component.scss`
- `src/app/shared/projeto/kva.pipe.ts`
- `src/styles/_projeto-page.scss`
- `TELAS-22-24.md`

Alterados sobre o estado local anterior:

- `src/app/features/detalhe-projeto/detalhe-projeto.page.ts`
- `src/app/features/detalhe-projeto/detalhe-projeto.page.html`
- `src/app/features/detalhe-projeto/detalhe-projeto.page.scss`
- `src/app/shared/layout/site-header.component.ts`
- `src/app/core/projetos/projeto.model.ts`
- `src/app/core/projetos/projeto-http.ts`
- `src/app/core/projetos/projetos-api.service.ts`
- `src/app/core/projetos/projetos-mock.interceptor.ts`
- `src/app/app.routes.ts`
- `src/environments/environment.ts`
- `src/environments/environment.development.ts`
- `src/styles/_variables.scss`
- `src/styles/_global.scss`
- `src/index.html`
- `package.json` (escopo do lint)

As mudanças anteriores de edição e duplicação foram preservadas como suporte das telas. A entrega usa a branch `NEO-TELAS-22-24`; o merge na `main` fica separado.
