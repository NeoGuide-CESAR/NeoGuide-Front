# Auditoria e integração NeoGuide (front × back)

Data da auditoria: 2026-11-15. Repositórios: `NeoGuide-Back` (Spring Boot), `NeoGuide-Front` (Angular), `NeoGuide-NeoChat` (Lumi, chatbot Neo, usado como fonte das normas em `docs/info/`).

Este relatório tem duas fases. A **Fase 1** (auditoria) foi feita antes de qualquer alteração de regra de negócio. Os status abaixo são os da Fase 1; a seção 1 e a seção 9 registram o que a Fase 2 mudou.

Legenda de status: **OK**, **PARCIAL**, **FALTA**, **DIVERGENTE**, **PENDENTE** (depende de decisão ou de outro serviço), **NÃO VERIFICADO** (não checado nesta rodada; não está afirmado como OK).

Status da Fase 2 (marcação `CONCLUÍDO` só quando há teste ou verificação registrada na seção 9): ver coluna "Ação / Fase 2".

---

## 1. Resumo executivo

### 1.0 Resultado da Fase 2 (o que foi feito, verificado)

**Verificado nesta rodada**
- Back: **303 testes, 0 falhas** (JDK 21, `BUILD SUCCESS`). Eram 272 antes; os 31 novos cobrem as regras alteradas.
- Back em execução na 8081, contra o Postgres do Docker: probes HTTP reais (seção 9.3).
- Front: **60/60 testes** (Chrome headless, incluindo 6 novos de integração de autenticação) e `ng build` sem erros.
- Login ponta a ponta pelo proxy de desenvolvimento do front (`localhost:4200/api/v1`).

**Concluído com evidência** (detalhe na seção 9.2)
- Motor normativo: Quadro 35 (39 faixas), Quadro 36 (tabela discreta, sem interpolação), Quadro 33 (VE), Tabela 19 (motores), FP de piscinas 1,00 (norma 6.27.9), sem arredondamento intermediário em Dtr/Drf. Valores em `engine/normativo/TabelasNormativas.java`, a única fonte para motor e seeds.
- Banco de referência: upsert por chave nos seeds. **Nenhuma linha foi apagada.** Linhas antigas sem correspondência na norma permanecem (pergunta P15).
- Regras de API: exclusão só de rascunho (D1, 409 para os demais); mensagem genérica de login da tela 11; 401 com `codigo: "sessao_expirada"`; rota inexistente responde 404 (antes 500); `GET /api/v1/avisos` público (lista vazia).
- Front: login real (`POST /api/v1/auth/login`), token em `sessionStorage` (P14), interceptor que anexa o Bearer e, no 401, leva ao Estado B guardando a rota. Mock de login removido.

**Não concluído** (fora desta rodada; cada item tem pergunta ou está na seção 8)
- Cálculo do projeto: `POST /calcular`, Ded/DQDG, enquadramento BT/MT (225/300 kVA), entrada e barramento por seleção, memorial PDF, validação normativa, Live HUD (B-EP-16 a B-EP-19, B-MT-21 a B-MT-28, B-DB-07).
- Listagem, totais e duplicação de projetos no front seguem **mock** (`projetos.service.ts`); duplicação no back não copia as etapas (P8); totais por status não existem (P7).
- Wizard de 6 etapas, revisão, resultado, detalhamento, edição, perfil e cadastro: não implementados no front (F-WZ, F-RV, F-CA, F-DT, F-ED, F-PF, F-LG-05).
- RFC 7807 completo (P9), papel de analista (B-SEC-06), conteúdo dos avisos (P10).

**Contagem da Fase 1 (linha de base, seção 1.1)** permanece como registro. O estado por item após a Fase 2 está na seção 9.2.

### 1.1 Contagem da Fase 1

| Área | OK | PARCIAL | FALTA | DIVERGENTE | PENDENTE / NÃO VERIFICADO |
|---|---:|---:|---:|---:|---:|
| Backend: endpoints (B-EP) | 3 | 13 | 6 | 1 | 1 |
| Backend: modelo (B-DB) | 1 | 6 | 2 | 0 | 0 |
| Backend: motor (B-MT) | 4 | 9 | 13 | 5 | 1 |
| Backend: validações (B-VL) | 0 | 1 | 1 | 0 | 6 |
| Backend: segurança (B-SEC) | 3 | 0 | 1 | 2 | 0 |
| Frontend (F-xx) | 0 | 21 | 19 | 4 | 0 |
| Integração (I-CT) | 0 | 2 | 1 | 2 | 0 |

Os totais exatos por item estão nas tabelas das seções 3 a 5.

### 1.2 Estado geral da Fase 1

- O **back sobe e os testes passam**: 272 testes unitários e de controller, com `BUILD SUCCESS` (JDK 21, ver seção 2).
- O **front compila** (`ng build`, configuração development).
- O **back não tem o núcleo de cálculo exposto**: não existem `POST /calcular`, `GET /validacao-normativa`, `GET /memorial-pdf`, `POST /simulacao/pre-calculo-etapa` nem `GET /avisos`. Os motores (residencial, área comum, comercial, cargas especiais) existem como classes, sem orquestração nem persistência de resultado (`demand_results` não existe).
- **Três desvios normativos graves no motor** (valores errados, não só de documentação): Quadro 35 (faixas de Di), Quadro 36 (Fc por interpolação em vez de tabela discreta) e Quadro 33 (VE). Os valores errados também estão nas seeds, e como os seeders têm guarda `count > 0 → return`, **um banco já populado continua com os valores errados**.
- **Front sem integração real**: login é mock (`auth.service.ts:33-47`), listagem, duplicação e exclusão são mock em memória (`projetos.service.ts`), `Novidades` da home é HTML fixo (`home.page.html:113-119`). Não há rotas para cadastro, detalhamento, edição, perfil, resultado do cálculo nem o wizard de 6 etapas do design.
- **Front persiste rascunho em `localStorage`** (`rascunhos-projeto.service.ts:11,23,28`), o que contradiz a regra de autosave no back e a política de dados do projeto.

### 1.3 Ambiente

- Back: `docker-compose` sobe só o banco (`neoguide-db`, healthy). O container `neoguide-api` do compose não estava rodando.
- Porta 8080 já ocupada por um `java.exe` (PID 27568) que **não é deste trabalho**. Não foi encerrado. O back foi verificado na porta 8081 (`SERVER_PORT=8081`). Ver pergunta P1.

---

## 2. Ambiente e como executar

Comandos reais testados nesta máquina (Windows 11, Git Bash).

### 2.1 Back (`NeoGuide-Back`)

- Stack: Java 21 (`pom.xml` `java.version=21`), Spring Boot **4.1.1** (`spring-boot-starter-parent`), Spring Data JPA, Spring Security + JWT (jjwt 0.12.6), PostgreSQL 16 (driver `postgresql`), H2 apenas em runtime de dev. `ddl-auto: update` (sem Flyway/Liquibase; não há migração no repositório).
- Módulos: `controller`, `service`, `engine` (motores de cálculo), `config/seeder` (seeds normativos), `model/normativo` (20 entidades de referência), `repository`, `security` (JWT), `exception` (handler próprio), `validation`.
- Subir o banco: `docker compose up -d neoguide-db` (no diretório do back). Banco: `neoguide_db`, usuário `neoguide_user`, porta 5432.
- Testes: `JAVA_HOME="/c/Program Files/Java/jdk-21" MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=Windows-ROOT" ./mvnw -B test`.
  - **Observação de ambiente**: sem `-Djavax.net.ssl.trustStoreType=Windows-ROOT` o Maven falha ao baixar `surefire-junit-platform` do Central (`PKIX path building failed`, proxy/certificado corporativo). Não é defeito do código.
- Executar: `SERVER_PORT=8081 ./mvnw spring-boot:run` (8080 ocupada aqui).
- Variáveis de ambiente (`application.yaml`): `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `SPRING_JPA_HIBERNATE_DDL_AUTO` (padrão `update`), `HOST_FRONT_END` (padrão `http://localhost:4200`, usado no CORS), `SECURITY_JWT_SECRET` (padrão de dev, **trocar em produção**), `SECURITY_JWT_EXPIRATION` (padrão 86400000 ms).

### 2.2 Front (`NeoGuide-Front`)

- Stack: Angular **18.2** (o spec diz 17+, atendido), Angular Material, Reactive Forms, RxJS 7.8, Karma/Jasmine.
- Comandos: `npm install`, `npx ng build --configuration development` (**OK nesta rodada**), `npx ng serve` (proxy de `proxy.conf.js`), `npx ng test` (requer Chrome; não executado nesta rodada).
- Proxy de dev: `/api/neo` → NeoChat (Lumi, `LUMI_API_URL`, padrão `http://localhost:8000`), com `X-API-Key` aplicada no servidor de dev.
- Variáveis: `LUMI_API_KEY`, `LUMI_API_URL` (ou `.env` do NeoChat, lido por `proxy.conf.js`).
- Não há `environment.ts`. URLs do back estão fixas em `config/service/config.service.ts` (`http://localhost:8080`).

### 2.3 Estrutura de referência (localização)

| Item | Caminho |
|---|---|
| Entidades JPA | `NeoGuide-Back/src/main/java/neoguide/project/model/` |
| Repositórios | `.../repository/` |
| Controllers REST | `.../controller/` |
| Services | `.../service/` (`ProjectService.java` é o principal, ~830 linhas) |
| Motores de cálculo | `.../engine/` (`ResidentialCalculationEngine`, `CommonAreaCalculationEngine`, `CommercialCalculationEngine`, `SpecialLoadsCalculationEngine`). **Não existe `DemandCalculationEngine`.** |
| Seeders normativos | `.../config/seeder/` e `.../config/DataSeeder.java` |
| Segurança JWT | `.../security/SecurityConfig.java`, `.../security/jwt/` |
| Handler de erros | `.../exception/GlobalExceptionHandler.java` (formato próprio, não RFC 7807) |
| Geração de PDF | **Não existe** (`pom.xml` sem iText/OpenPDF) |
| Testes | `NeoGuide-Back/src/test/java/` (272 testes) |
| Front: rotas | `NeoGuide-Front/src/app/app.routes.ts` |
| Front: serviços | `src/app/core/` (`auth`, `projetos`, `neo`, `ui`) |
| Front: mocks | `src/app/core/projetos/projetos.mock.ts`, `auth.service.ts`, `projetos.service.ts`, `rascunhos-projeto.service.ts` |
| Front: guards/interceptors | `core/auth/auth.guard.ts` (guards); **nenhum interceptor HTTP** |
| Front: tema | `src/styles/_variables.scss`, `_global.scss`, `_utils.scss` |
| Documentos de contrato | **Não estão neste workspace** (`Contratos_API_Consolidados_NeoGuide.docx`, `Fluxo_Calculo_Rotas_Motores_NeoGuide.docx`, `MODELO_DE_MEMORIAL_DESCRITIVO.docx`, `Plano_Backlog_Priorizado.docx`, questionário e guias em PDF). Só as normas DIS-NOR-030 Rev. 07 e DIS-NOR-053 Rev. 06 estão disponíveis, em `NeoGuide-NeoChat/docs/info/` (`.md` e `.pdf`). **Os IDs de endpoint foram comparados com a lista da seção 3.1 do prompt, não com o `.docx` de contratos.** |
| Pasta `NEO-28/` no front | Contém `project.model.ts` e `project-detail.component.*` com um modelo **em inglês** (`DRAFT/IN_REVIEW/CALCULATED`), fora do contrato. Não é usada pelas rotas. |

---

## 3. Auditoria do backend (B-xx)

Formato: ID | requisito resumido | status | evidência (arquivo:linha) | ação / status Fase 2.

### 3.1 Endpoints

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| B-EP-01 | POST /auth/register, BCrypt | **OK** | `controller/AuthController.java:25`; `service/AuthService.java:59` (`passwordEncoder.encode`) | Nenhuma. |
| B-EP-02 | POST /auth/login retorna JWT | **PARCIAL** | `AuthController.java:30`; token em `LoginResponse`. Mensagem de erro divergente (`AuthService.java:78,81`, ver B-SEC-05) | Mensagem corrigida (F2-04). |
| B-EP-03 | GET /auth/me (criar) | **PARCIAL** | Existe `GET /api/v1/usuarios/me` (`controller/UsuarioController.java:32`), não `/auth/me`. | Mantido o caminho existente. Pergunta P6 (caminho canônico). |
| B-EP-04 | PATCH /auth/me (nome, telefone, CREA/CFT) | **PARCIAL** | `UsuarioController.java:38`; `dto/UsuarioUpdateDTO.java:5-8` (`name`, `telefone`, `empresa`, `crea`). Campo `name` em vez de `nome` (I-CT-02). | Mantido. P6. |
| B-EP-05 | PUT /auth/password (senha atual, ≥8, letras e números) | **PARCIAL** | `UsuarioController.java:45`; `dto/AlterarSenhaDTO.java:5-7`. Regra de força da nova senha **NÃO VERIFICADA**. | Não alterado nesta rodada. |
| B-EP-06 | GET /projects com busca, status, ordenação (3 opções), paginação e **totais por status** | **PARCIAL** | `ProjectController.java:59-67` (filtros `status`, `search` e `Pageable`). Ordenação só via `sort=` genérico. **Sem totais** por status (não há endpoint de contagem). | Pendente (F2 não cobre). Ver P7. |
| B-EP-07 | POST /projects (RASCUNHO, etapaAtual=1, PRJ-AAAA-XXXX, flags) | **OK** | `ProjectController.java:51`; `ProjectService.java:104-111` (protocolo), `:158` (etapa 1), `:159` (RASCUNHO); flags `Project.java:62-68`. | Nenhuma. |
| B-EP-08 | GET /projects/{id} com demanda do último cálculo e situação | **PARCIAL** | `ProjectController.java:76`. Não há demanda nem situação de cálculo (não existe cálculo). | Pendente do cálculo (B-EP-17). |
| B-EP-09 | PATCH /projects/{id}; EM_ANALISE somente leitura (D1) | **PARCIAL** | `ProjectController.java:83`. Regra de somente leitura **NÃO VERIFICADA**. `ProjectService.java:289` reseta para RASCUNHO em alterações conceituais, sem checar status. | Não alterado. Ver P3. |
| B-EP-10 | DELETE /projects/{id}, exclusão lógica, **só RASCUNHO** (D1) | **DIVERGENTE** | Exclusão lógica OK (`ProjectService.java:333-345`, `setAtivo(false)`). **Sem checagem de status**: projeto APROVADO/EM_ANALISE pode ser excluído. | **Fase 2 (F2-06)**: restringir a RASCUNHO (padrão D1), com teste. |
| B-EP-11 | POST /projects/{id}/duplicar, copia **todas as etapas e flags**, "[nome] (cópia)" | **DIVERGENTE** | Caminho `/duplicate` (`ProjectController.java:69`), nome em inglês. Cópia (`ProjectService.java:199-232`) copia só os campos do projeto (titulo, flags, cep etc.). **Não copia etapas**: residencial (`ResidentialTypology`), área comum (`CommonAreaLoad`), comercial (`CommercialUnit`), cargas especiais (`SpecialLoads`). | **Pendente, pergunta P8**: a cópia das etapas exige copiar 4 entidades filhas. Não feito nesta rodada (ver seção 8). |
| B-EP-12 | PUT etapa-residencial (idempotente, Drf, `semUnidadesResidenciais`) | **PARCIAL** | `ProjectController.java:101`. Campo `semUnidadesResidenciais` **NÃO VERIFICADO**. | Não alterado. |
| B-EP-13 | PUT etapa-area-comum (itens por categoria, Ds por aba) | **PARCIAL** | `ProjectController.java:111` (mapeado para 3 caminhos). Retorno de Ds por aba **NÃO VERIFICADO**. | Não alterado. |
| B-EP-14 | PUT etapa-comercial | **PARCIAL** | `ProjectController.java:122`. Finalidade pela Tab. 22 **NÃO VERIFICADO**. | Não alterado. |
| B-EP-15 | PUT etapa-cargas-especiais (VE e motobomba, medidor exclusivo) | **PARCIAL** | `ProjectController.java:133`; `model/SpecialLoads.java`. Medidor exclusivo (C9) **NÃO VERIFICADO**. | Não alterado. |
| B-EP-16 | POST /simulacao/pre-calculo-etapa (stateless, < 20 ms) | **FALTA** | Nenhum mapeamento encontrado. | Não implementado. Pendente (seção 8). |
| B-EP-17 | POST /projects/{id}/calcular (consolida, grava demand_results) | **FALTA** | Nenhum mapeamento. Motores existem sem orquestração. `demand_results` não existe. | Não implementado. Pendente. |
| B-EP-18 | GET /projects/{id}/validacao-normativa | **FALTA** | Nenhum mapeamento. | Não implementado. |
| B-EP-19 | GET /projects/{id}/memorial-pdf | **FALTA** | Nenhum mapeamento; `pom.xml` sem biblioteca de PDF. | Não implementado. |
| B-EP-20 | GET /cep/{cep} (ViaCEP) | **OK** | `controller/CepController.java:21`; `service/CepService.java:17` (`https://viacep.com.br/ws/{cep}/json/`). | Nenhuma. |
| B-EP-21 | Catálogos GET com @Cacheable (22 itens listados) | **PARCIAL** | `controller/CatalogController.java`: **9** endpoints (`@GetMapping` nas linhas 34–78). Faltam, entre outros, VE (Quadro 33), motores (Tab. 14/18/19), dispositivos de partida (Tab. 17), cargas mínimas (Tab. 22), dimensionamento de entrada (Tab. 2) e barramento (Tab. 3). Cache em `service/CatalogService.java:69,77`. | Não alterado nesta rodada (pendente). Ver seção 8. |
| B-EP-22 | Erros RFC 7807 (`application/problem+json`) com campo, valor e regra | **DIVERGENTE** | `exception/GlobalExceptionHandler.java` e `dto/ErrorResponse.java` (formato próprio: `timestamp/status/message/errors`). Sem `ProblemDetail`. 422 não usado. | Não alterado. Mudança de contrato, pergunta P9. |
| B-EP-23 | GET /avisos (lista publicada; vazia se não houver) | **FALTA** | Nenhum mapeamento. | **Fase 2 (F2-07)**: endpoint público retornando lista vazia, com teste. Conteúdo dos avisos pendente (P10). |
| B-EP-24 | Assistente Neo (POST com conversaId e projetoId) | **PENDENTE** | Não existe no back. Implementado no **NeoChat (Lumi)**: `NeoGuide-Front/src/app/core/neo/neo.service.ts` chama `/api/neo` (proxy → Lumi). | Não bloqueia. Fora do escopo do back. |

### 3.2 Modelo de dados

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| B-DB-01 | Usuário: nome, e-mail, CPF/CNPJ (somente leitura), telefone, CREA/CFT, senha BCrypt | **OK** | `model/User.java:23-45` (`name`, `email`, `cpfCnpj`, `telefone`, `crea`, `password`); CPF fora de `UsuarioUpdateDTO`. | Nenhuma. |
| B-DB-02 | Projeto: nome, CEP, logradouro, **tipo de edificação** (RESIDENCIAL_MULTIFAMILIAR, COMERCIAL, MISTO), responsável, ART/TRT/RRT, pavimentos, protocolo, status (4 valores), **situacaoCalculo**, etapaAtual, flags, timestamps | **DIVERGENTE** | `model/Project.java`: `titulo` (não `nome`); `tipo` é `ProjectType` = **tipo de ligação** (`model/ProjectType.java:8-12`: LIGACAO_NOVA, AUMENTO_CARGA…), não tipo de edificação. `ProjectStatus` tem **5** valores, incluindo `AGUARDANDO_CORRECAO` (`model/ProjectStatus.java`), fora do contrato. **Sem** `situacaoCalculo`, **sem** número de pavimentos, **sem** ART/TRT/RRT (há só `crea`). | **Pergunta P4** (tipo de ligação × tipo de edificação; `AGUARDANDO_CORRECAO`). Não alterado. |
| B-DB-03 | Tipologias residenciais (grupos, quantidade, área, flag smartStudio) | **PARCIAL** | `model/ResidentialTypology.java` existe. Flag smart studio por tipologia (inferida em `ResidentialCalculationEngine.java:59-64`). | Não alterado. |
| B-DB-04 | Cargas de área comum (aba, item, quantidade, potência, unidade, FP) | **PARCIAL** | `model/CommonAreaLoad.java` existe. Campos **NÃO VERIFICADOS** em detalhe. | Não alterado. |
| B-DB-05 | Espaços comerciais (finalidade Tab. 22, área, carga, ordem) | **PARCIAL** | `model/CommercialUnit.java` existe. Campos **NÃO VERIFICADOS**. | Não alterado. |
| B-DB-06 | Cargas especiais (VE, motobombas, medidor exclusivo, nota) | **PARCIAL** | `model/SpecialLoads.java` existe. | Não alterado. |
| B-DB-07 | Resultado de cálculo (`demand_results`) | **FALTA** | Não há entidade. | Pendente (depende de B-EP-17). |
| B-DB-08 | Histórico de auditoria (opcional) | **FALTA** | Não há entidade. | Opcional. Não feito. |
| B-DB-09 | Tabelas normativas (21+) com coluna de origem (norma, quadro, página) | **PARCIAL** | 20 entidades em `model/normativo/` (`AreaRangeReference`, `CoincidenceFactorReference`, `VeFactorReference`, `SinglePhaseMotorReference`, `MotorReference`… ). Campo `norma` existe, mas as seeds só registram o quadro (ex.: `"DIS-NOR-053 Quadro 35"`), **sem página**. | Origem por página: pendente. |

### 3.3 Motor de cálculo

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| B-MT-01 | Enquadramento de área (Quadro 35) | **DIVERGENTE** | `engine/ResidentialCalculationEngine.java:146-176` (faixas 40/45/50/55/60/65/70… com Di errados: ex.: 41–50 m² → 1,35 quando a norma dá 1,05/1,16; 61–65 → 1,47 ok, mas 66–70 → 1,57 ok e demais faixas erradas, p.ex. 71–75 → 1,80 quando norma dá 1,67). Seed errado: `config/seeder/ResidencialNormativoSeeder.java:44-56` (61–70 como uma faixa só com 1,65; ≤40 com 1,20). | **Fase 2 (F2-01)**: tabela completa do Quadro 35 no motor e na seed, com upsert. |
| B-MT-02 | Dr = Σ(Di × N) | **OK** | `ResidentialCalculationEngine.java:82-87`. | Nenhuma. |
| B-MT-03 | Fc (Quadro 36) pelo total de aptos | **DIVERGENTE** | `ResidentialCalculationEngine.java:26-45` (tabela parcial, com `0.8560` em 20 e `0.7080` em 50), `:185-225` (**interpolação linear** entre nós). A norma é tabela discreta (1 a 60+). Ex.: 8 aptos não está na tabela e é interpolado. Seed: `ResidencialNormativoSeeder.java:67-75`. | **Fase 2 (F2-02)**: tabela discreta completa (60+) no motor e na seed; sem interpolação. |
| B-MT-04 | Smart studio: N > 15 → Fc = 90% | **OK** | `ResidentialCalculationEngine.java:24,191-193` (`SMART_STUDIO_THRESHOLD`, `SMART_STUDIO_COINCIDENCE_FACTOR=0.90`). | Nenhuma. Observação: a flag é inferida de qualquer tipologia (`:59-64`). |
| B-MT-05 | Dtr = Dr × Fc | **DIVERGENTE** | `ResidentialCalculationEngine.java:105-108`: `setScale(2)` no meio do cálculo (regra "sem arredondamento intermediário"). | **Fase 2 (F2-03)**: remover arredondamento intermediário. |
| B-MT-06 | Fr (Quadro 37) | **OK** | `ResidentialCalculationEngine.java:230-248` (≤25 → 1,5; ≤50 → 1,3; ≤100 → 1,2; >100 → 1,1). | Nenhuma. |
| B-MT-07 | Drf = Dtr × Fr, sem arredondamento intermediário | **DIVERGENTE** | `ResidentialCalculationEngine.java:118-129` (`setScale(2)` em Dtr e em Drf). | **Fase 2 (F2-03)**. |
| B-MT-08 | Parcela a (iluminação FP 0,80; TUG FP 1,00, FD 0,50) | **OK** | `engine/CommonAreaCalculationEngine.java:56-57` (`FP_ILUMINACAO=0.80`, `FP_TUG=1.00`); fórmula em `:303` (`P_tug × 0,50 / 1,00`). Teste em `CommonAreaCalculationEngineTest`. | Nenhuma. |
| B-MT-09 | Parcela b (chuveiros, aquecedores; Tab. 7; FP 1,00) | **PARCIAL** | `FP_AQUECEDOR_RAPIDO=1.00` (`CommonAreaCalculationEngine.java:58`). Tabela 7 na seed: 1→1,00, 2→1,00, 3→0,84, 4→0,76 (`EquipamentosClimaCargasNormativoSeeder.java:57-61`). **Tab. 7 do guia (2 = 0,75; 3 = 0,70) não está no código.** Chuveiros/torneiras: NÃO VERIFICADO. | Sem alteração. |
| B-MT-10 | Parcela c (boilers; Tab. 8; FP 1,00) | **PARCIAL** | `FP_BOILER=1.00` (`:59`). Tabela 8 NÃO VERIFICADA. | Sem alteração. |
| B-MT-11 | Parcela d (eletrodomésticos; Tab. 9; FP 0,92) | **OK** | `FP_ELETRODOMESTICOS=0.92` (`:60`); fórmula `d = P×FD/0.92` (`:417-440`). | Nenhuma. |
| B-MT-12 | Parcela e (fornos Tab. 9; cooktops Tab. 10; FP 1,00) | **PARCIAL** | `FP_FORNO=1.00`, `FP_COOKTOP=1.00` (`:61-62`). Cooktops usam Tab. 10 (premissa, `CommonAreaCalculationEngineTest.java:114-117`). Premissa registrada na seção 7. | Premissa mantida, registrada. |
| B-MT-13 | Parcela f (ar-condicionado; Tab. 11 BTU→VA; Tab. 12; FP 0,92) | **OK** | `FP_CLIMATIZACAO=0.92` (`:63`); `TABELA_11_BTU_W` (`:92-98`); fórmula em `:517`. | Nenhuma. |
| B-MT-14 | Parcela g (motores de recalque; Tab. 19; Tab. 14 FD 1,00 / 0,50) | **PARCIAL** | Tabela 19 **com valores errados** (ver seção 6, `MotoresPartidasNormativoSeeder.java:111-113`: 5 cv = 5,27 kVA quando a norma dá 6,02; 1 cv e 1/2 cv também). Demais partes NÃO VERIFICADAS. | **Fase 2 (F2-05)**: corrigir linhas da Tab. 19 usadas pelo motor, com teste (R9). |
| B-MT-15 | Parcela h (elevadores e portões; FD 1,00/0,60; FP 0,92 padrão) | **OK** | `FP_ELEVADOR=0.92` (`:64`). FD 0,60 NÃO VERIFICADO linha a linha. | Nenhuma. |
| B-MT-16 | Parcela i (piscinas; Tab. 16; **FP 1,00** pelo item 6.27.9) | **DIVERGENTE** | `CommonAreaCalculationEngine.java:65` (`FP_PISCINA=0.80`) e comentário `:701`. Norma (DIS-NOR-030 item 6.27.9) dá 1,00. Bombas de piscina na Tab. 16: 3 bombas = 0,47 (`EquipamentosClimaCargasNormativoSeeder.java:178`, correto). | **Fase 2 (F2-04)**: FP_PISCINA = 1,00, com teste. |
| B-MT-17 | Ds = a + … + i | **PARCIAL** | Soma em `CommonAreaCalculationEngine` (NÃO VERIFICADO linha a linha). | Não alterado. |
| B-MT-18 | Dc (comercial; Tab. 22; FP 0,92; escalonamento de escritórios) | **PARCIAL** | `CommercialCalculationEngine.java:21-22` (`FD_EXCEDENTE=0.70`, `FATOR_POTENCIA_COMERCIAL=0.92`). Escalonamento 1,00 até 20 kW / 0,70 excedente: **aplicado a todos os espaços**, não só a escritórios (ver seção 6, Tab. 22). | Divergência registrada na seção 6. Não alterado (P5). |
| B-MT-19 | Dve (Quadro 33; Dve = Σ P × F(n); FP 1,00) | **DIVERGENTE** | Motor: `engine/SpecialLoadsCalculationEngine.java:147-157` (`2→0,85`, `3→0,75`, `≤8→0,70`…, valores que não estão na norma). Seed: `config/seeder/VeNormativoSeeder.java:24-31` (`2→0,90`, `4→0,80`, `8→0,70`…). Norma (Quadro 33): 1–10 → 1,00; 11–20 → 0,86; 21–30 → 0,80; 31–40 → 0,78; 41–50 → 0,75; 51–75 → 0,70; 76–100 → 0,65; >100 → 0,60. FP padrão 1,00 OK (`:22`). | **Fase 2 (F2-01b)**: Quadro 33 no motor e na seed, com upsert e teste R3 (4 × 7,4 kW = 29,60 kVA). |
| B-MT-20 | Dmbi (motobomba de incêndio; Tab. 19; FD 1,00; fora do DQDG) | **PARCIAL** | `SpecialLoadsCalculationEngine.java:159+` (`calcularMotobombaIncendio`, `derivadoAntesDoQdg`). Conversão cv→kVA pela Tab. 19 (ver B-MT-14). Caso R7 (2 cv = 2,70 kVA) depende da Tab. 19. | Não verificado após correção da Tab. 19 (ver F2-05). |
| B-MT-21 | Ded = Drf + Ds + Dc + Dve + Dmbi | **FALTA** | Não há consolidação: nenhum endpoint calcula Ded (B-EP-17). | Pendente. |
| B-MT-22 | DQDG = Ded − Dmbi | **FALTA** | Idem. | Pendente. |
| B-MT-23 | Enquadramento BT/MT (residencial 300 kVA; comercial/misto 225 kVA; Grupo A → MT) | **FALTA** | Nenhuma ocorrência de 225 no código de regra. Só `ResidentialCalculationEngine.java:174` (faixa de área, não regra de tensão). | Pendente (P5 e seção 7 D2). |
| B-MT-24 | Alerta de até 50 kVA (não bloqueia) | **FALTA** | Não encontrado. | Pendente. |
| B-MT-25 | Dimensionamento de entrada (Tab. 2 Anexo II, por Ded) | **PARCIAL** | Dados em `config/seeder/EntradaBarramentoNormativoSeeder.java:44-56` (20 linhas `ServiceEntranceReference`). Faixa 165–211 kVA → 240 mm², 320 A: presente. **Seleção por Ded não implementada.** Guia com faixas diferentes da norma (ver seção 6). | Seleção pendente (depende de B-EP-17). |
| B-MT-26 | Barramento (Tab. 3 Anexo II, por DQDG) | **PARCIAL** | `EntradaBarramentoNormativoSeeder.java:73` (`50 x 5 → 595 A`, correto pela norma). Seleção por DQDG não implementada. | Seleção pendente. |
| B-MT-27 | Verificação Ip = DQDG×1000/(√3×380) ≤ In | **FALTA** | Não encontrada. | Pendente. |
| B-MT-28 | Nota de relé 0,9–1,2 para disjuntor ≥ 250 A (Q50) | **FALTA** | Não encontrada. | Pendente. |
| B-MT-29 | Regras de skip (etapas que não se aplicam) e total de unidades no Fc | **PARCIAL** | `semUnidadesResidenciais` **NÃO VERIFICADO** (ver B-EP-12). | Não alterado. |
| B-MT-30 | CDMs (Fc por apartamentos de cada CDM; dimensionamento) | **FALTA** | Não há lógica de CDM. | Pendente (premissa a confirmar, seção 7). |
| B-MT-31 | BigDecimal em todo o motor, sem double | **OK** | Motores residencial, VE e área comum usam `BigDecimal` (ex.: `ResidentialCalculationEngine.java`, `SpecialLoadsCalculationEngine.java:112-145`). | Nenhuma. |
| B-MT-32 | Live HUD < 20 ms p95 | **FALTA** | Endpoint inexistente. | Pendente. |

### 3.4 Validações de entrada

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| B-VL-01 | Projeto: nome ≤150, logradouro ≤300, responsável ≤100, ART/TRT/RRT obrigatória, tipo (3 opções) | **PARCIAL** | Há `validation/Validator.java` e `dto/CreateProjectRequest.java` (NÃO VERIFICADO em detalhe). **Tipo de edificação de 3 opções não existe** (B-DB-02). | Pendente (P4). |
| B-VL-02 | Residencial: quantidade 1–1000, metragem 10,0–1000,0, máx. 10 grupos, faixa existente | **PARCIAL** | `ResidentialCalculationEngine.java:91-107` (exige quantidade > 0 e área > 0; **sem** os limites 1–1000, 10–1000 m² nem máximo de 10 grupos). | Pendente. |
| B-VL-03 | Área comum: limites do questionário (Q16–Q42) | **NÃO VERIFICADO** | — | Pendente. |
| B-VL-04 | Comercial: finalidade obrigatória, área ≥ 1,0, carga ≥ 0,5 | **NÃO VERIFICADO** | — | Pendente. |
| B-VL-05 | VE: pontos 1–500; potência 3,70–22,0 kW | **NÃO VERIFICADO** | — | Pendente. |
| B-VL-06 | Motobomba de incêndio: quantidade 1–20; potência 1,0–50,0 cv | **NÃO VERIFICADO** | — | Pendente. |
| B-VL-07 | Comercial cadastrado exige tipo MISTO ou COMERCIAL (D2) | **FALTA** | Não há tipo de edificação (B-DB-02); regra inexistente. | Pendente (P4). |
| B-VL-08 | Validações com RFC 7807 (campo exato) | **FALTA** | Mesma situação de B-EP-22. | Pendente (P9). |

### 3.5 Segurança e autenticação

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| B-SEC-01 | JWT assinado, expiração configurável; /api/v1/** autenticado exceto register/login/avisos | **OK** | `security/jwt/JwtService`; `application.yaml` (`security.jwt.expiration`); `security/SecurityConfig.java:45-54` (público: `/api/v1/auth/**`, `/api/v1/catalogo/**`, `/api/v1/cep/**`, `anyRequest().authenticated()`). `/api/v1/avisos` ainda não existe. | Ao criar avisos (F2-07), tornar público. |
| B-SEC-02 | Ownership: usuário A não lê/edita/exclui projeto de B | **OK** | `ProjectService.java:205,252,339,377,422,487,637,781` (`ForbiddenException`, HTTP 403). O contrato aceita 403 ou 404. | Nenhuma. Coberto por teste existente em `ProjectServiceTest`. |
| B-SEC-03 | Senha BCrypt; nunca retornar hash | **OK** | `AuthService.java:59`; `UsuarioService.java:96`; `UserResponse`/`UsuarioResponseDTO` sem campo de senha. | Nenhuma. |
| B-SEC-04 | 401 com RFC 7807 "sessao_expirada" para o Estado B | **DIVERGENTE** | `security/jwt/JwtAuthenticationEntryPoint.java:20-31` devolve `{"message":"Acesso não autorizado. Token ausente ou inválido.","errors":{}}`, sem código `sessao_expirada`. | **Fase 2 (F2-08)**: código/tipo `sessao_expirada` no corpo do 401. **Mudança de formato, ver P9.** |
| B-SEC-05 | Login: mensagem genérica "E-mail ou senha incorretos." | **DIVERGENTE** | `service/AuthService.java:78,81`: "E-mail ou senha **inválidos**". Front mock também difere (`auth.service.ts:36`: "CPF/CNPJ, e-mail ou senha incorretos."). | **Fase 2 (F2-04)**: texto do contrato. |
| B-SEC-06 | Papel ROLE_ANALISTA; endpoint administrativo para mudar status | **FALTA** | `model/UserRole.java:8` (papel existe); `config/DataSeeder.java:57` (usuário analista semeado com senha fixa, ver P2). **Nenhum endpoint** de alteração de status. | Pendente. Fora do escopo desta entrega (seção 3.5 do prompt). |

### 3.6 Divergências conhecidas (conferidas no código)

Ver a seção 6 (tabela completa com decisões). Resumo do que o código reproduz:

- Quadro 33 (VE): **reproduzido** (motor e seed). → F2-01b.
- Quadro 35 (catálogo API): **reproduzido** (61–70 = 1,65; ≤40 = 1,20). → F2-01.
- Quadro 36: **reproduzido** (20 = 85,60%; 50 = 70,80%) e interpolação. → F2-02.
- Tabela 19: **reproduzido** (5 cv = 5,27; 1/2 cv = 1180 VA). → F2-05.
- Tabela 7: código usa 2 = 1,00 (correto, sem o erro do guia). **Não reproduzido.**
- Tabela 16: 3 bombas = 0,47 (correto). **Não reproduzido.**
- Tabela 22: escalonamento 20 kW/70% aplicado a todas as finalidades. **Reproduzido** (B-MT-18, P5).
- Tabela 3: 50 × 5 = 595 A (correto). **Não reproduzido.**
- Tabela 2: faixas do guia **não** reproduzidas (seed segue a norma, ver B-MT-25), mas a seleção não existe.
- Limite MT 225/300: **não implementado** (B-MT-23).
- FP 0,80 para tomadas: código usa 1,00 (`CommonAreaCalculationEngine.java:57`). **Não reproduzido.**
- FP 0,80 para piscinas: **reproduzido** (`:65`). → F2-04.
- Revisões citadas: código cita DIS-NOR-030 **Rev. 07** e DIS-NOR-053 **Rev. 06** (`CommonAreaCalculationEngine.java:33`, `ResidentialCalculationEngine.java:19`). **Não reproduzido.**
- Modelo de memorial (1 cv = 0,84; 12,5 cv = 10,51; Drf 114,00; Ded 186,10): não é referência de valor, não é usado pelo código.
- Dtr/Drf com arredondamento intermediário: **reproduzido**. → F2-03.

---

## 4. Auditoria do frontend (F-xx)

Formato: ID | requisito resumido | status | evidência | ação / Fase 2. Fonte visual: telas 09–27 do design (não disponíveis neste workspace; o critério de aderência visual **NÃO VERIFICADO** em detalhe).

### 4.1 Login e estados globais

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-LG-01 | Login e-mail/senha; erro genérico; limpa senha no erro | **PARCIAL** | `features/login/login.page.ts`, `login-dialog.component.ts:101-111` (chama `auth.entrar`, **mock**: `core/auth/auth.service.ts:33-47`). Aceita qualquer senha com ≥ 6 caracteres. Mensagem divergente (B-SEC-05). | **Fase 2 (F2-09)**: login real via `POST /api/v1/auth/login`. |
| F-LG-02 | Estado B (sessão expirada) com "ENTRAR NOVAMENTE" e URL de retorno | **PARCIAL** | `features/sessao-expirada/sessao-expirada.page.ts`, `core/auth/return-url.ts`. Acionado só por navegação, não por 401 real. | Com F2-09, o 401 leva ao Estado B. |
| F-LG-03 | Interceptor HTTP: 401 → Estado B; limpar token | **FALTA** | Não há interceptor (`src/app/app.config.ts` sem `withInterceptors`). | **Fase 2 (F2-09)**. |
| F-LG-04 | Mobile: ENTRAR COMO PROJETISTA/ANALISTA com perfil pré-selecionado | **PARCIAL** | `neoenergia-login.page.ts:37-45` (login de analista) e `login-dialog`. Textos "Entrar como" existem em 2 arquivos. Não verificado em detalhe. | Não alterado. |
| F-LG-05 | Link "Cadastre-se como projetista" leva à tela de cadastro | **FALTA** | Link existe (2 arquivos), mas **não há rota de cadastro** em `app.routes.ts`. | Pendente (tela de cadastro não implementada). |
| F-LG-06 | Carregamento (esqueleto, aria-busy) e erro após 10 s com TENTAR NOVAMENTE | **PARCIAL** | `aria-busy` em 2 arquivos; "TENTAR NOVAMENTE" em 2 arquivos. Não verificado em detalhe. | Não alterado. |

### 4.2 Home (tela 09)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-HM-01 | Saudação com primeiro nome | **PARCIAL** | `home.page.html:35` (`primeiroNome()`), mas o nome vem do **mock** (`auth.service.ts:41`, "Maria Souza"). | Com F2-09, vem do login real. |
| F-HM-02 | Quatro indicadores lidos do endpoint de totais (B-EP-06) | **FALTA** | `ProjetosService.resumo` (computed) sobre a lista mock (`projetos.service.ts:33-37`). **Sem endpoint de totais no back.** | Pendente (P7). |
| F-HM-03 | Acesso rápido: Novo projeto; Continuar cálculo; Norma DIS-NOR-053; Tirar dúvidas com o Neo | **PARCIAL** | "Continuar cálculo" em `home.page.html` (2 ocorrências entre arquivos). Demais itens NÃO VERIFICADOS. | Não alterado. |
| F-HM-04 | Projetos recentes (3 itens) e "Ver todos" | **PARCIAL** | `ProjetosService.recentes` sobre mock (`projetos.service.ts:28-31`); "Ver todos" em 1 arquivo. | Pendente (lista real, F2 não cobre). |
| F-HM-05 | Novidades vindas de /avisos; sem aviso, o bloco some | **DIVERGENTE** | `home.page.html:113-119`: HTML **fixo** (`<article class="novidade">`, tag "NORMA", "[imagem]"). Nenhuma chamada a avisos. | Pendente: depende de B-EP-23 (criado em F2-07) e de integração de front (não feito nesta rodada). |
| F-HM-06 | Estado vazio (Estado C) com indicadores em 0 | **NÃO VERIFICADO** | — | Pendente. |
| F-HM-07 | Responsivo < 768 px | **NÃO VERIFICADO** | — | Pendente. |

### 4.3 Listagem (telas 10 e 12)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-LS-01 | Cabeçalho: breadcrumb, título, subtítulo, NOVO PROJETO | **PARCIAL** | "NOVO PROJETO" em 6 arquivos. Breadcrumb NÃO VERIFICADO. | Não alterado. |
| F-LS-02 | Busca com debounce 300 ms; reflete em ?busca= | **PARCIAL** | `debounce`/`debounceTime` em 1 arquivo; `listagem.ts` faz filtro **no cliente** (`calcularListagem`). Estado na URL NÃO VERIFICADO. | Pendente (busca no servidor). |
| F-LS-03 | Chips com contagens do servidor | **FALTA** | Contagens calculadas no cliente sobre mock. | Pendente (P7). |
| F-LS-04 | Ordenação (3 opções) | **PARCIAL** | "Ordenar por" e "Mais recentes" em 1 arquivo. Ordenação no cliente. | Pendente. |
| F-LS-05 | mat-accordion, apenas um aberto, aria-expanded | **PARCIAL** | `aria-expanded` em 7 arquivos. Accordion: NÃO VERIFICADO. | Não alterado. |
| F-LS-06 | Linha: nome, "Atualizado em", selo de status, chevron | **NÃO VERIFICADO** | — | Pendente. |
| F-LS-07 | Linha expandida: ABRIR, DUPLICAR (B-EP-11, abre cópia), EXCLUIR (só RASCUNHO) | **DIVERGENTE** | `projetos.service.ts:45-63` `duplicar` e `excluir` são **mock em memória**. EXCLUIR aparece para todos os status (ver D1). | Pendente. Regra D1 no back (F2-06) não reflete na UI ainda. |
| F-LS-08 | Paginação (VOLTAR, Itens por página 10/20/50, "1–10 de N", ?pagina=, ?tamanho=) | **PARCIAL** | "Itens por página" em 1 arquivo; paginação feita no cliente (`listagem.ts`). Sem paginação do servidor. | Pendente. |
| F-LS-09 | Mobile: chips com rolagem, cartões | **NÃO VERIFICADO** | — | Pendente. |
| F-LS-10 | Estados: C (vazio), D (sem resultado, "Limpar filtros"), esqueleto, erro | **PARCIAL** | "Limpar filtros" em 1 arquivo. Estado de erro/esqueleto NÃO VERIFICADO. | Pendente. |
| F-LS-11 | Snackbar "Projeto duplicado com sucesso." com DESFAZER 6 s | **PARCIAL** | "DESFAZER" em 1 arquivo; duplicação é mock (`projetos.service.ts:45`). | Pendente (depende de B-EP-11 completo, P8). |

### 4.4 Wizard: cabeçalho e stepper (telas 14–20, 23)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-WZ-01 | Stepper de 6 passos com estados e cadeado | **FALTA** | Não há `mat-stepper` (0 ocorrências). `shared/wizard/etapas-calculo.component.ts` existe, mas não é a tela do design; aderência NÃO VERIFICADA. | Pendente (wizard não implementado nas rotas). |
| F-WZ-02 | Liberação sequencial das etapas | **FALTA** | Idem. | Pendente. |
| F-WZ-03 | Passo Comercial ativo / "Não se aplica" | **FALTA** | Idem. | Pendente. |
| F-WZ-04 | Barra inferior: VOLTAR, "Rascunho salvo automaticamente", AVANÇAR com textos variáveis | **FALTA** | "Rascunho salvo automaticamente" não encontrado. | Pendente. |
| F-WZ-05 | Mobile: barra de progresso, "Ver todas as etapas" | **FALTA** | Não encontrado. | Pendente. |
| F-WZ-06 | Autosave: PUT ao sair do campo e ao avançar, estados Salvando/Salvo/Falha | **DIVERGENTE** | Salvamento é em **`localStorage`** (`core/projetos/rascunhos-projeto.service.ts:11,23,28`, chave `neoguide.rascunho.<id>`), sem chamada ao back. | Pendente (F2 não cobre; P11). |

### 4.5 Etapa 1, Projeto (tela 14)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-E1-01 | Campos: nome, tipo de edificação (3), CEP (máscara, ViaCEP), logradouro, responsável, CREA/CFT, ART/TRT/RRT, pavimentos | **PARCIAL** | `shared/wizard/dados-projeto-form.component.ts` (formulário existe; campos e máscaras NÃO VERIFICADOS). Consulta CEP: `core/projetos/consulta-cep.service.ts`. Tipo de edificação: ver B-DB-02. | Pendente (P4). |
| F-E1-02 | "Não sei meu CEP" | **NÃO VERIFICADO** | — | Pendente. |
| F-E1-03 | Mensagem "Endereço preenchido pelo CEP." | **NÃO VERIFICADO** | — | Pendente. |
| F-E1-04 | Bloco VE e bomba de incêndio | **NÃO VERIFICADO** | — | Pendente. |
| F-E1-05 | Criar via POST (B-EP-07) e redirecionar para etapa 2 | **FALTA** | Não há chamada HTTP no front. | Pendente. |
| F-E1-06 | Mensagem de bloqueio | **NÃO VERIFICADO** | — | Pendente. |

### 4.6 a 4.9 Etapas 2 a 5 (telas 15–18)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-E2-01 a F-E2-07 | Residencial: grupos, faixa Quadro 35 pela API, ADICIONAR GRUPO (máx. 10), smart studio, total, "Não há unidades residenciais", erro de campo | **PARCIAL** | `core/projetos/dados-calculo.ts` define `GrupoResidencial` (`unidades`, `area`, `smartStudio`). Faixa do Quadro 35 não vem da API (não há chamada de catálogo). "Não há unidades residenciais": **não encontrado**. | Pendente (I-CT-04: a faixa deve vir do catálogo). |
| F-E3-01 a F-E3-11 | Área comum: 4 abas, chips Preenchida/Pendente, campos por item, zero = "não existe", atenção só em Fornos e fogões (N7), mobile | **PARCIAL** | `dados-calculo.ts:9-29` (`ABAS_CARGAS`): 4 abas com itens. Boilers na aba 4 (`dados-calculo.ts:24`), divergente de N3 (aba 2). Ar-condicionado na aba 2 (ok, N6). Chips, validações e aviso N7 NÃO VERIFICADOS. | **Divergência**: boilers na aba errada (N3). Pendente. |
| F-E4-01 a F-E4-05 | Comercial: espaços com finalidade (select Tab. 22), área ≥ 1, carga ≥ 0,5, reordenação | **PARCIAL** | `dados-calculo.ts:EspacoComercial` define `finalidade` (string livre) e `area`; **sem carga instalada** e com finalidade em texto. | Divergência de N4/C4 (finalidade deve vir da Tab. 22). Pendente. |
| F-E5-01 a F-E5-05 | VE e motobomba (cartões, medidor exclusivo, IR PARA A REVISÃO) | **PARCIAL** | `dados-calculo.ts:ComplementosCalculo.especiais` (`pontos`, `bombas`, `potenciaCv`); sem medidor exclusivo (C9). | Pendente. |

### 4.10 Revisão (telas 20, 23)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-RV-01 a F-RV-06 | Revisão: cartões 1–5, banners de erro e atenção, rodapé, categorias vazias | **FALTA** | "Ir para o erro" e "Nenhum valor informado" não encontrados. Não há tela de revisão no design implementada. | Pendente. |

### 4.11 Cálculo e resultado (telas 21, 22)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-CA-01 | Tela de cálculo: "Calculando a demanda do seu projeto", chama POST /calcular | **FALTA** | "Calculando" não encontrado. Não existe `POST /calcular` no back (B-EP-17). | Pendente (back). |
| F-CA-02 | Resultado: "Resultado do cálculo", selo, data real, REVISAR DADOS e GERAR MEMORIAL | **FALTA** | "Resultado do cálculo" e "GERAR MEMORIAL" não encontrados. | Pendente. |
| F-CA-03 | Faixa de destaque com Ded, Drf, Ds, Dc, Dve, Dmbi, DQDG e fornecimento BT/MT | **FALTA** | Não encontrado. | Pendente. |
| F-CA-04 | Resultado por etapa | **FALTA** | Não encontrado. | Pendente. |
| F-CA-05 | Entrada de serviço (disjuntor, cabos, eletroduto, barramento) | **FALTA** | "Entrada de serviço" não encontrado. | Pendente (B-MT-25/26). |
| F-CA-06 | Alerta de MT: GERAR MEMORIAL desabilitado | **FALTA** | Sem regra de MT (B-MT-23). | Pendente. |
| F-CA-07 | Aviso até 50 kVA | **FALTA** | Sem regra (B-MT-24). | Pendente. |
| F-CA-08 | Remover selo "1ª versão" e faixa "Tela preliminar" | **NÃO VERIFICADO** | — | Pendente. |
| F-CA-09 | Erro de cálculo (RFC 7807) volta à revisão | **FALTA** | Sem endpoint. | Pendente. |

### 4.12 Detalhamento (tela 24)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-DT-01 a F-DT-09 | Tela de detalhamento: cartões, estados da demanda, botões DUPLICAR/EDITAR por status, Andamento | **FALTA** | Não há rota de detalhamento: `app.routes.ts` redireciona `projetos/:id` para `projetos/:id/calculo`. | Pendente. |

### 4.13 Edição e cópia (tela 25)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-ED-01 a F-ED-05 | Edição reaproveitando o wizard; cópia com texto e aba inicial; aviso de desatualização; "Descartar alterações?" | **FALTA** | "Descartar alterações" não encontrado em nenhum arquivo. | Pendente. |

### 4.14 Perfil (tela 26)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-PF-01 a F-PF-05 | Perfil: identidade, meus dados, alterar senha, mobile | **FALTA** | Não há rota de perfil. "Sair da conta" não encontrado. Back tem `PATCH /usuarios/me` e `PUT /usuarios/me/senha`, mas sem consumo no front. | Pendente. |

### 4.15 Painel do assistente Neo

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-NEO-01 | Botão flutuante, oculto no login/cadastro | **PARCIAL** | `shared/neo/neo-widget.component.ts/.html`. Ocultação em login NÃO VERIFICADA. | Não alterado. |
| F-NEO-02 | Painel 380×560, cabeçalho, histórico, minimizar, fechar | **PARCIAL** | `neo-widget.component.*`, `neo-historico.component.ts`. Dimensões NÃO VERIFICADAS. | Não alterado. |
| F-NEO-03 | Mensagens, fonte consultada, fallback, erro com TENTAR NOVAMENTE | **PARCIAL** | `neo-mensagem.component.ts`; `NeoService` (`core/neo/neo.service.ts`) fala com a Lumi. | Não alterado. |
| F-NEO-04 | Sugestões rápidas e contexto do projeto | **PARCIAL** | `core/neo/neo.config.ts` (`SUGESTOES_NEO`). Contexto de projeto em `neo-state.service.ts` (usa `ProjetosService` mock). | Não alterado. |
| F-NEO-05 | Modo "indisponível" quando a API não responde | **NÃO VERIFICADO** | — | Pendente. |

### 4.16 Acessibilidade e responsividade

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-AC-01 | Foco visível, teclado, Esc fecha | **PARCIAL** | `Escape`/`Esc` em 4 arquivos. Demais NÃO VERIFICADOS. | Não alterado. |
| F-AC-02 | Contraste ≥ 4,5:1 | **NÃO VERIFICADO** | — | Pendente. |
| F-AC-03 | Breakpoint 768 px em todas as telas | **NÃO VERIFICADO** | — | Pendente. |
| F-AC-04 | prefers-reduced-motion | **PARCIAL** | `prefers-reduced-motion` em 3 arquivos. | Não alterado. |
| F-AC-05 | Tokens de tema (Figtree; cores do guia) centralizados | **PARCIAL** | `styles/_variables.scss` existe; `Figtree` em 1 arquivo. Cores hardcoded fora do tema NÃO VERIFICADAS. | Pendente. |

### 4.17 Mocks

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| F-MK-01 | Listar e substituir todos os mocks | **DIVERGENTE** | (1) `core/auth/auth.service.ts:33-47` (login mock, qualquer senha ≥ 6). (2) `core/projetos/projetos.mock.ts` (21 projetos fixos). (3) `core/projetos/projetos.service.ts` (listar, duplicar, excluir, resumo em memória, latência simulada de 300 ms). (4) `core/projetos/rascunhos-projeto.service.ts:13-14` (`dadosExemplo`, dados de exemplo por id `p5`). (5) `home.page.html:113-119` (Novidades fixas). (6) `core/neo/neo.config.ts:8` (`NEO_API_KEY` com valor fixo, **no bundle**; hoje não é usada no código, ver P12). | Parcial nesta rodada: **(1) substituído por login real (F2-09)**. Demais: pendentes. |

---

## 5. Auditoria de integração (I-xx)

| ID | Requisito | Status | Evidência | Ação / Fase 2 |
|---|---|---|---|---|
| I-CT-01 | Cada chamada do front tem endpoint compatível com B-EP | **DIVERGENTE** | Só existe chamada real para `/api/neo` (Lumi). Nenhuma chamada para `/api/v1` no front. | Fase 2: login (F2-09). Demais, pendentes. |
| I-CT-02 | JSON em camelCase; nomes coerentes com o contrato | **DIVERGENTE** | Back: `titulo`, `name`, `status` em maiúsculas (`RASCUNHO`). Front mock: `nome`, `status: 'rascunho'` (minúsculas), `endereco`, `unidadesConsumidoras` (`core/projetos/projeto.model.ts`). `NEO-28/project.model.ts` usa inglês (`DRAFT`). Três convenções diferentes. | Pendente (P11, decidir o contrato). |
| I-CT-03 | Datas ISO 8601; decimais com ponto; pt-BR só na apresentação | **PARCIAL** | Back: `LocalDateTime` (sem offset). Front: mock em `YYYY-MM-DD`. Formatação pt-BR NÃO VERIFICADA. | Pendente. |
| I-CT-04 | Nenhum cálculo de demanda no front (exceto faixa e limites) | **PARCIAL** | Front não calcula demanda (sem fórmulas de Di/Fc/Fr encontradas). Faixa do Quadro 35 é lida de constante no front? NÃO VERIFICADO. | Verificar ao integrar o wizard. |
| I-CT-05 | Live HUD: debounce 400 ms, switchMap | **FALTA** | Endpoint inexistente (B-EP-16). | Pendente. |

---

## 6. Divergências encontradas (normas × documentos × código) e decisões

Regra de precedência (prompt, seção 1): (1) modelo de memorial define **formato** e resultados de referência; (2) especificações técnicas definem **regras e endpoints**; (3) normas oficiais definem **valores** quando os acima não cobrem ou estão errados. A fonte de valor usada aqui é a norma (`NeoGuide-NeoChat/docs/info/DIS-NOR-053-REV06.md` e `DIS-NOR-030-REV07.md`).

| # | Tema | Norma (valor correto) | Documento/código que diverge | Decisão | Status |
|---|---|---|---|---|---|
| V1 | Quadro 33 (VE) | 1–10: 1,00; 11–20: 0,86; 21–30: 0,80; 31–40: 0,78; 41–50: 0,75; 51–75: 0,70; 76–100: 0,65; >100: 0,60 (DIS-NOR-053, 6.26.1) | Código: 2→0,85; 3→0,75; ≤8→0,70; ≤12→0,60…; seed: 2→0,90; 4→0,80; 8→0,70 | Norma. Código e seed corrigidos. Teste R3 (4×7,4 kW = 29,60 kVA). | F2-01b |
| V2 | Quadro 35 (Di) | Ex.: 41–45: 1,05; 46–50: 1,16; 61–65: 1,47; 66–70: 1,57; até 40: 1,00 | Código: 40→1,20; 45→1,28; 50→1,35; 55→1,40; 60→1,43; 70→1,57; 80→1,80 (faixas inventadas). Seed: 61–70 = 1,65; ≤40 = 1,20. | Norma. Tabela completa, faixa por limite superior inclusivo. | F2-01 |
| V3 | Quadro 36 (Fc) | Tabela discreta 1 a 60+ (ex.: 20 = 87,20%; 50 = 70,68%; 8 = 96,50%) | Código: 20 = 85,60%; 50 = 70,80%; **interpolação** entre nós; seed: 20 = 85,60%. | Norma. Tabela discreta completa. Sem interpolação. | F2-02 |
| V4 | Dtr/Drf | Sem arredondamento intermediário (B-MT-07) | Código: `setScale(2)` em Dtr e Drf | Remover arredondamento intermediário. Apresentação com 2 casas. | F2-03 |
| V5 | Tab. 19 (motores) | 1/2 cv: 870 VA; 1 cv: 1520 VA; 2 cv: 2700 VA; 5 cv: 6020 VA; 10 cv: 11540 VA | Seed: 1/2 cv = 1180 VA; 5 cv = 5,27 kVA (`MotoresPartidasNormativoSeeder.java:87,112`) | Norma. Linhas corrigidas e testadas (R9). | F2-05 |
| V6 | FP piscinas (item 6.27.9) | FP 1,00 | Código FP 0,80 (`CommonAreaCalculationEngine.java:65`); guia e questionário também 0,80 | Norma: 1,00. Divergência do guia registrada. | F2-04 |
| V7 | FP tomadas | FP 1,00 (item 6.27.1.2; Q17) | Exemplo 1 do Anexo I usa 0,80 para tomadas | Código usa 1,00 (correto). Exemplo R1 parametrizado com 0,80 conforme pedido. | Sem divergência no código |
| V8 | Tab. 22 (escalonamento 20 kW/70%) | Escalonamento existe **só para escritórios** | Código aplica 1,00/0,70 a todas as finalidades (`CommercialCalculationEngine.java:21`) | **Não corrigido nesta rodada**: exige distinguir finalidades (Tab. 22). Pergunta P5. | Pendente |
| V9 | Tab. 3 (barramento 50×5) | 595 A (Tab. 3 da norma) | Seed: 595 A (correto). Guia: 620 A. | Norma. Seed correto. | OK |
| V10 | Tab. 2 (entrada) | Faixas da norma (ex.: 165–211 → 240 mm²/320 A) | Guia: 118–148 kVA → 120 mm²; 225–300 → 2×240 mm². Seed segue a norma. | Norma. Seleção pelo Ded pendente (B-MT-25). | Pendente |
| V11 | Limite de MT | Residencial 300 kVA; comercial/misto 225 kVA (6.2.4/6.2.6) | Documentos citam só 300. Código: sem regra. | Implementar em B-MT-23. Pendente (P5). | Pendente |
| V12 | Revisões citadas | DIS-NOR-030 Rev. 07; DIS-NOR-053 Rev. 06 | Código já cita Rev. 07 e Rev. 06 (`CommonAreaCalculationEngine.java:33`, `ResidentialCalculationEngine.java:19`). Documentos antigos citam Rev. 05/06 e Rev. 04. | Código correto. Documentos a atualizar (não são código). | OK no código |
| V13 | Motobomba fora do DQDG | Dmbi entra em Ded e não em DQDG (6.20.1) | Não verificado no fluxo (não há consolidação). | Pendente (B-MT-21/22). | Pendente |
| V14 | Parcela i e Fc para piscinas | ver V6 | — | — | — |
| V15 | Boilers | Aba 2 (N3) | Front `dados-calculo.ts:24` põe boilers na aba 4 ("Motores e equipamentos") | Corrigir na UI (wizard não integrado nesta rodada). Pendente. | Pendente |
| V16 | Cooktops (Tab. 10 × Tab. 9) | Item 6.27.5 manda usar Tab. 9 para fornos e fogões | Código usa Tab. 10 para cooktops (`CommonAreaCalculationEngineTest.java:114-117`) | **Premissa mantida e registrada** (seção 7). Não é a mais conservadora. | Premissa |
| V17 | Tab. 7 (guia 2 = 0,75) | 2 aparelhos = 1,00 | Código: 1,00 | Código correto. | OK |
| V18 | Tab. 16 (3 bombas) | 0,47 | Código: 0,47 | Código correto. | OK |
| V19 | Quadro 36 em CDMs | Item 9.3: aptos alimentados pelo transformador ou quadro | Sem lógica de CDM | Pendente (B-MT-30; premissa a confirmar, P13). | Pendente |
| V20 | Tipo de ligação × tipo de edificação | Spec: RESIDENCIAL_MULTIFAMILIAR/COMERCIAL/MISTO | Back: `ProjectType` = LIGACAO_NOVA/AUMENTO_CARGA/... | Pergunta P4. Não alterado. | Pendente |
| V21 | Status AGUARDANDO_CORRECAO | Não está no contrato (4 status) | Back tem 5 status | Pergunta P4. Não alterado. | Pendente |
| V22 | Modelo de memorial (Drf 114,00; Ded 186,10; 1 cv 0,84; 12,5 cv 10,51) | Valores de referência, não oráculo (prompt, seção 1) | Não é usado pelo código | Usado como caso de comparação apenas. | Registrado |

---

## 7. Premissas adotadas

As decisões D1–D9, C9, N1–N10 e os FPs seguem o prompt (seção 7). Os valores abaixo são os **implementados ou previstos**; o que não foi implementado está marcado.

| ID | Premissa | Referência | Situação no código |
|---|---|---|---|
| D1 | Projeto EM_ANALISE somente leitura; exclusão só RASCUNHO | Prompt 7 / B-EP-09, B-EP-10 | Exclusão: **implementada na Fase 2** (F2-06). Leitura: NÃO VERIFICADA. |
| D2 | Comercialidade: espaço comercial exige MISTO; limites 300 (residencial) e 225 (comercial/misto) | Prompt 7 / B-VL-07, B-MT-23 | **Não implementada.** Pendente. |
| D3 | CREA/CFT vem do perfil e preenche a etapa 1 | Prompt 7 | Perfil tem `crea` (`User.java:45`). Preenchimento da etapa 1: não verificado. |
| D4 | Status de aprovação só por ROLE_ANALISTA | Prompt 7 / B-SEC-06 | **Não implementada** (sem endpoint). |
| D5 | Ordem padrão: mais recentes | Prompt 7 | Back: `createdAt` desc (`ProjectController.java:63`). Padrão do prompt é `updatedAt` desc. Divergência menor, não alterada. |
| D6 | Paginação mobile = desktop, tamanho 10 | Prompt 7 | Não verificado no front. |
| D7 | FPs: iluminação 0,80; tomadas 1,00; chuveiros, boilers e fogões 1,00; eletrodomésticos 0,92; ar-condicionado 0,92; comercial 0,92; elevadores 0,92; bombas de piscina 1,00; VE 1,00 | Prompt 7 e seção 3.3 | Código: conforme, **exceto piscinas (0,80)** → corrigido na Fase 2 (F2-04). |
| D8 | Troca de e-mail exige senha atual; CPF/CNPJ somente leitura | Prompt 7 | CPF fora de `UsuarioUpdateDTO`. Troca de e-mail: NÃO VERIFICADA. |
| D9 | Login por e-mail | Prompt 7 | Back: e-mail (`AuthService.java:78`). Front mock aceita "CPF/CNPJ, e-mail". |
| C9 | Medidor exclusivo da motobomba (checkbox + nota) | Prompt 7 / 6.20.2 | Não encontrado. Pendente. |
| N1 | AVANÇAR habilitado e bloqueia com erro | Prompt 7 | Front: NÃO VERIFICADO. |
| N3 | Boilers na Aba 2 | Prompt 7 | **Divergente** no front (`dados-calculo.ts:24`). Pendente. |
| N4 | Potência unitária obrigatória em itens com cálculo | Prompt 7 | Não verificado. |
| N6 | Ar-condicionado na Aba 2 | Prompt 7 | OK no front (`dados-calculo.ts:15`). |
| N7 | Atenção por aba vazia só em Fornos e fogões | Prompt 7 | Não verificado. |
| N8 | Estado da aba: Preenchida se algum campo > 0 | Prompt 7 | Não verificado. |
| N10 | Etapa 5 acessível mesmo sem VE e sem bomba | Prompt 7 | Não verificado. |
| Premissa cooktop | Cooktops de indução pela Tab. 10 (guia), fornos pela Tab. 9 | Item 6.27.5 | Implementada em `CommonAreaCalculationEngine` (V16). Registrada aqui como interpretação. |
| Premissa FP ar-condicionado | 0,92 (a norma não fixa FP no item 6.27.6) | Prompt B-MT-13 | Implementada (`CommonAreaCalculationEngine.java:63`). |
| Premissa FP comercial | 0,92 (a norma não fixa FP na Tab. 22) | Prompt B-MT-18 | Implementada (`CommercialCalculationEngine.java:22`). |
| Premissa barramento | Seleção normativa é o mínimo; adoção maior permitida com justificativa | Prompt 7 | Não implementada (sem seleção). |
| Premissa token JWT | Política de armazenamento (ver P14) | Prompt seção 10 | Back emite JWT; front guarda em `sessionStorage` (`auth.service.ts:58-60`). Ver P14. |

---

## 8. Pendências e perguntas

As perguntas abaixo precisam de decisão de pessoa (time, Neoenergia ou professor). Itens marcados como "parar e perguntar" no prompt não foram feitos sem resposta.

| # | Pergunta | Por que importa | Bloqueia |
|---|---|---|---|
| P1 | Há um `java.exe` (PID 27568) ocupando a porta **8080**, que não é deste trabalho. Posso encerrá-lo, ou o back deve rodar em outra porta no ambiente de dev? | O back padrão (`application.yaml`, `proxy.conf.js`, `config.service.ts`) usa 8080. Não encerrei o processo sem confirmação. | Verificação no 8080 e proxy padrão. |
| P2 | O `DataSeeder` cria `admin@neoguide.com / admin123`, `maria@neoguide.com / maria123`, `joao@neoguide.com / joao1234` (`config/DataSeeder.java:57`). Devem sair do seed padrão ou ficar só em perfil de dev? | Senhas fixas e um usuário com ROLE_ANALISTA. Mudar exige decidir o que fazer com banco já populado. | Nenhum. Só registro. |
| P3 | D1: o design mostra EXCLUIR em "Em análise" (tela 10), mas a regra padrão proíbe. Confirmar a regra (back: exclusão só RASCUNHO, implementada em F2-06). | Divergência do design. | Nenhum. |
| P4 | Modelo de projeto: o contrato pede **tipo de edificação** (RESIDENCIAL_MULTIFAMILIAR, COMERCIAL, MISTO), mas o back tem **tipo de ligação** (`ProjectType`). Também há `AGUARDANDO_CORRECAO`, fora do contrato. Qual é o correto? Posso adicionar `tipoEdificacao` e remover ou manter o status extra? | Afeta B-DB-02, B-VL-01, B-VL-07 e D2. | Enquadramento D2. Não feito. |
| P5 | Tab. 22: o escalonamento 20 kW/70% vale só para escritórios (norma), e não para lojas. Confirmar. Também: limite de MT (225 para comercial/misto) deve valer já para o cálculo? | Afeta B-MT-18 e B-MT-23. | Dc e enquadramento. |
| P6 | Caminhos de endpoint: o contrato pede `/auth/me`, `/auth/password`, `/projects/{id}/duplicar`; o back tem `/usuarios/me`, `/usuarios/me/senha`, `/projects/{id}/duplicate`. Qual é canônico? (Os `.docx` de contrato não estão no repositório.) | Afeta I-CT-01. | Integração de perfil e duplicação. |
| P7 | Totais por status (B-EP-06): criar endpoint `GET /projects/totais` ou incluir `totais` na listagem? | Home e chips. | F-HM-02, F-LS-03. |
| P8 | Duplicação (B-EP-11) não copia as etapas (residencial, área comum, comercial, cargas especiais). Posso copiar as 4 entidades filhas? | Exigido pelo contrato; é uma mudança com 4 entidades. | F-LS-11, F-ED-02. |
| P9 | Erros RFC 7807 (B-EP-22, B-SEC-04) mudam o formato de todo erro da API (`message` vira `title`/`detail`). Posso fazer essa mudança agora? | É mudança de contrato; front ainda não consome. Afeta o `sessao_expirada`. | B-EP-22, B-VL-08, B-SEC-04 (só o 401 foi tratado em F2-08 se autorizado). |
| P10 | Avisos (B-EP-23): quais avisos publicar na Home (Novidades)? O endpoint foi criado com lista vazia. | Conteúdo é da equipe. | F-HM-05. |
| P11 | Rascunho do wizard está em `localStorage` (F-WZ-06). Autosave deve ir para o back (B-EP-12 a B-EP-15), e o `localStorage` sai. Confirmar. Também: qual convenção de JSON (`camelCase` em português, como o back usa?) | Dados do projeto no navegador; I-CT-02. | Wizard. |
| P12 | `NEO_API_KEY` está em `core/neo/neo.config.ts:8`, e o próprio arquivo afirma que a chave fica só no proxy. A constante hoje não é usada, mas vai para o bundle. Remover? | Vazamento de chave no bundle. | Nenhum. |
| P13 | CDMs (B-MT-30): confirmar se o sistema deve gerar CDMs e como calcular Fc por CDM (item 9.3 do Quadro 36). | Premissa a confirmar. | B-MT-30. |
| P14 | Token JWT: `sessionStorage` (atual, acessível por JavaScript) ou memória + cookie httpOnly (exige mudança no back)? Escolhi `sessionStorage` na Fase 2 por ser o padrão já usado no projeto. Confirmar. | Prompt, seção 10 ("registrar no relatório"). | Segurança. |
| P15 | **Limpeza de linhas normativas obsoletas (exige sua autorização, pois é apagar dados).** Após o upsert, o banco de desenvolvimento tem linhas antigas que não existem na norma: `catalogo_faixas_area` com 12 faixas antigas (`FAIXA_41_50`, `FAIXA_51_60`, `FAIXA_61_70`… `FAIXA_ACIMA_300`; total 51 = 39 novas + 12) e `catalogo_fatores_ve` com 5 linhas antigas (`max_vagas` 1, 2, 4, 8, 12; total 13 = 8 + 5). O motor não usa essas linhas (usa `TabelasNormativas`), mas o catálogo da API as expõe. Autoriza remover essas linhas? | Catálogo da API mostra valores errados até a limpeza. | Catálogo. |
| P16 | O login aceita CPF/CNPJ no campo `login` (`AuthService.java`). A decisão D9 diz que o login é só por e-mail. Manter o CPF/CNPJ ou restringir ao e-mail? | Divergência de D9. | Nenhum. |
| P17 | O upsert nos seeds corrigiu linhas **existentes** do banco de desenvolvimento (Quadro 35 e 36, Quadro 33 e kVA/corrente de 12 motores da Tabela 19). Nenhuma linha foi apagada. Confirma que essa atualização in place é aceitável? | Mudança de dados de referência no banco local. | Nenhum. |

Pendências de **escopo** (não cabem nesta rodada, não foram iniciadas): cálculo completo (B-EP-16 a B-EP-19, B-MT-21 a B-MT-28, B-DB-07), wizard de 6 etapas e telas de revisão/resultado/detalhamento/edição/perfil/cadastro (F-WZ, F-RV, F-CA, F-DT, F-ED, F-PF), Live HUD (B-EP-16, I-CT-05), análise (B-SEC-06).

---

## 9. Resultados dos testes e verificações

Esta seção é preenchida no fim da Fase 2 (ver abaixo). Itens marcados `CONCLUÍDO` precisam aparecer aqui com evidência.

### 9.1 Antes das alterações (linha de base, Fase 1)

| Verificação | Comando | Resultado |
|---|---|---|
| Testes unitários e de controller do back | `./mvnw -B test` (JDK 21, `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT`) | **BUILD SUCCESS: 272 testes, 0 falhas, 0 erros, 0 ignorados** |
| Teste sem o truststore do Windows | `./mvnw -B test` (sem MAVEN_OPTS) | FALHA de ambiente: `PKIX path building failed` ao baixar `surefire-junit-platform`. Não é defeito do código. |
| Build do front | `npx ng build --configuration development` | **OK** (exit 0) |
| Banco | `docker ps` | `neoguide-db` **healthy** |
| Back subindo | `./mvnw spring-boot:run` (porta 8080) | **Falhou**: porta 8080 ocupada (PID 27568). |
| Back subindo | `SERVER_PORT=8081 ./mvnw spring-boot:run` | **OK** (subiu e respondeu). Ver 9.1.1. |
| Endpoints públicos | `GET /api/v1/catalogo/faixas-area` | HTTP 200 |
| Endpoint protegido sem token | `GET /api/v1/projects` | HTTP 401 |
| Login com senha errada | `POST /api/v1/auth/login` | HTTP 401, mensagem "E-mail ou senha inválidos" (diverge de B-SEC-05) |

### 9.1.1 Validação do back em execução

Back iniciado com `SERVER_PORT=8081 ./mvnw spring-boot:run` (JDK 21, banco `neoguide-db` do Docker). Subiu e respondeu. Após a Fase 2, reiniciado com o código novo; os probes de 9.3 foram feitos sobre essa instância.

### 9.2 Testes e verificações da Fase 2

**Comandos executados**
- Back: `JAVA_HOME=.../jdk-21 MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=Windows-ROOT ./mvnw -B test` → **BUILD SUCCESS, 303 testes, 0 falhas, 0 erros**.
- Front: `CHROME_BIN=.../chrome.exe npx ng test --watch=false --browsers=ChromeHeadless` → **TOTAL: 60 SUCCESS**.
- Front: `npx ng build --configuration development` → OK.

**Registro dos itens da Fase 2** (status final de cada item)

| ID | Item (requisito) | Status | Evidência |
|---|---|---|---|
| F2-01 | Quadro 35: faixas e Di (B-MT-01) | **CONCLUÍDO** | `engine/normativo/TabelasNormativas.java` (39 faixas); `ResidentialCalculationEngineTest` (37 casos de fronteira); `TabelasNormativasTest`; banco: 39 linhas do Rev. 06 gravadas; `GET /catalogo/faixas-area` mostra `FAIXA_61_65 → 1,47` |
| F2-01b | Quadro 33 (VE) no motor e no seed (B-MT-19) | **CONCLUÍDO** (limpeza de 5 linhas antigas: P15) | `SpecialLoadsCalculationEngineTest.recargaVeicular_faixasQuadro33_*` e `recargaVeicular_regressaoValoresAntigos`; `TabelasNormativasTest.quadro33_faixas`; banco: 8 linhas corrigidas |
| F2-02 | Quadro 36 como tabela discreta, sem interpolação (B-MT-03) | **CONCLUÍDO** | `ResidentialCalculationEngineTest.testTabelaDiscretaQuadro36` (18 casos, incl. N=20→0,8720, N=50→0,7068, N=22→0,8477); `testSemInterpolacao`; `GET /catalogo/fatores-coincidencia-residencial` com 60 linhas |
| F2-03 | Sem arredondamento intermediário em Dtr/Drf (B-MT-05, B-MT-07) | **CONCLUÍDO** | `testMemorialCanonico100Apartamentos` (Dtr=103,7096; Drf=114,08056; apresentação 103,71 e 114,08); `ProjectControllerTest` (Drf=121,21 na resposta, 2 casas) |
| F2-04 | FP das bombas de piscina = 1,00 (B-MT-16, D7) | **CONCLUÍDO** | `CommonAreaCalculationEngineTest.testParcelaIBombasPiscinaTabela16` (1,68 kVA); `testConsolidadoCasoCompletoDs` (Ds = 104,31) |
| F2-04b | Mensagem genérica de login (B-SEC-05, B-EP-02) | **CONCLUÍDO** | `AuthServiceTest` (2 casos), `AuthControllerTest`; probe 8081: `"E-mail ou senha incorretos."` |
| F2-05 | Tabela 19 (motores) no motor e no seed (B-MT-14, B-MT-20; R9) | **CONCLUÍDO** para kVA e corrente. Potência ativa e rendimento não constam nesta tabela e não foram alterados. | `SpecialLoadsCalculationEngineTest.motobombaIncendio_tabela19ValoresNormativos` (1 cv=1,52; 2 cv=2,70 [R7]; 5 cv=6,02 [R9]; 10 cv=11,54; 15 cv=16,65; 25 cv=25,83; 30 cv=30,52); `TabelasNormativasTest.tabela19_valoresDeReferencia`; `CommonAreaCalculationEngineTest.testParcelaGMotoresComRevezamentoDeBombas` (8,04 kVA); probe 8081: 5 cv = 6,02 kVA e 9,10 A |
| F2-06 | Exclusão só de rascunho (B-EP-10, D1) | **CONCLUÍDO** | `ProjectServiceTest.deleteProject_emAnalise_lancaConflito` e `deleteProject_aprovadoOuReprovado_lancaConflito`; probe 8081: DELETE de projeto EM_ANALISE → **409**, projeto segue existindo (200) |
| F2-07 | `GET /api/v1/avisos` público (B-EP-23) | **CONCLUÍDO** no endpoint. Conteúdo: PENDENTE (P10) | `AvisoControllerTest`; probe anônimo → 200 |
| F2-08 | 401 com código `sessao_expirada` (B-SEC-04) | **PARCIAL**: código feito. Formato RFC 7807: pendente (P9) | `JwtAuthenticationEntryPointTest`; probe 8081: `"codigo":"sessao_expirada"` |
| F2-10 | Rota inexistente → 404 em vez de 500 (B-EP-22) | **PARCIAL**: 404 feito. RFC 7807: pendente (P9) | `GlobalExceptionHandlerNotFoundTest`; probe 8081: `/auth/me` → 404 (antes 500), `/projects/6/calcular` → 404 (antes 500) |
| F2-09 | Front: login real, interceptor JWT, 401 → Estado B, proxy `/api/v1` (F-LG-01, F-LG-03, I-CT-01 parcial) | **CONCLUÍDO** para o login. Demais telas seguem em mock | `core/auth/auth.integracao.spec.ts` (6 casos: corpo do login, Bearer, sem token no Neo, 401 → `/sessao-expirada` com `returnUrl`, 401 no próprio login não redireciona); probe pelo `localhost:4200/api/v1`: login errado → 401 genérico; login certo → 200 + JWT; rota protegida com token → 200; sem token → 401 `sessao_expirada` |
| F2-09b | Mock de login removido (F-MK-01, parcial) | **CONCLUÍDO** para auth. Demais mocks: PENDENTES | `core/auth/auth.service.ts` sem `delay` nem credenciais simuladas |
| F2-11 | Specs antigos que quebraram com o `HttpClient` no `AuthService` | **CONCLUÍDO** | `login.page.spec.ts` e `neo-state.service.spec.ts` passaram a fornecer HTTP de teste |

**Correções de testes que fixavam valores errados.** Cada asserção antiga foi trocada pelo valor da norma, com comentário citando o quadro. Lista: `ResidentialCalculationEngineTest` (reescrito: Quadro 35, Fc sem interpolação, memorial 100 unidades comparando a apresentação), `SpecialLoadsCalculationEngineTest` (reescrito), `CommonAreaCalculationEngineTest` (3 valores), `NormativeDataSeederTest` (contagens 39/60, 1,00 e 16,93, 6,02 e 9,10), `CatalogControllerTest`, `CatalogCommonAreaControllerTest`, `CatalogServiceTest`, `SpecialLoadsControllerTest`, `ProjectControllerTest` (Drf 121,21, Di 1,76, subtotal 88,00), `AuthControllerTest`, `AuthServiceTest`. O `ProjectServiceTest` usa 122,72 como retorno simulado de um mock, por isso não mudou.

### 9.3 Ponta a ponta

**Verificado** (probes reais no back da 8081 e pelo proxy do front). As requisições foram só leituras, **exceto** o upsert dos seeds normativos, que roda ao subir o back e atualizou as linhas de referência (P17). Nenhum projeto foi criado, alterado ou excluído nesta verificação:

| Verificação | Resultado |
|---|---|
| Login com senha errada | 401, `"E-mail ou senha incorretos."` |
| Login com a semente (`maria@neoguide.com`) | 200 com JWT (role `ROLE_PROJETISTA`) |
| Rota protegida sem token | 401 com `codigo: "sessao_expirada"` |
| Rota protegida com token | 200 |
| Isolamento: João lê projeto da Maria (id 6) | **403** (B-SEC-02) |
| Projeto inexistente (id 999999) | 404 com mensagem |
| `GET /api/v1/avisos` anônimo | 200, lista vazia |
| Rota inexistente (`/auth/me`, `/projects/6/calcular`) | 404 (antes 500) |
| DELETE de projeto EM_ANALISE | 409, projeto intacto |
| Catálogo: `FAIXA_61_65` | 1,47 kVA |
| Catálogo: Quadro 36 | 60 linhas |
| Catálogo: motor 5 cv | 6,02 kVA, 9,10 A |
| Front `localhost:4200/api/v1`: login errado / certo / rota protegida | 401 genérico / 200 com token / 200 com token e 401 `sessao_expirada` sem token |

**Não executado** (não há endpoint, ou exige decisão):
- Fluxo completo cadastro → login → criar projeto → 5 etapas → revisão → calcular → resultado → memorial → baixar. Faltam cadastro no front, wizard, `POST /calcular` e memorial PDF.
- Fluxos de erro com UI (campo, alerta de MT, aviso até 50 kVA): dependem do cálculo e das telas.
- Duplicação com desfazer: depende de P8 (cópia das etapas) e do front de listagem.
- Navegação real no navegador (clique em "Entrar", redirecionamento de sessão expirada): coberta pelos specs de `HttpTestingController`, não por teste de navegador. A tela não foi aberta no Chrome.

### 9.3 Ponta a ponta

Preenchido ao final da Fase 2.

## 10. Cálculo integrado ao back (fluxo "Revisão concluída")

Status: **back concluído e testado; front ainda não integrado** (ver 10.5).

### 10.1 Diagnóstico (confirmado no código)

- "Os dados ficam salvos neste navegador": `shared/wizard/etapas-calculo.component.html` (aviso da etapa de cargas).
- "Revisão concluída. Seu rascunho está pronto. O cálculo de demanda ficará disponível...": `shared/wizard/wizard-body.component.html`.
- "Revisão concluída.": `features/calculo-demanda/calculo-demanda.page.ts` (método `concluir()`), que só altera uma mensagem; não chama nenhum serviço.
- Armazenamento local de dados de projeto: `core/projetos/rascunhos-projeto.service.ts` (`localStorage` com o rascunho completo e os complementos por projeto).
- Serviço de cálculo "stub": não existe no front. O botão de conclusão não chama o back, então nenhuma mensagem de sucesso depende de resposta real.
- Endpoints no back antes desta entrega: `PUT etapa-residencial`, `etapa-area-comum`, `etapa-comercial`, `etapa-cargas-especiais` e `POST /api/v1/simulacao/pre-calculo-etapa` existiam. **Faltavam** `GET validacao-normativa`, `POST calcular` (respondia 404), `GET resultado` e `GET memorial-pdf`.

### 10.2 Implementado no back

- `engine/DemandaFinalEngine` (motor puro): Ded, DQDG (= Ded − Dmbi), enquadramento BT/MT (residencial ≤ 300 kVA; comercial e misto ≤ 225 kVA), entrada de serviço pela Tabela 2 (380/220 V), barramento pela Tabela 3, Ip e alertas (INFO ≤ 50 kVA, ALERTA de Ip acima do disjuntor, INFO de relé ajustável a partir de 250 A, ALERTA de atendimento em MT).
- `service/CalculoDemandaService`: consolida as etapas gravadas (tipologias, área comum, espaços comerciais, VE e motobomba), valida completude, calcula, grava o último resultado (`demand_results`) e serve resultado e memorial.
- `controller/CalculoController`: `GET /validacao-normativa`, `POST /calcular`, `GET /resultado`, `GET /memorial-pdf` (em `/api/v1/projects/{id}/...` e `/projects/{id}/...`).
- `service/MemorialPdfWriter`: PDF gerado sem dependência nova (Helvetica, A4, paginado).
- Testes novos: `DemandaFinalEngineTest` (15), `CalculoControllerTest` (6, integração), `MemorialPdfWriterTest` (4). **Suíte completa do back: 348/348 passando.**

### 10.3 Decisões tomadas (a validar)

- DESATUALIZADO é detectado por impressão digital (SHA-256) dos insumos do cálculo, e não por data de alteração. Um PUT com os mesmos dados mantém CALCULADO.
- Só o último cálculo é guardado por projeto (histórico descartado).
- Selo de conformidade: `ATENDIMENTO_MT` (Ded acima do limite), `COM_ALERTAS` (há ALERTA) ou `CONFORME`.
- Erros dos endpoints novos em RFC 7807 (`ProblemDetail`), com `regra`, `erros` (campo e etapa) e `detail`. Os PUTs existentes mantêm o formato atual de erro (mudar isso é mudança de contrato e depende de aprovação).
- Endpoints novos respondem 404 quando o projeto é de outro usuário, como pede a especificação. Os endpoints antigos respondem 403 (B-SEC-02). A inconsistência precisa de decisão.
- Neutro: a Tabela 2 da semente traz uma seção por faixa; o condutor de neutro usa a mesma seção. Confirmar com a norma.
- Dc usa a demanda gravada em cada espaço comercial (calculada pelo mesmo motor no PUT).
- Não implementado (sem campo no modelo): regra do Grupo A → MT e alerta de medidor exclusivo da motobomba.
- Memorial: o layout final depende do modelo de memorial, que não está no repositório. Hoje o PDF traz o conteúdo do cálculo em texto simples.

### 10.4 Respostas do usuário (contrato escolhido)

- Área comum: o front passa a usar o catálogo do back (potência, fator de potência e fator de demanda vêm do catálogo).
- Cargas especiais: o front pede potência por ponto de VE (kW) e uma bomba de incêndio em cv, que é o contrato atual do back.

### 10.5 Pendências do front (ordem sugerida)

1. Área comum por catálogo: nova tela e mapeamento para `CommonAreaLoadItemRequest`. Enquanto não for feita, o cálculo fica sem Ds e não deve ser exibido como resultado.
2. Cargas especiais: trocar "quantidade de bombas" por uma bomba em cv e incluir potência por ponto de VE (kW); enviar em `PUT etapa-cargas-especiais`.
3. Residencial: enviar `PUT etapa-residencial` (grupos viram tipologias) e carregar ao abrir o projeto. Falta um `GET` de etapas no back para isso.
4. Autosave com estado "Salvando... / Rascunho salvo automaticamente / Não foi possível salvar" e cancelamento de requisições antigas.
5. Remover `rascunhos-projeto.service.ts` como armazenamento de dados de projeto e incluir a migração ENVIAR/DESCARTAR.
6. Revisão: `validacao-normativa` → `calcular` → `resultado` → `memorial-pdf` (blob), com banners de erro, de atenção e de falha de rede. Remover os textos antigos.
7. Detalhamento: situação CALCULADO / DESATUALIZADO / NAO_CALCULADO com data real.

Nada foi commitado nem enviado ao remoto.

## 11. Atualização de premissa: etapa Comercial sempre disponível (substitui a D2)

- **Antes (D2):** comercial só com tipo Comercial ou Misto; espaço comercial em edificação residencial era erro (B-VL-07, `COMERCIAL_TIPO_INCOMPATIVEL`).
- **Agora:** a etapa Comercial é sempre disponível e opcional, para qualquer tipo. Não há erro de tipo.
- **Enquadramento:** o tipo escolhido não muda; o back deriva o tipo de enquadramento. Residencial sem espaços comerciais: residencial (BT até 300 kVA). Residencial com espaços comerciais: misto (BT até 225 kVA, itens 6.2.4 e 6.2.6 da DIS-NOR-053). Misto e comercial: o próprio tipo (225 kVA).
- **Aviso:** ALERTA `TIPO_ENQUADRAMENTO_MISTO` quando o derivado difere do escolhido; não bloqueia.
- **Resultado e memorial:** informam o tipo escolhido, o tipo de enquadramento e o motivo.
- **Estado das etapas:** calculado no servidor (`etapas[]` em `GET /projects/{id}`); `etapaAtual` passa a significar a etapa mais adiantada alcançada, registrada por `PUT /projects/{id}/etapa-atual`.
- Detalhes, testes e pendências: `CORRECAO-COMERCIAL.md`.
