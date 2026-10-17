# NeoGuide Angular

Interface em Angular 20 com página pública do projetista, janela de login, acesso Neoenergia e página inicial com dados demonstrativos.

## Executar

Instale o Node.js compatível com Angular 20 (o projeto foi validado com Node.js 24). Dentro desta pasta, execute:

```powershell
npm ci
npm start
```

Abra http://localhost:4200/login. Para o acesso Neoenergia, use o botão do cabeçalho, a faixa corporativa ou http://localhost:4200/login/neoenergia.

## Página pública

A página reproduz a estrutura, os textos, os ícones SVG e os estilos do HTML de referência. Inclui menus suspensos, navegação móvel, destaques com informações, acesso do analista e chat demonstrativo. Os menus e o chat podem ser fechados pelo teclado; a janela de login usa um diálogo nativo.

## Limites da demonstração

- A autenticação é simulada. O login do projetista aceita CPF/CNPJ válido ou e-mail e senha com pelo menos seis caracteres. O formulário Neoenergia aceita matrícula ou e-mail e senha com pelo menos seis caracteres; ele registra o perfil analista na sessão local.
- O login corporativo SSO não está conectado a um provedor de identidade.
- Cadastro, cálculo, envio de projetos e respostas de IA não estão integrados. O chat apresenta a resposta demonstrativa do HTML original.
- A imagem `hero.jpg` não foi enviada; a abertura da página usa o gradiente alternativo do HTML.
- O PDF da norma, contatos oficiais e política de privacidade não foram fornecidos. Os respectivos links informam essa indisponibilidade em vez de apontar para arquivos inexistentes.
- O símbolo Neoenergia da página pública é o SVG incluído na referência; não é um arquivo oficial adicional da marca.

## Verificar

```powershell
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

O build precisa de acesso ao Google Fonts. Os testes precisam do Google Chrome instalado. Os avisos de tamanho de CSS são informativos; o limite de erro continua configurado em 8 kB por componente.

## Compartilhar

O ZIP contém o código e o arquivo de versões das dependências. `node_modules`, cache Angular e arquivos de build são excluídos; instale as dependências com `npm ci` após extrair.
