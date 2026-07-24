export const APP_NAME = 'i9 Wise Content'
export const APP_DESCRIPTION = 'Plataforma de criação automatizada de conteúdo para blogs com agentes de IA'

export const ARTICLE_STATUSES = [
  'idea',
  'planning',
  'researching',
  'writing',
  'reviewing',
  'revision',
  'ready',
  'published',
  'archived',
] as const

export const PIPELINE_STATUSES = [
  'queued',
  'running',
  'awaiting_approval',
  'completed',
  'failed',
  'cancelled',
] as const

export const PIPELINE_STAGES = [
  'planning',
  'research',
  'generation',
  'review',
  'completed',
] as const

export const AGENT_TYPES = ['planner', 'researcher', 'writer', 'reviewer'] as const

export const AI_PROVIDERS = ['google', 'anthropic', 'groq', 'openrouter'] as const

export const IDEA_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export const IDEA_STATUSES = ['backlog', 'approved', 'in_progress', 'done', 'discarded'] as const

export const PUBLICATION_FREQUENCIES = [
  'daily',
  'twice_weekly',
  'weekly',
  'biweekly',
  'monthly',
] as const

export const AUTOMATION_LEVELS = [
  'full_auto',
  'approve_final',
  'approve_each_step',
  'manual_trigger',
] as const

export const MAX_BLOGS_FREE = 3
export const MAX_ARTICLES_PER_BLOG = 100
export const MAX_PIPELINE_RETRIES = 3
export const DEFAULT_QUALITY_THRESHOLD = 7
