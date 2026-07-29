# Implementation Plan: Correções da Auditoria

## Overview

Implementação das 18 correções identificadas na auditoria do i9 Wise Content, organizadas em 4 ondas de execução (Startup → Funcional → Segurança/Qualidade → Testes). Cada tarefa é atômica e mantém o build válido entre correções.

## Tasks

- [ ] 1. Wave 1 — Hardening de Ambiente (Startup)
  - [ ] 1.1 Criar módulo env-validator.ts
    - Criar arquivo `src/lib/utils/env-validator.ts`
    - Exportar interface `EnvRule` e função `validateEnv()`
    - Validar ENCRYPTION_KEY (64 hex chars), CRON_SECRET (min 16 chars), SUPABASE_SERVICE_ROLE_KEY (não-vazia)
    - Em dev (NODE_ENV=development): emitir `console.warn` + continuar
    - Em prod: `throw Error` com mensagem descritiva + comando de geração
    - _Requisitos: 1.1, 1.2, 1.3, 2.1, 2.2_

  - [ ] 1.2 Criar instrumentation.ts no root do app
    - Criar arquivo `src/instrumentation.ts` (hook nativo Next.js)
    - Importar e chamar `validateEnv()` no register()
    - _Requisitos: 1.1, 2.1_

  - [ ] 1.3 Atualizar .env.example com instruções de geração
    - Adicionar comentário acima de ENCRYPTION_KEY com comando: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    - Adicionar comentário acima de CRON_SECRET com mesmo comando
    - Adicionar seção marcando variáveis OBRIGATÓRIAS vs opcionais
    - _Requisitos: 3.1, 3.2, 3.3_

  - [ ] 1.4 Adicionar validação de SERVICE_ROLE_KEY no scheduler
    - Editar `src/lib/pipeline/scheduler.ts`
    - Verificar `process.env.SUPABASE_SERVICE_ROLE_KEY` antes de `createAdminClient()`
    - Se ausente: retornar `{ triggered: 0, results: [] }` + `Logger.error()` com mensagem descritiva
    - _Requisitos: 4.1, 4.2_

  - [ ]* 1.5 Escrever testes unitários para env-validator
    - Criar `tests/unit/utils/env-validator.test.ts`
    - Testar cenário dev (warn) e prod (throw) para cada variável
    - Testar formato correto de ENCRYPTION_KEY (64 hex) e inválido
    - _Requisitos: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 2. Checkpoint Wave 1
  - Executar `npm run build && npm run lint && npx vitest --run`
  - Verificar que todos os testes existentes continuam passando
  - Perguntar ao usuário se há dúvidas

- [ ] 3. Wave 2 — Correções Funcionais (Runtime)
  - [ ] 3.1 Envolver rotas do dashboard com ErrorBoundary
    - Editar `src/app/(dashboard)/layout.tsx`
    - Importar `ErrorBoundary` de `@/components/ui/ErrorBoundary`
    - Wrap `{children}` com `<ErrorBoundary>`
    - Garantir que fallback exibe mensagem amigável + botão "Tentar novamente"
    - _Requisitos: 5.1, 5.2, 5.3_

  - [ ] 3.2 Substituir dangerouslySetInnerHTML por react-markdown
    - Localizar componentes que usam `dangerouslySetInnerHTML` em `src/`
    - Substituir por `<ReactMarkdown remarkPlugins={[remarkGfm]}>`
    - Aplicar classes Tailwind `prose dark:prose-invert` para manter aparência visual
    - _Requisitos: 6.1, 6.2, 6.3_

  - [ ] 3.3 Aplicar paginação no endpoint de artigos
    - Editar `src/app/api/articles/route.ts` (GET handler)
    - Importar `parsePaginationParams`, `createPaginatedResult` de `@/lib/utils/pagination`
    - Aplicar limit (default 20, max 100) + cursor-based por created_at + id
    - Incluir `nextCursor` no response (null quando última página)
    - _Requisitos: 7.1, 7.3, 7.4, 7.5_

  - [ ] 3.4 Aplicar paginação no endpoint de ideias
    - Editar `src/app/api/ideas/route.ts` (GET handler)
    - Mesmo padrão de paginação cursor-based do endpoint de artigos
    - _Requisitos: 7.2, 7.3, 7.4, 7.5_

  - [ ] 3.5 Refatorar scheduler para usar enqueue()
    - Editar `src/lib/pipeline/scheduler.ts`
    - Substituir `PipelineController.execute()` por `PipelineController.enqueue()`
    - Remover try/catch de execução inline (enqueue não bloqueia)
    - Garantir que scheduler completa em < 30s independente de número de blogs
    - _Requisitos: 8.1, 8.2, 8.3_

  - [ ] 3.6 Corrigir Vitest config para excluir E2E
    - Editar `vitest.config.ts`
    - Adicionar `exclude: ['tests/e2e/**', 'node_modules/**']` no bloco `test`
    - Verificar compatibilidade com `npm run test`
    - _Requisitos: 9.1, 9.2, 9.3_

- [ ] 4. Checkpoint Wave 2
  - Executar `npm run build && npm run lint && npx vitest --run`
  - Verificar que todos os testes existentes continuam passando
  - Perguntar ao usuário se há dúvidas

- [ ] 5. Wave 3 — Segurança & Qualidade de Código
  - [ ] 5.1 Integrar PromptSanitizer no PlannerAgent
    - Editar `src/lib/ai/agents/planner.ts`
    - Importar `PromptSanitizer, FIELD_LIMITS` de `@/lib/ai/sanitizer`
    - Sanitizar todos os campos de usuário (nome, nicho, tom, persona, audiência) antes da interpolação
    - Garantir que campo vazio usa placeholder "conteúdo não fornecido"
    - _Requisitos: 10.1, 10.5_

  - [ ] 5.2 Integrar PromptSanitizer no ResearcherAgent
    - Editar `src/lib/ai/agents/researcher.ts`
    - Mesmo padrão de sanitização do PlannerAgent
    - _Requisitos: 10.2, 10.5_

  - [ ] 5.3 Integrar PromptSanitizer no WriterAgent
    - Editar `src/lib/ai/agents/writer.ts`
    - Mesmo padrão de sanitização
    - _Requisitos: 10.3, 10.5_

  - [ ] 5.4 Integrar PromptSanitizer no ReviewerAgent
    - Editar `src/lib/ai/agents/reviewer.ts`
    - Mesmo padrão de sanitização
    - _Requisitos: 10.4, 10.5_

  - [ ] 5.5 Migrar console.log/error restantes para Logger
    - Buscar `console.log` e `console.error` em `src/lib/` (exceto testes)
    - Substituir por `Logger.info()`, `Logger.error()` ou `Logger.debug()` com contexto
    - Criar instância `new Logger('NomeModulo')` onde necessário
    - _Requisitos: 11.1, 11.2, 11.3_

  - [ ] 5.6 Substituir type assertions por tipos Drizzle
    - Editar `src/lib/pipeline/scheduler.ts` — tipar blogs com `InferSelectModel<typeof blogs>`
    - Editar `src/lib/pipeline/controller.ts` — tipar queries com tipos inferidos
    - Remover casts `as Record<string, unknown>` e `as { field: type }`
    - _Requisitos: 12.1, 12.2, 12.3_

  - [ ] 5.7 Adicionar stripAnsi no AuditReporter
    - Editar `tests/e2e/reporters/audit-reporter.ts`
    - Criar função `stripAnsi(str: string): string` com regex `/\x1b\[[0-9;]*m/g`
    - Aplicar em todas as mensagens de erro antes de inserir no markdown
    - _Requisitos: 16.1, 16.2_

- [ ] 6. Checkpoint Wave 3
  - Executar `npm run build && npm run lint && npx vitest --run`
  - Executar `npx tsc --noEmit` para validar tipos Drizzle
  - Perguntar ao usuário se há dúvidas

- [ ] 7. Wave 4 — Testes (E2E Fixes + Property-Based)
  - [ ] 7.1 Corrigir seletor CSS no teste de calendário
    - Editar `tests/e2e/audit/audit-calendar.spec.ts`
    - Substituir `button:has-text(/^\d{1,2}$/)` por `page.locator('button').filter({ hasText: /^\d{1,2}$/ })`
    - Verificar que o teste executa sem erros de parsing
    - _Requisitos: 13.1, 13.2_

  - [ ] 7.2 Corrigir teste de API POST para usar request.post()
    - Editar `tests/e2e/audit/audit-api.spec.ts`
    - Substituir `page.evaluate(fetch)` por `request.post()` da APIRequestContext do Playwright
    - Validar status code sem erros de conectividade
    - _Requisitos: 14.1, 14.2_

  - [ ] 7.3 Investigar e corrigir timeout em /templates
    - Editar `tests/e2e/audit/audit-templates.spec.ts` ou `src/app/(dashboard)/templates/page.tsx`
    - Adicionar loading state adequado se a página requer dados do servidor
    - Garantir carregamento em menos de 30 segundos
    - _Requisitos: 15.1, 15.2_

  - [ ]* 7.4 Property test: Round-trip de criptografia
    - Criar `tests/unit/utils/crypto.property.test.ts`
    - **Property 1: Round-trip de criptografia**
    - Para toda string de input (1-10000 chars), `decrypt(encrypt(input)) === input`
    - Usar `fc.string({ minLength: 1, maxLength: 10000 })`, mínimo 100 runs
    - **Valida: Requisito 17.1**

  - [ ]* 7.5 Property test: Sanitizador remove injection
    - Criar `tests/unit/ai/sanitizer.property.test.ts`
    - **Property 2: Sanitizador remove padrões de injection**
    - Para toda string, output de `sanitize()` não contém nenhum padrão de INJECTION_PATTERNS
    - **Valida: Requisitos 17.2, 10.1-10.4**

  - [ ]* 7.6 Property test: Paginação limita resultados
    - Criar `tests/unit/utils/pagination.property.test.ts`
    - **Property 3: Paginação limita resultados corretamente**
    - Para N itens (0-1000) e limit L (1-200), pageSize ≤ 100 e itens retornados ≤ min(L_capped, N)
    - **Valida: Requisitos 7.1, 7.2, 7.5, 17.3**

  - [ ]* 7.7 Property test: Cost calculator não-negativo e proporcional
    - Criar `tests/unit/ai/cost-calculator.property.test.ts`
    - **Property 5: Cost calculator é não-negativo e proporcional**
    - Para tokens ≥ 0, custo ≥ 0 e dobrar tokens dobra o custo
    - **Valida: Requisito 17.4**

  - [ ]* 7.8 Property test: Rate limiter permite no máximo L requests
    - Criar `tests/unit/utils/rate-limiter.property.test.ts`
    - **Property 6: Rate limiter permite no máximo L requests por janela**
    - Para N requests > L em janela W, exatamente L são permitidos
    - **Valida: Requisito 17.5**

  - [ ]* 7.9 Property test: State machine só alcança estados válidos
    - Criar `tests/unit/pipeline/state-machine.property.test.ts`
    - **Property 7: State machine só alcança estados válidos**
    - Para qualquer sequência de transições válidas, estado final está no conjunto alcançável
    - **Valida: Requisito 17.6**

  - [ ]* 7.10 Property test: Logger sanitiza campos sensíveis
    - Criar `tests/unit/utils/logger.property.test.ts`
    - **Property 8: Logger sanitiza campos sensíveis**
    - Para objeto com campos sensíveis (apikey, password, token, secret), output contém [REDACTED]
    - **Valida: Requisito 17.7**

  - [ ]* 7.11 Property test: Strip ANSI remove sequências de escape
    - Criar `tests/unit/utils/ansi-strip.property.test.ts`
    - **Property 9: Strip ANSI remove todas as sequências de escape**
    - Para string com códigos ANSI, output não contém sequências de escape
    - **Valida: Requisitos 16.1, 16.2**

  - [ ] 7.12 Limpar duplicatas no checklist.md
    - Editar `docs/checklist.md`
    - Remover entradas duplicadas de sprints
    - Marcar Sprints 1-11 como concluídos
    - Manter uma única entrada por sprint
    - _Requisitos: 18.1, 18.2_

- [ ] 8. Checkpoint Final
  - Executar `npm run build && npm run lint && npx vitest --run`
  - Executar `npx tsc --noEmit`
  - Verificar que todos os 171+ unit tests + novos property tests passam
  - Perguntar ao usuário se há dúvidas

## Notes

- Tasks marcadas com `*` são opcionais e podem ser puladas para MVP mais rápido
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental entre ondas
- Property tests validam propriedades universais de corretude (fast-check v4.9)
- Unit tests validam exemplos específicos e edge cases
- Linguagem de implementação: **TypeScript** (mesma do projeto existente)
- Validação entre ondas: `npm run build && npm run lint && npx vitest --run`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "3.1", "3.2", "3.6"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "5.7"] },
    { "id": 5, "tasks": ["5.6"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3", "7.12"] },
    { "id": 7, "tasks": ["7.4", "7.5", "7.6", "7.7", "7.8", "7.9", "7.10", "7.11"] }
  ]
}
```
