import { z } from 'zod'

export const createBlogSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  niche: z.string().min(2, 'Nicho é obrigatório').max(100),
  description: z.string().max(500).optional(),
  toneOfVoice: z.string().max(200).optional(),
  authorPersona: z.string().max(200).optional(),
  targetAudience: z.string().max(200).optional(),
  keywords: z.array(z.string().max(50)).max(20).optional(),
  contentLanguage: z.string().default('pt-BR'),
  publicationFrequency: z.enum(['daily', 'twice_weekly', 'weekly', 'biweekly', 'monthly']).default('weekly'),
  automationLevel: z.enum(['full_auto', 'approve_final', 'approve_each_step', 'manual_trigger']).default('approve_final'),
  contentTypes: z.any().optional(),
  qualityThreshold: z.number().min(1).max(10).default(7),
  humanReviewRequired: z.boolean().default(true),
  seoConfig: z.any().optional(),
})

export const updateBlogSchema = createBlogSchema.partial()

export type CreateBlogInput = z.infer<typeof createBlogSchema>
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>
