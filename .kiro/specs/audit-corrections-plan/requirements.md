# Requirements Document

## Introduction

Este documento define os requisitos para o plano de correções do i9 Wise Content, baseado nos achados de uma auditoria Playwright profunda (95 testes, 12 falhas) e análise consolidada de problemas. O escopo abrange hardening de ambiente, correções funcionais, segurança, qualidade de código e testes — excluindo responsividade mobile, otimização profunda de prompts e features novas.

**Restrições globais:**
- Zero tolerância a regressões (build + 171 unit tests + 41 E2E tests devem continuar passando)
- Edições cirúrgicas: mínimo necessário sem refatorar código funcional fora do escopo
- Execução incremental: build válido entre cada correção
- Backward compatible: sem breaking changes em APIs ou schema de banco

## Glossary

- **App**: A aplicação i9 Wise Content (Next.js 16 + React 19 + Supabase)
- **Startup_Validator**: Módulo de validação executado na inicialização da aplicação
- **Scheduler**: Módulo que avalia quais blogs precisam de conteúdo e enfileira pipelines (`src/lib/pipeline/scheduler.ts`)
- **PipelineController**: Orquestrador de execução do pipeline de 4 agentes (`src/lib/pipeline/controller.ts`)
- **ErrorBoundary**: Componente React class que captura erros de renderização em árvores filhas (`src/components/ErrorBoundary.tsx`)
- **PromptSanitizer**: Módulo que sanitiza inputs de usuário antes da interpolação em prompts de IA (`src/lib/ai/sanitizer.ts`)
- **Pagination_Utility**: Utilitário de paginação cursor-based existente (`src/lib/utils/pagination.ts`)
- **Logger**: Sistema de logging estruturado (`src/lib/utils/logger.ts`)
- **Crypto_Module**: Módulo de criptografia AES-256-GCM (`src/lib/utils/crypto.ts`)
- **Vitest_Config**: Arquivo de configuração do Vitest (`vitest.config.ts`)
- **AuditReporter**: Reporter customizado que gera relatório markdown dos testes de auditoria
- **Agent**: Um dos 4 agentes de IA do pipeline (PlannerAgent, ResearcherAgent, WriterAgent, ReviewerAgent)
- **Markdown_Preview**: Componente que renderiza preview de artigos em markdown
- **Cron_Endpoint**: Endpoint de API acionado por cron jobs da Vercel (`/api/cron/`)
- **ENCRYPTION_KEY**: Variável de ambiente com chave hex de 64 caracteres para AES-256-GCM
- **CRON_SECRET**: Variável de ambiente com segredo para autenticação de cron jobs
- **SUPABASE_SERVICE_ROLE_KEY**: Chave de service role do Supabase para bypass de RLS

## Requirements

### Requisito 1: Validação de ENCRYPTION_KEY no Startup

**User Story:** Como operador, quero que a aplicação valide a ENCRYPTION_KEY na inicialização, para que eu receba um erro descritivo imediatamente em vez de falhas silenciosas em runtime.

#### Critérios de Aceitação

1. WHEN a App inicia, THE Startup_Validator SHALL verificar que a variável de ambiente ENCRYPTION_KEY está presente e contém exatamente 64 caracteres hexadecimais
2. IF a ENCRYPTION_KEY está ausente ou possui formato inválido, THEN THE Startup_Validator SHALL lançar um erro com mensagem descritiva incluindo o comando de geração (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
3. WHILE o ambiente é de desenvolvimento (NODE_ENV=development), THE Startup_Validator SHALL emitir um warning no console em vez de abortar a inicialização quando ENCRYPTION_KEY está ausente

---

### Requisito 2: Validação de CRON_SECRET no Startup e Runtime

**User Story:** Como operador, quero que a aplicação rejeite CRON_SECRET vazio ou ausente, para que endpoints de cron nunca fiquem desprotegidos.

#### Critérios de Aceitação

1. WHEN a App inicia, THE Startup_Validator SHALL verificar que a variável de ambiente CRON_SECRET está presente e possui comprimento mínimo de 16 caracteres
2. IF a CRON_SECRET está ausente ou é string vazia, THEN THE Startup_Validator SHALL lançar um erro com mensagem descritiva incluindo instruções de geração
3. WHEN um request chega ao Cron_Endpoint, THE Cron_Endpoint SHALL rejeitar com status 401 se o header Authorization não contém um Bearer token não-vazio que corresponde ao CRON_SECRET
4. IF o valor extraído do header Authorization é uma string vazia, THEN THE Cron_Endpoint SHALL rejeitar o request com status 401 independentemente do valor de CRON_SECRET

---

### Requisito 3: Documentação de Variáveis de Ambiente Obrigatórias

**User Story:** Como operador, quero instruções claras no .env.example para gerar ENCRYPTION_KEY e CRON_SECRET, para que eu configure o ambiente corretamente na primeira tentativa.

#### Critérios de Aceitação

1. THE App SHALL manter no arquivo .env.example um comentário acima de ENCRYPTION_KEY com o comando exato de geração: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. THE App SHALL manter no arquivo .env.example um comentário acima de CRON_SECRET com o comando exato de geração: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. THE App SHALL incluir no .env.example uma seção de marcação indicando quais variáveis são OBRIGATÓRIAS para produção versus opcionais

---

### Requisito 4: Validação de SERVICE_ROLE_KEY no Scheduler

**User Story:** Como operador, quero que o scheduler valide a presença de SUPABASE_SERVICE_ROLE_KEY antes de executar, para evitar falhas silenciosas ao tentar consultar o banco com admin client.

#### Critérios de Aceitação

1. WHEN o Scheduler é invocado, THE Scheduler SHALL verificar que a variável SUPABASE_SERVICE_ROLE_KEY está presente e não-vazia antes de criar o admin client
2. IF SUPABASE_SERVICE_ROLE_KEY está ausente ou vazia, THEN THE Scheduler SHALL retornar resultado com triggered=0 e registrar erro via Logger com mensagem descritiva

---

### Requisito 5: Error Boundaries em Todas as Rotas Principais

**User Story:** Como operador, quero que erros de renderização em qualquer rota sejam capturados pelo ErrorBoundary, para que um componente com erro não derrube a página inteira.

#### Critérios de Aceitação

1. THE App SHALL envolver cada rota principal do dashboard com um componente ErrorBoundary (rotas: dashboard, blogs, articles, ideas, calendar, settings, pipeline, prompts, templates)
2. WHEN um erro de renderização ocorre em uma rota envolvida por ErrorBoundary, THE ErrorBoundary SHALL exibir uma UI de fallback com mensagem amigável e botão de "Tentar novamente"
3. WHEN um erro é capturado pelo ErrorBoundary, THE ErrorBoundary SHALL registrar o erro via Logger com stack trace e informação da rota onde ocorreu

---

### Requisito 6: Substituir dangerouslySetInnerHTML por react-markdown

**User Story:** Como operador, quero que o preview de artigos use react-markdown em vez de dangerouslySetInnerHTML, para eliminar risco de XSS no conteúdo renderizado.

#### Critérios de Aceitação

1. THE Markdown_Preview SHALL renderizar conteúdo markdown usando a biblioteca react-markdown (já instalada como dependência)
2. THE Markdown_Preview SHALL suportar GitHub Flavored Markdown via plugin remark-gfm (já instalado como dependência)
3. THE Markdown_Preview SHALL preservar a mesma aparência visual (estilos Tailwind) que o preview anterior

---

### Requisito 7: Paginação Cursor-Based em Endpoints de Listagem

**User Story:** Como operador, quero que endpoints de listagem implementem paginação, para que a performance não degrade com o crescimento dos dados.

#### Critérios de Aceitação

1. WHEN um request GET chega ao endpoint de listagem de artigos, THE App SHALL retornar no máximo o número de itens especificado pelo parâmetro `limit` (default 20, máximo 100)
2. WHEN um request GET chega ao endpoint de listagem de ideias, THE App SHALL retornar no máximo o número de itens especificado pelo parâmetro `limit` (default 20, máximo 100)
3. WHEN um parâmetro `cursor` é fornecido no request, THE App SHALL retornar apenas itens criados após o cursor informado (paginação cursor-based por created_at + id)
4. THE App SHALL incluir no response de listagens um campo `nextCursor` contendo o cursor para a próxima página, ou null quando não houver mais itens
5. IF o parâmetro `limit` excede 100, THEN THE App SHALL limitar a 100 itens sem retornar erro

---

### Requisito 8: Scheduler Deve Enfileirar em Vez de Executar

**User Story:** Como operador, quero que o scheduler enfileire pipelines em vez de executá-los inline, para evitar timeout com múltiplos blogs e permitir que o sistema de concorrência controle a execução.

#### Critérios de Aceitação

1. WHEN o Scheduler identifica um blog elegível para pipeline, THE Scheduler SHALL chamar PipelineController.enqueue() em vez de PipelineController.execute()
2. THE Scheduler SHALL completar a avaliação de todos os blogs e retornar o resultado em menos de 30 segundos, independente do número de blogs ativos
3. WHEN múltiplos blogs são elegíveis simultaneamente, THE Scheduler SHALL enfileirar todos e deixar o sistema de concorrência (máximo 3 simultâneos) gerenciar a execução

---

### Requisito 9: Correção do Vitest Config para Excluir E2E

**User Story:** Como desenvolvedor, quero que o comando `npx vitest --run` execute apenas testes unitários, para evitar erros de módulo jsdom ao incluir acidentalmente arquivos E2E.

#### Critérios de Aceitação

1. THE Vitest_Config SHALL excluir o padrão `tests/e2e/**` da execução de testes unitários
2. WHEN o comando `npx vitest --run` é executado, THE App SHALL executar apenas testes nos diretórios configurados para unit tests, sem processar arquivos em `tests/e2e/`
3. THE Vitest_Config SHALL manter compatibilidade com o script `npm run test` definido no package.json

---

### Requisito 10: Integrar PromptSanitizer nos 4 Agentes de IA

**User Story:** Como operador, quero que todos os campos de input do usuário sejam sanitizados antes de interpolação em prompts, para mitigar risco de prompt injection.

#### Critérios de Aceitação

1. WHEN o PlannerAgent constrói um prompt, THE PlannerAgent SHALL sanitizar todos os campos fornecidos pelo usuário (título, keywords, descrição, persona) usando PromptSanitizer.sanitize() com os limites definidos em FIELD_LIMITS
2. WHEN o ResearcherAgent constrói um prompt, THE ResearcherAgent SHALL sanitizar todos os campos fornecidos pelo usuário usando PromptSanitizer.sanitize()
3. WHEN o WriterAgent constrói um prompt, THE WriterAgent SHALL sanitizar todos os campos fornecidos pelo usuário usando PromptSanitizer.sanitize()
4. WHEN o ReviewerAgent constrói um prompt, THE ReviewerAgent SHALL sanitizar todos os campos fornecidos pelo usuário usando PromptSanitizer.sanitize()
5. IF um campo sanitizado resulta em string vazia, THEN THE Agent SHALL usar o placeholder definido ("conteúdo não fornecido") em vez de interpolar string vazia no prompt

---

### Requisito 11: Migrar console.log/error Restantes para Logger

**User Story:** Como desenvolvedor, quero que todos os arquivos de serviço usem o Logger estruturado em vez de console.log/error, para ter logging consistente com contexto.

#### Critérios de Aceitação

1. THE App SHALL utilizar exclusivamente a instância de Logger para registrar mensagens em todos os arquivos dentro de `src/lib/` (excluindo arquivos de teste)
2. WHEN um erro precisa ser registrado, THE App SHALL usar Logger.error() com mensagem descritiva, objeto de erro e contexto adicional em vez de console.error()
3. WHEN informação operacional precisa ser registrada, THE App SHALL usar Logger.info() ou Logger.debug() em vez de console.log()

---

### Requisito 12: Substituir Type Assertions por Tipos Drizzle

**User Story:** Como desenvolvedor, quero que o scheduler e controller usem tipos inferidos do schema Drizzle, para ter type safety completo e eliminar assertions inseguras.

#### Critérios de Aceitação

1. THE Scheduler SHALL tipar a variável de blogs com o tipo inferido do schema Drizzle (`InferSelectModel<typeof blogs>`) em vez de usar `Record<string, unknown>`
2. THE PipelineController SHALL tipar dados de query com tipos inferidos do schema Drizzle em vez de type assertions
3. WHEN uma query Drizzle retorna dados, THE App SHALL acessar campos diretamente pelo tipo inferido sem necessidade de casting manual

---

### Requisito 13: Correção do Teste E2E — Seletor CSS do Calendário

**User Story:** Como desenvolvedor, quero que o teste de calendário use a API de locators correta do Playwright, para que o teste valide interatividade sem erros de parsing CSS.

#### Critérios de Aceitação

1. WHEN o teste de auditoria do calendário verifica interatividade de células, THE App SHALL usar `page.locator('button').filter({ hasText: /^\d{1,2}$/ })` ou locator equivalente válido em vez do seletor CSS inválido `button:has-text(/^\d{1,2}$/)`
2. THE teste de auditoria do calendário SHALL executar sem erros de parsing de seletor CSS

---

### Requisito 14: Correção do Teste E2E — API POST com request.post()

**User Story:** Como desenvolvedor, quero que o teste de API use a APIRequestContext do Playwright, para que requisições POST funcionem sem problemas de contexto do browser.

#### Critérios de Aceitação

1. WHEN o teste de auditoria verifica rejeição de payloads inválidos em rotas POST, THE App SHALL usar `request.post()` da APIRequestContext do Playwright em vez de `page.evaluate(fetch)`
2. THE teste de API POST SHALL receber e validar o status code de resposta do servidor sem erros de conectividade

---

### Requisito 15: Correção do Teste E2E — Timeout em /templates

**User Story:** Como desenvolvedor, quero que o teste de buttons complete sem timeout na rota /templates, para que a auditoria de botões cubra todas as páginas.

#### Critérios de Aceitação

1. WHEN o teste de auditoria navega para /templates, THE App SHALL carregar a página em menos de 30 segundos em modo desenvolvimento
2. IF a página /templates requer dados do servidor, THEN THE App SHALL aplicar loading state adequado que permita ao teste prosseguir antes de o fetch completar

---

### Requisito 16: Strip ANSI Codes no AuditReporter

**User Story:** Como desenvolvedor, quero que mensagens de erro no relatório de auditoria sejam legíveis, para que códigos ANSI de cor não poluam o markdown gerado.

#### Critérios de Aceitação

1. WHEN o AuditReporter inclui mensagens de erro no relatório markdown, THE AuditReporter SHALL remover todos os códigos de escape ANSI usando regex (`/\x1b\[[0-9;]*m/g`)
2. THE AuditReporter SHALL produzir relatório markdown contendo apenas texto plain sem sequências de escape

---

### Requisito 17: Testes Property-Based para Módulos Core

**User Story:** Como desenvolvedor, quero testes property-based com fast-check para módulos core, para validar propriedades de corretude em grande variedade de inputs.

#### Critérios de Aceitação

1. THE App SHALL incluir teste property-based de round-trip para o Crypto_Module: para toda string de input, decrypt(encrypt(input)) é igual ao input original
2. THE App SHALL incluir teste property-based para o PromptSanitizer: para toda string de input, o output não contém nenhum dos padrões de injection definidos em INJECTION_PATTERNS
3. THE App SHALL incluir teste property-based para a Pagination_Utility: para qualquer lista de N itens com limit L, o número de páginas retornadas nunca excede ceil(N/L)
4. THE App SHALL incluir teste property-based para o cost-calculator: para qualquer contagem de tokens >= 0, o custo calculado é >= 0 e proporcional (dobrar tokens dobra o custo)
5. THE App SHALL incluir teste property-based para o rate-limiter: para qualquer sequência de N requests em janela de tempo W com limite L, no máximo L requests são permitidos
6. THE App SHALL incluir teste property-based para a state-machine: para qualquer sequência de transições válidas, o estado final está no conjunto de estados alcançáveis do estado inicial
7. THE App SHALL incluir teste property-based para o Logger: para toda mensagem contendo dados sensíveis (emails, tokens), o output sanitizado não contém os dados originais

---

### Requisito 18: Limpeza do Checklist de Documentação

**User Story:** Como operador, quero que o checklist.md reflita o estado real do projeto, para que não haja confusão sobre quais sprints foram concluídos.

#### Critérios de Aceitação

1. THE App SHALL manter no arquivo docs/checklist.md uma única entrada por sprint sem duplicatas
2. THE App SHALL marcar Sprints 1-11 como concluídos no checklist, refletindo o estado real do projeto (build OK, 171 unit tests + 41 E2E tests passando)
