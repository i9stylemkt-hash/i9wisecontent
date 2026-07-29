import { z } from 'zod'

// Helper: transform empty string to undefined for optional fields
const optionalString = (maxLen: number, message: string) =>
  z.string().max(maxLen, message).transform(v => v === '' ? undefined : v).optional()

export const createBlogSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200, 'Nome não pode exceder 200 caracteres'),
  niche: z.string().min(2, 'Nicho é obrigatório').max(300, 'Nicho não pode exceder 300 caracteres'),
  description: optionalString(2000, 'Descrição não pode exceder 2000 caracteres'),
  toneOfVoice: optionalString(500, 'Tom de voz não pode exceder 500 caracteres'),
  authorPersona: optionalString(500, 'Persona não pode exceder 500 caracteres'),
  targetAudience: optionalString(500, 'Público-alvo não pode exceder 500 caracteres'),
  keywords: z.array(z.string().max(100)).max(30).optional().default([]),
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
