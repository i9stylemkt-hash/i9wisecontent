/**
 * Re-export dos tipos inferidos do schema Drizzle.
 * Usar estes tipos ao invés de `Record<string, unknown>` ou type assertions.
 *
 * SelectType (sem prefixo "New") = tipo para dados lidos do banco
 * InsertType (prefixo "New") = tipo para inserção de dados
 *
 * Gerar/atualizar tipos: npm run generate-types
 */

export type {
  // Blogs
  Blog,
  NewBlog,
  // Articles
  Article,
  NewArticle,
  // Ideas
  Idea,
  NewIdea,
  // Pipeline Runs
  PipelineRun,
  NewPipelineRun,
  // Agent Logs
  AgentLog,
  NewAgentLog,
  // Templates
  Template,
  NewTemplate,
  // Prompts
  Prompt,
  NewPrompt,
  // API Keys
  ApiKey,
  NewApiKey,
  // Cost Metrics
  CostMetric,
  NewCostMetric,
  // Tags
  Tag,
  NewTag,
  // Article Notes
  ArticleNote,
  NewArticleNote,
  // Cron Jobs
  CronJob,
  NewCronJob,
} from './schema'
