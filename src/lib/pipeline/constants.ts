/**
 * Pipeline constants shared between client and server.
 * This file MUST NOT import any server-only modules.
 */

export type ArticleStatus =
  | 'idea'
  | 'planning'
  | 'researching'
  | 'writing'
  | 'reviewing'
  | 'revision'
  | 'ready'
  | 'published'
  | 'archived'

export interface BlogConfig {
  name: string
  niche: string
  toneOfVoice: string | null
  authorPersona: string | null
  targetAudience: string | null
  keywords: string[]
  contentLanguage: string
}

export interface AdvanceRequest {
  title: string
  contentMarkdown: string
  metaDescription?: string
}

export interface AdvanceResponse {
  articleId: string
  previousStatus: ArticleStatus
  newStatus: ArticleStatus
  targetStage: 'planning' | 'researching' | 'writing' | 'reviewing'
  message: string
}

export const ADVANCE_MAP: Record<string, { nextStatus: ArticleStatus; agent: string }> = {
  idea: { nextStatus: 'planning', agent: 'planner' },
  planning: { nextStatus: 'researching', agent: 'researcher' },
  researching: { nextStatus: 'writing', agent: 'writer' },
  writing: { nextStatus: 'reviewing', agent: 'reviewer' },
}

export const STAGE_LABELS: Record<string, string> = {
  idea: 'Salvar & Avançar para Planejamento',
  planning: 'Salvar & Avançar para Pesquisa',
  researching: 'Salvar & Avançar para Escrita',
  writing: 'Salvar & Avançar para Revisão',
}
