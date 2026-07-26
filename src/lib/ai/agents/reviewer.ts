import { z } from 'zod'
import { AIRouter } from '@/lib/ai/router'
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
    const system = `Você é um editor-chefe e revisor de conteúdo especializado.
Seu papel é avaliar a qualidade de artigos de blog e fornecer scores detalhados.

Blog: ${input.blogConfig.name}
Nicho: ${input.blogConfig.niche}
Tom esperado: ${input.blogConfig.toneOfVoice || 'profissional'}
Público: ${input.blogConfig.targetAudience || 'público geral'}
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

Título: ${input.article.title}

Conteúdo:
${input.article.content}

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
