import { z } from 'zod'
import { AIRouter } from '@/lib/ai/router'
import type { PlannerInput, PlannerOutput } from './types'

const plannerOutputSchema = z.object({
  title: z.string(),
  angle: z.string(),
  outline: z.array(z.string()),
  targetKeywords: z.array(z.string()),
  estimatedWordCount: z.number(),
})

export class PlannerAgent {
  static async execute(input: PlannerInput): Promise<PlannerOutput> {
    const system = `Você é um estrategista de conteúdo especializado em planejamento editorial.
Seu papel é criar planos de artigos que são relevantes, atraentes e otimizados para SEO.

Blog: ${input.blogConfig.name}
Nicho: ${input.blogConfig.niche}
Tom de voz: ${input.blogConfig.toneOfVoice || 'profissional e acessível'}
Público-alvo: ${input.blogConfig.targetAudience || 'público geral'}
Idioma: ${input.blogConfig.contentLanguage}

Retorne um plano estruturado com título, ângulo, outline, keywords e word count estimado.`

    const prompt = input.ideaTitle
      ? `Crie um plano de artigo sobre: "${input.ideaTitle}"
${input.existingTopics?.length ? `\nTemas já cobertos (evitar repetição): ${input.existingTopics.join(', ')}` : ''}`
      : `Sugira e planeje um artigo relevante para o nicho "${input.blogConfig.niche}".
Keywords do blog: ${input.blogConfig.keywords.join(', ')}
${input.existingTopics?.length ? `Temas já cobertos: ${input.existingTopics.join(', ')}` : ''}`

    const result = await AIRouter.generateObject({
      agentType: 'planner',
      system,
      prompt,
      schema: plannerOutputSchema,
    })

    return result.object
  }
}
