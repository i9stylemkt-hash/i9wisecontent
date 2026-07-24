import type {
  ARTICLE_STATUSES,
  PIPELINE_STATUSES,
  PIPELINE_STAGES,
  AGENT_TYPES,
  AI_PROVIDERS,
  IDEA_PRIORITIES,
  IDEA_STATUSES,
  PUBLICATION_FREQUENCIES,
  AUTOMATION_LEVELS,
} from '@/lib/utils/constants'

// Enums
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number]
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number]
export type PipelineStage = (typeof PIPELINE_STAGES)[number]
export type AgentType = (typeof AGENT_TYPES)[number]
export type AIProvider = (typeof AI_PROVIDERS)[number]
export type IdeaPriority = (typeof IDEA_PRIORITIES)[number]
export type IdeaStatus = (typeof IDEA_STATUSES)[number]
export type PublicationFrequency = (typeof PUBLICATION_FREQUENCIES)[number]
export type AutomationLevel = (typeof AUTOMATION_LEVELS)[number]

// Entidades
export interface Blog {
  id: string
  user_id: string
  name: string
  slug: string
  niche: string
  description: string | null
  tone_of_voice: string
  author_persona: string | null
  target_audience: string | null
  keywords: string[]
  content_language: string
  publication_frequency: PublicationFrequency
  automation_level: AutomationLevel
  content_types: Record<string, unknown>
  is_active: boolean
  quality_threshold: number
  human_review_required: boolean
  seo_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Article {
  id: string
  blog_id: string
  pipeline_run_id: string | null
  title: string
  slug: string | null
  meta_description: string | null
  content_markdown: string | null
  content_html: string | null
  summary: string | null
  tags: string[]
  status: ArticleStatus
  quality_score: number | null
  seo_score: Record<string, unknown> | null
  scoring_details: Record<string, unknown> | null
  scheduled_date: string | null
  published_date: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Idea {
  id: string
  blog_id: string
  title: string
  description: string | null
  references: string[]
  priority: IdeaPriority
  status: IdeaStatus
  tags: string[]
  source: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PipelineRun {
  id: string
  blog_id: string
  article_id: string | null
  idea_id: string | null
  status: PipelineStatus
  current_stage: PipelineStage | null
  stages_completed: Record<string, unknown>
  stages_data: Record<string, unknown>
  retry_count: number
  error_message: string | null
  total_tokens_used: number
  total_cost: number
  duration_ms: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface AgentLog {
  id: string
  pipeline_run_id: string
  agent_type: AgentType
  model_used: string
  provider: AIProvider
  input_data: Record<string, unknown>
  output_data: Record<string, unknown>
  tokens_input: number
  tokens_output: number
  cost: number
  duration_ms: number
  status: string
  error_message: string | null
  prompt_id: string | null
  created_at: string
}

export interface Template {
  id: string
  user_id: string
  name: string
  description: string | null
  structure: string
  sections: Record<string, unknown>
  content_type: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Prompt {
  id: string
  user_id: string
  name: string
  description: string | null
  content: string
  agent_type: AgentType
  tags: string[]
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: string
  user_id: string
  provider: AIProvider
  key_encrypted: string
  key_alias: string
  is_active: boolean
  usage_count: number
  total_cost: number
  last_used_at: string | null
  rate_limit_info: Record<string, unknown>
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    message: string
    code: string
    details?: unknown
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError
