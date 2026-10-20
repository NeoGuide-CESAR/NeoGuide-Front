# Etapa 1 — Dados do projeto

Implementada no Angular 18 da main, tomando a prancheta 14 / WizProjeto.dc.html do moodboard Claude como referência. Não foi alterado o artefato remoto nem as demais telas de login/home.

## Conferência visual e funcional

- Cabeçalho e rodapé existentes, tokens de cores/fontes/raios e botões da referência preservados.
- Seis etapas: Projeto, Residencial, Área comum, Comercial, VE e bomba de incêndio, Revisão.
- Grade 8/4, 3/9 e 5/5/2; abaixo de 720 px os campos ficam em uma coluna, UF em um terço e cards empilhados.
- Validação de sete campos com as mensagens solicitadas, resumo singular/plural e foco no primeiro erro.
- Campos de endereço separados também na persistência do rascunho.
- Controles de teste recolhidos abaixo dos botões: Estado do CEP, Tipo de edificação e Preencher exemplo. Só aparecem em desenvolvimento.
- Consulta em andamento e CEP não encontrado/fora da concessão bloqueiam avanço. Falha de consulta permite preenchimento manual.
- Regras de tipo/checkboxes controlam cadeados e avanço: Comercial pula Residencial; ambas as opções desmarcadas travam a etapa 5.
- Edição usa o nome do projeto, selo Rascunho e SALVAR E AVANÇAR.

## Executar e testar

`npm start`, entrar com o login simulado existente e abrir `/projetos/novo/calculo`.
Os IDs p1…p5 existentes na Home usam dados de demonstração. Rascunhos criados podem ser reabertos pela URL com o ID salvo.

Abra Controles de teste e use Preencher exemplo para testar as travas com todos os campos completos.
Selecione cada variante de Estado do CEP para conferir os avisos e o spinner. Mude o tipo e os checkboxes para conferir a barra.

## Limites da integração

- Salvamento é **local neste navegador**, sem POST/PUT para o backend. Isso mantém o avanço fictício autorizado para testes. A confirmação informa onde o rascunho foi salvo.
- Rota real de CEP do back não foi fornecida: há um TODO e token ROTA_CEP em `consulta-cep.service.ts`. Com a rota configurada, adaptar a resposta ao contrato real.
- Sem rota configurada, somente desenvolvimento consulta ViaCEP. ViaCEP não informa a área de concessão; essa variante é demonstrada pelo controle de teste e deve vir do back na integração real.
- Em produção, consulta não configurada retorna falha e permite endereço manual; não há integração real de criação/edição no backend nesta entrega.
- As etapas 2–6 agora têm formulários e revisão conforme o moodboard: grupos residenciais, quatro abas de cargas, espaços comerciais e os equipamentos selecionados no projeto. Fórmulas e chamada ao serviço de cálculo permanecem pendentes do contrato real; o botão final salva a revisão, sem gerar uma demanda fictícia.

## Formulário completo

- Residencial: grupos com quantidade inteira positiva e área positiva, inclusão/remoção e Smart studio independente em cada grupo, também na revisão. Rascunhos antigos distribuem a escolha global aos grupos existentes, preservando escolhas individuais já salvas.
- Área comum: quatro abas com as cargas da referência; campos vazios equivalem a zero. Valores negativos ou fracionados são inválidos e o avanço abre a aba do primeiro erro.
- Comercial: lista de finalidade/área; pode ficar vazia. Espaços adicionados precisam estar completos ou ser removidos.
- VE/bomba: campos aparecem conforme os checkboxes do projeto. Quantidades inteiras positivas; potência da motobomba positiva em cv. Aviso de versão preliminar preservado.
- Revisão: resumo em ordem, edição por etapa, pendências por seção e bloqueio de conclusão com erros. Dados de etapas não aplicáveis não entram na revisão/validação, mas são preservados caso o tipo seja alterado novamente.
- Complementos são salvos a cada alteração no rascunho local. Dados gerais são salvos em SALVAR E AVANÇAR ou ao salvar outra etapa. Reabrir pela URL recupera os dados de todas as etapas.
- Armazenamento versionado migra os rascunhos antigos da etapa 1 sem perder nome/endereço; salvar só os dados gerais preserva as demais etapas.
- O cálculo real ainda não está integrado: SALVAR REVISÃO valida e salva os dados, sem simular resultados em kVA.

## Arquivos

- `core/projetos/dados-projeto.ts`: modelo de dados, máscara, UF e função pura dos cadeados.
- `core/projetos/consulta-cep.service.ts`: fronteira da consulta de CEP.
- `core/projetos/rascunhos-projeto.service.ts`: armazenamento local separado dos dados reais do back.
- `shared/wizard/dados-projeto-form.component.{ts,html,scss}`: formulário reutilizável.
- `shared/wizard/wizard-body.component.{ts,html,scss}`: barra, validação/avanço, edição e controles de demonstração.
- `features/calculo-demanda/calculo-demanda.page.{ts,html,scss}`: integração na rota já existente.
- `src/index.html`: inclui os ícones Material Symbols dos cards.
- `shared/wizard/dados-projeto-form.component.spec.ts`: testes de regras, formulário e navegação.

## Validação realizada

Build de produção aprovado; sem alertas de budget nos estilos dos componentes novos/alterados do wizard (continuam os alertas anteriores de Home e Login).
37 testes passaram no ChromeHeadless, incluindo validação numérica, inclusão/remoção, abas com erros, revisão, navegação, persistência completa e migração de rascunhos legados. A execução usou uma configuração temporária com porta de depuração automática, removida após a verificação.

Também conferido no navegador: alerta de sete campos, foco, tipo Comercial avançando para Área comum, etapa 5 travada com os checkboxes desmarcados, salvamento/edição local e tela pequena sem rolagem horizontal. Capturas da tela de computador e de celular foram salvas como artefatos desta conversa.
