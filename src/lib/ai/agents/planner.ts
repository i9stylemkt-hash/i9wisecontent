import { z } from 'zod'
import { AIRouter } from '@/lib/ai/router'
import { PromptSanitizer, FIELD_LIMITS } from '@/lib/ai/sanitizer'
import type { PlannerInput, PlannerOutput } from './types'

const plannerOutputSchema = z.object({
  title: z.string().describe('Título principal do artigo'),
  titleSuggestions: z.array(z.string()).min(3).max(5).describe('3-5 títulos alternativos'),
  angle: z.string().describe('Ângulo/abordagem diferenciada'),
  outline: z.array(z.string()).describe('Seções do artigo em ordem'),
  targetKeywords: z.array(z.string()).describe('Keywords SEO alvo'),
  estimatedWordCount: z.number().describe('Tamanho estimado em palavras'),
  contentType: z.string().describe('Tipo: tutorial|listicle|how-to|opinion|case-study|review'),
  targetAudienceSegment: z.string().describe('Segmento específico do público'),
})

export class PlannerAgent {
  static async execute(input: PlannerInput): Promise<PlannerOutput> {
    const { blogConfig } = input

    // Sanitize user-provided fields before prompt interpolation
    const safeName = PromptSanitizer.sanitize(blogConfig.name, { maxLength: FIELD_LIMITS.title })
    const safeNiche = PromptSanitizer.sanitize(blogConfig.niche, { maxLength: FIELD_LIMITS.description })
    const safeTone = PromptSanitizer.sanitize(blogConfig.toneOfVoice ?? '', { maxLength: FIELD_LIMITS.persona })
    const safePersona = PromptSanitizer.sanitize(blogConfig.authorPersona ?? '', { maxLength: FIELD_LIMITS.persona })
    const safeAudience = PromptSanitizer.sanitize(blogConfig.targetAudience ?? '', { maxLength: FIELD_LIMITS.persona })
    const safeKeywords = PromptSanitizer.sanitize((blogConfig.keywords ?? []).slice(0, 10).join(', '), { maxLength: FIELD_LIMITS.keywords })
    const safeIdeaTitle = PromptSanitizer.sanitize(input.ideaTitle ?? '', { maxLength: FIELD_LIMITS.title })

    // System prompt otimizado para Groq (conciso, direto, reduz tokens)
    const system = `Estrategista de conteúdo SEO. Crie planos de artigos relevantes e atraentes.

Contexto:
- Blog: ${safeName} | Nicho: ${safeNiche}
- Tom: ${safeTone || 'profissional e acessível'}
- Persona: ${safePersona || 'especialista'}
- Público: ${safeAudience || 'público geral'}
- Keywords: ${safeKeywords || 'a definir'}
- Idioma: ${blogConfig.contentLanguage}

Diretrizes:
1. Título magnético com keyword principal
2. Ângulo único que diferencia de concorrentes
3. Outline com 5-8 seções progressivas
4. Keywords long-tail de baixa competição
5. Estimativa realista de palavras (1000-3000)`

    const prompt = safeIdeaTitle
      ? `Planeje artigo: "${safeIdeaTitle}"${input.existingTopics?.length ? `\nEvitar: ${input.existingTopics.slice(0, 5).join(', ')}` : ''}`
      : `Sugira artigo para "${safeNiche}". Keywords: ${safeKeywords}${input.existingTopics?.length ? `\nEvitar: ${input.existingTopics.slice(0, 5).join(', ')}` : ''}`

    const result = await AIRouter.generateObject({
      agentType: 'planner',
      system,
      prompt,
      schema: plannerOutputSchema,
    })

    return result.object
  }
}
