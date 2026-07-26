import { z } from 'zod'
import { IDEA_PRIORITIES, IDEA_STATUSES } from '@/lib/utils/constants'

export const createIdeaSchema = z.object({
  blogId: z.string().uuid(),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(200),
  description: z.string().max(1000).optional(),
  references: z.array(z.string()).optional(),
  priority: z.enum(IDEA_PRIORITIES).default('medium'),
  status: z.enum(IDEA_STATUSES).default('backlog'),
  tags: z.array(z.string()).optional(),
  source: z.string().max(100).optional(),
})

export const updateIdeaSchema = createIdeaSchema.partial().omit({ blogId: true })

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>
