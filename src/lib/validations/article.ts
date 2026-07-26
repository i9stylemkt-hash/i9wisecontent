import { z } from 'zod'
import { ARTICLE_STATUSES } from '@/lib/utils/constants'

export const createArticleSchema = z.object({
  blogId: z.string().uuid(),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(200),
  metaDescription: z.string().max(160).optional(),
  contentMarkdown: z.string().optional(),
  summary: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(ARTICLE_STATUSES).default('idea'),
  scheduledDate: z.string().optional(),
})

export const updateArticleSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  metaDescription: z.string().max(160).optional(),
  contentMarkdown: z.string().optional(),
  summary: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(ARTICLE_STATUSES).optional(),
  scheduledDate: z.string().nullable().optional(),
  qualityScore: z.number().min(0).max(10).optional(),
})

export type CreateArticleInput = z.infer<typeof createArticleSchema>
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>

/** Transições de status válidas */
export const validStatusTransitions: Record<string, string[]> = {
  idea: ['planning', 'archived'],
  planning: ['researching', 'idea', 'archived'],
  researching: ['writing', 'planning', 'archived'],
  writing: ['reviewing', 'researching', 'archived'],
  reviewing: ['ready', 'revision', 'archived'],
  revision: ['writing', 'archived'],
  ready: ['published', 'reviewing', 'archived'],
  published: ['archived'],
  archived: ['idea'],
}

export function isValidTransition(currentStatus: string, newStatus: string): boolean {
  const allowed = validStatusTransitions[currentStatus]
  if (!allowed) return false
  return allowed.includes(newStatus)
}
