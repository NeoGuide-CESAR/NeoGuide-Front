# US21 — Perfil do projetista

Implementação NEO-42 na branch `NEO-42`, baseada na main `d9a8564` (listagem NEO-18 e formulário NEO-09 já integrados). O menu Meu perfil na Home e o link da conta no formulário abrem `/perfil`.

## Decisão de campos

Nome, e-mail, empresa e CREA, conforme decisão aprovada nesta conversa. CPF/CNPJ e telefone ficam fora da tela. Empresa e CREA são opcionais. E-mail é exibido, mas não é editável: o PATCH do back não recebe esse campo.

Referência visual: prancheta 26 do [moodboard](https://claude.ai/artifact/56azCFbZiXv3cNpreo4pdz). Cartão da conta, seções Meus dados/Alterar senha, fontes, verdes, bordas e botões seguem os componentes existentes.

## Contrato consultado

O NEO-39 está na **develop** do [back](https://github.com/NeoGuide-CESAR/NeoGuide-Back/tree/develop), não na main consultada:

- GET `/api/v1/usuarios/me`: carrega o perfil.
- PATCH `/api/v1/usuarios/me`: envia somente os campos alterados `name`, `empresa`, `crea`; não modifica telefone nem CPF/CNPJ existentes.
- PUT `/api/v1/usuarios/me/senha`: `senhaAtual`, `novaSenha`, `confirmacaoNovaSenha`.
- Nome: 3–100 caracteres; empresa: 2–150 quando informada; CREA: 3–50 quando informado.
- Nova senha: 8–64 caracteres, ao menos uma letra e um número, confirmação idêntica. Deixar os três campos vazios mantém a senha.
- Erros `errors` do back são associados ao campo pelo nome do DTO.

Fontes: [UsuarioController](https://github.com/NeoGuide-CESAR/NeoGuide-Back/blob/develop/src/main/java/neoguide/project/controller/UsuarioController.java), [UsuarioService](https://github.com/NeoGuide-CESAR/NeoGuide-Back/blob/develop/src/main/java/neoguide/project/service/UsuarioService.java), [UsuarioUpdateDTO](https://github.com/NeoGuide-CESAR/NeoGuide-Back/blob/develop/src/main/java/neoguide/project/dto/UsuarioUpdateDTO.java).

## Autenticação e execução

O login simulado foi substituído por POST `/api/v1/auth/login`, com `login` e `password`. Papel e token vêm da resposta do back. A sessão usa `neoguide.sessao` no sessionStorage e não armazena senhas. Sessões antigas do mock exigem novo login. Sair da conta limpa a sessão e navega para `/login`; respostas 401 do perfil fazem o mesmo. Os headers Bearer são enviados somente às chamadas do PerfilService no backend configurado.

O endereço do back é definido no ConfigService existente (`http://localhost:8080`). É necessário executar uma versão que contenha o UsuarioController da develop e usar uma conta real desse ambiente. A aplicação não contém fallback para perfil/salvamento fictícios. A configuração de CORS do back precisa permitir a origem em que o front for executado.

Salvar os dados e alterar a senha são operações separadas. Se o PATCH funcionar e o PUT falhar, a tela informa o sucesso parcial, mantém os dados confirmados e permite tentar novamente somente a troca de senha. O e-mail permanece somente leitura após sucesso ou erro. Cancelar descarta a edição, limpa as senhas e volta ao início.

## Verificação

- Build de produção aprovado; avisos de estilos já existentes em Home, Login e lista de projetos.
- 51 testes passando no ChromeHeadless, incluindo payload, Bearer, armazenamento de sessão sem senha, validação, resposta de erro por campo, envio duplicado, sucesso parcial, cancelamento e 401.
- Conferência no navegador usando uma API temporária com dados fictícios: login, acesso por Meu perfil, validação de nome, salvamento, recarregamento e saída/guard. Nenhuma senha real foi alterada. A API de teste foi encerrada e não faz parte do projeto.
- Conferência de largura de celular sem rolagem horizontal. Screenshot salvo como artefato desta conversa.

Os testes HTTP confirmam o contrato, mas a integração com uma instância real do back ainda precisa ser validada com a develop em execução.
