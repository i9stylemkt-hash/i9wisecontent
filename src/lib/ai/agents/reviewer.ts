import { z } from 'zod'
import { AIRouter } from '@/lib/ai/router'
import { PromptSanitizer, FIELD_LIMITS } from '@/lib/ai/sanitizer'
import type { ReviewerInput, ReviewerOutput } from './types'

const reviewerOutputSchema = z.object({
  overallScore: z.number().min(0).max(10),
  scores: z.object({
    grammar: z.number().min(0).max(10),
    coherence: z.number().min(0).max(10),
    toneAdherence: z.number().min(0).max(10),
    seo: z.number().min(0).max(10),
    originality: z.number().min(0).max(10),
    readability: z.number().min(0).max(10),
  }),
  approved: z.boolean(),
  feedback: z.string(),
  suggestions: z.array(z.string()),
})

export class ReviewerAgent {
  static async execute(input: ReviewerInput): Promise<ReviewerOutput> {
    // Sanitize user-provided fields before prompt interpolation
    const safeName = PromptSanitizer.sanitize(input.blogConfig.name, { maxLength: FIELD_LIMITS.title })
    const safeNiche = PromptSanitizer.sanitize(input.blogConfig.niche, { maxLength: FIELD_LIMITS.description })
    const safeTone = PromptSanitizer.sanitize(input.blogConfig.toneOfVoice ?? '', { maxLength: FIELD_LIMITS.persona })
    const safeAudience = PromptSanitizer.sanitize(input.blogConfig.targetAudience ?? '', { maxLength: FIELD_LIMITS.persona })
    const safeTitle = PromptSanitizer.sanitize(input.article.title, { maxLength: FIELD_LIMITS.title })
    const safeContent = PromptSanitizer.sanitize(input.article.content, { maxLength: FIELD_LIMITS.default })

    const system = `Você é um editor-chefe e revisor de conteúdo especializado.
Seu papel é avaliar a qualidade de artigos de blog e fornecer scores detalhados.

Blog: ${safeName}
Nicho: ${safeNiche}
Tom esperado: ${safeTone || 'profissional'}
Público: ${safeAudience || 'público geral'}
Threshold mínimo: ${input.qualityThreshold}/10

Critérios de avaliação (0-10 cada):
1. Gramática — correção gramatical e ortográfica
2. Coerência — fluxo lógico, argumentação, transições
3. Tom — aderência ao tom de voz configurado
4. SEO — uso de keywords, estrutura de headings, meta
5. Originalidade — abordagem única, não genérica
6. Legibilidade — clareza, parágrafos curtos, escaneabilidade

approved = true se overall_score >= ${input.qualityThreshold}`

    const prompt = `Revise o seguinte artigo:

Título: ${safeTitle}

Conteúdo:
${safeContent}

Forneça scores detalhados, feedback geral e sugestões de melhoria.`

    const result = await AIRouter.generateObject({
      agentType: 'reviewer',
      system,
      prompt,
      schema: reviewerOutputSchema,
    })

    return result.object
  }
}
