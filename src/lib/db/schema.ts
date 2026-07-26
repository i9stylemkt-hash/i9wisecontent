import { pgTable, pgEnum, uuid, text, timestamp, boolean, integer, decimal, jsonb, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================
// ENUMS
// ============================================

export const articleStatusEnum = pgEnum('article_status', [
  'idea',
  'planning',
  'researching',
  'writing',
  'reviewing',
  'revision',
  'ready',
  'published',
  'archived',
])

export const pipelineStatusEnum = pgEnum('pipeline_status', [
  'queued',
  'running',
  'awaiting_approval',
  'completed',
  'failed',
  'cancelled',
])

export const pipelineStageEnum = pgEnum('pipeline_stage', [
  'planning',
  'research',
  'generation',
  'review',
  'completed',
])

export const agentTypeEnum = pgEnum('agent_type', [
  'planner',
  'researcher',
  'writer',
  'reviewer',
])

export const ideaPriorityEnum = pgEnum('idea_priority', [
  'low',
  'medium',
  'high',
  'urgent',
])

export const ideaStatusEnum = pgEnum('idea_status', [
  'backlog',
  'approved',
  'in_progress',
  'done',
  'discarded',
])

export const publicationFrequencyEnum = pgEnum('publication_frequency', [
  'daily',
  'twice_weekly',
  'weekly',
  'biweekly',
  'monthly',
])

export const automationLevelEnum = pgEnum('automation_level', [
  'full_auto',
  'approve_final',
  'approve_each_step',
  'manual_trigger',
])

// ============================================
// TABLES
// ============================================

/** Blogs — Configuração completa de cada blog gerenciado */
export const blogs = pgTable('blogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  niche: text('niche').notNull(),
  description: text('description'),
  toneOfVoice: text('tone_of_voice'),
  authorPersona: text('author_persona'),
  targetAudience: text('target_audience'),
  keywords: text('keywords').array(),
  contentLanguage: text('content_language').notNull().default('pt-BR'),
  publicationFrequency: publicationFrequencyEnum('publication_frequency').notNull().default('weekly'),
  automationLevel: automationLevelEnum('automation_level').notNull().default('approve_final'),
  contentTypes: jsonb('content_types'),
  isActive: boolean('is_active').notNull().default(true),
  qualityThreshold: integer('quality_threshold').notNull().default(7),
  humanReviewRequired: boolean('human_review_required').notNull().default(true),
  seoConfig: jsonb('seo_config'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Articles — Artigos em qualquer estágio do pipeline */
export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  blogId: uuid('blog_id').notNull().references(() => blogs.id, { onDelete: 'cascade' }),
  pipelineRunId: uuid('pipeline_run_id'),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  metaDescription: text('meta_description'),
  contentMarkdown: text('content_markdown'),
  contentHtml: text('content_html'),
  summary: text('summary'),
  tags: text('tags').array(),
  status: articleStatusEnum('status').notNull().default('idea'),
  qualityScore: integer('quality_score'),
  seoScore: jsonb('seo_score'),
  scoringDetails: jsonb('scoring_details'),
  scheduledDate: text('scheduled_date'),
  publishedDate: text('published_date'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Ideas — Banco de ideias para temas de artigos */
export const ideas = pgTable('ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  blogId: uuid('blog_id').notNull().references(() => blogs.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  references: text('references').array(),
  priority: ideaPriorityEnum('priority').notNull().default('medium'),
  status: ideaStatusEnum('status').notNull().default('backlog'),
  tags: text('tags').array(),
  source: text('source'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Pipeline Runs — Execuções do pipeline editorial */
export const pipelineRuns = pgTable('pipeline_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  blogId: uuid('blog_id').notNull().references(() => blogs.id, { onDelete: 'cascade' }),
  articleId: uuid('article_id').references(() => articles.id, { onDelete: 'set null' }),
  ideaId: uuid('idea_id').references(() => ideas.id, { onDelete: 'set null' }),
  status: pipelineStatusEnum('status').notNull().default('queued'),
  currentStage: pipelineStageEnum('current_stage'),
  stagesCompleted: jsonb('stages_completed'),
  stagesData: jsonb('stages_data'),
  retryCount: integer('retry_count').notNull().default(0),
  errorMessage: text('error_message'),
  totalTokensUsed: integer('total_tokens_used').default(0),
  totalCost: decimal('total_cost', { precision: 10, scale: 6 }).default('0'),
  durationMs: integer('duration_ms'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Agent Logs — Log detalhado de cada execução de agente */
export const agentLogs = pgTable('agent_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipelineRunId: uuid('pipeline_run_id').notNull().references(() => pipelineRuns.id, { onDelete: 'cascade' }),
  agentType: agentTypeEnum('agent_type').notNull(),
  modelUsed: text('model_used').notNull(),
  provider: text('provider').notNull(),
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),
  tokensInput: integer('tokens_input').default(0),
  tokensOutput: integer('tokens_output').default(0),
  cost: decimal('cost', { precision: 10, scale: 6 }).default('0'),
  durationMs: integer('duration_ms'),
  status: text('status').notNull().default('running'),
  errorMessage: text('error_message'),
  promptId: uuid('prompt_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Templates — Templates de estrutura de artigo */
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  structure: text('structure'),
  sections: jsonb('sections'),
  contentType: text('content_type'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Blog Templates — Relação N:N entre blogs e templates */
export const blogTemplates = pgTable('blog_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  blogId: uuid('blog_id').notNull().references(() => blogs.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Prompts — Biblioteca de prompts reutilizáveis */
export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  content: text('content').notNull(),
  agentType: agentTypeEnum('agent_type'),
  tags: text('tags').array(),
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** API Keys — Chaves de API encriptadas */
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  provider: text('provider').notNull(),
  keyEncrypted: text('key_encrypted').notNull(),
  keyAlias: text('key_alias'),
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  totalCost: decimal('total_cost', { precision: 10, scale: 6 }).default('0'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  rateLimitInfo: jsonb('rate_limit_info'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Cost Metrics — Registro de custo por execução */
export const costMetrics = pgTable('cost_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  pipelineRunId: uuid('pipeline_run_id').references(() => pipelineRuns.id, { onDelete: 'cascade' }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  agentType: agentTypeEnum('agent_type'),
  tokensInput: integer('tokens_input').default(0),
  tokensOutput: integer('tokens_output').default(0),
  costUsd: decimal('cost_usd', { precision: 10, scale: 6 }).default('0'),
  costBrl: decimal('cost_brl', { precision: 10, scale: 6 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Tags — Tags para organização */
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Article Tags — Relação N:N artigos ↔ tags */
export const articleTags = pgTable('article_tags', {
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.articleId, t.tagId] })])

/** Article Notes — Notas do usuário nos artigos */
export const articleNotes = pgTable('article_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Cron Jobs — Tarefas agendadas por blog */
export const cronJobs = pgTable('cron_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  blogId: uuid('blog_id').notNull().references(() => blogs.id, { onDelete: 'cascade' }),
  schedule: text('schedule').notNull(),
  jobType: text('job_type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ============================================
// RELATIONS
// ============================================

export const blogsRelations = relations(blogs, ({ many }) => ({
  articles: many(articles),
  ideas: many(ideas),
  pipelineRuns: many(pipelineRuns),
  blogTemplates: many(blogTemplates),
  cronJobs: many(cronJobs),
}))

export const articlesRelations = relations(articles, ({ one, many }) => ({
  blog: one(blogs, { fields: [articles.blogId], references: [blogs.id] }),
  pipelineRun: one(pipelineRuns, { fields: [articles.pipelineRunId], references: [pipelineRuns.id] }),
  articleTags: many(articleTags),
  articleNotes: many(articleNotes),
}))

export const ideasRelations = relations(ideas, ({ one }) => ({
  blog: one(blogs, { fields: [ideas.blogId], references: [blogs.id] }),
}))

export const pipelineRunsRelations = relations(pipelineRuns, ({ one, many }) => ({
  blog: one(blogs, { fields: [pipelineRuns.blogId], references: [blogs.id] }),
  article: one(articles, { fields: [pipelineRuns.articleId], references: [articles.id] }),
  idea: one(ideas, { fields: [pipelineRuns.ideaId], references: [ideas.id] }),
  agentLogs: many(agentLogs),
  costMetrics: many(costMetrics),
}))

export const agentLogsRelations = relations(agentLogs, ({ one }) => ({
  pipelineRun: one(pipelineRuns, { fields: [agentLogs.pipelineRunId], references: [pipelineRuns.id] }),
}))

export const templatesRelations = relations(templates, ({ many }) => ({
  blogTemplates: many(blogTemplates),
}))

export const blogTemplatesRelations = relations(blogTemplates, ({ one }) => ({
  blog: one(blogs, { fields: [blogTemplates.blogId], references: [blogs.id] }),
  template: one(templates, { fields: [blogTemplates.templateId], references: [templates.id] }),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  articleTags: many(articleTags),
}))

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, { fields: [articleTags.articleId], references: [articles.id] }),
  tag: one(tags, { fields: [articleTags.tagId], references: [tags.id] }),
}))

export const articleNotesRelations = relations(articleNotes, ({ one }) => ({
  article: one(articles, { fields: [articleNotes.articleId], references: [articles.id] }),
}))

export const cronJobsRelations = relations(cronJobs, ({ one }) => ({
  blog: one(blogs, { fields: [cronJobs.blogId], references: [blogs.id] }),
}))

// ============================================
// TYPE EXPORTS
// ============================================

export type Blog = typeof blogs.$inferSelect
export type NewBlog = typeof blogs.$inferInsert
export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
export type Idea = typeof ideas.$inferSelect
export type NewIdea = typeof ideas.$inferInsert
export type PipelineRun = typeof pipelineRuns.$inferSelect
export type NewPipelineRun = typeof pipelineRuns.$inferInsert
export type AgentLog = typeof agentLogs.$inferSelect
export type NewAgentLog = typeof agentLogs.$inferInsert
export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
export type Prompt = typeof prompts.$inferSelect
export type NewPrompt = typeof prompts.$inferInsert
export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
export type CostMetric = typeof costMetrics.$inferSelect
export type NewCostMetric = typeof costMetrics.$inferInsert
export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
export type ArticleNote = typeof articleNotes.$inferSelect
export type NewArticleNote = typeof articleNotes.$inferInsert
export type CronJob = typeof cronJobs.$inferSelect
export type NewCronJob = typeof cronJobs.$inferInsert
