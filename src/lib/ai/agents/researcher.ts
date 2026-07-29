import { z } from 'zod'
import { AIRouter } from '@/lib/ai/router'
import { PromptSanitizer, FIELD_LIMITS } from '@/lib/ai/sanitizer'
import type { ResearcherInput, ResearcherOutput } from './types'

const researcherOutputSchema = z.object({
  briefing: z.string(),
  keyPoints: z.array(z.string()),
  references: z.array(z.string()),
  dataPoints: z.array(z.string()),
  statistics: z.array(z.string()),
  competitorInsights: z.array(z.string()),
  enrichedOutline: z.array(z.string()),
})

export class ResearcherAgent {
  static async execute(input: ResearcherInput): Promise<ResearcherOutput> {
    const { blogConfig } = input

    // Sanitize user-provided fields before prompt interpolation
    const safeName = PromptSanitizer.sanitize(blogConfig.name, { maxLength: FIELD_LIMITS.title })
    const safeNiche = PromptSanitizer.sanitize(blogConfig.niche, { maxLength: FIELD_LIMITS.description })
    const safeTone = PromptSanitizer.sanitize(blogConfig.toneOfVoice ?? '', { maxLength: FIELD_LIMITS.persona })
    const safePersona = PromptSanitizer.sanitize(blogConfig.authorPersona ?? '', { maxLength: FIELD_LIMITS.persona })
    const safeAudience = PromptSanitizer.sanitize(blogConfig.targetAudience ?? '', { maxLength: FIELD_LIMITS.persona })
    const safeKeywords = PromptSanitizer.sanitize((blogConfig.keywords ?? []).join(', '), { maxLength: FIELD_LIMITS.keywords })
    const safeTopic = PromptSanitizer.sanitize(input.topic, { maxLength: FIELD_LIMITS.title })
    const safeAngle = PromptSanitizer.sanitize(input.angle ?? '', { maxLength: FIELD_LIMITS.description })

    const system = `Você é um pesquisador de conteúdo especializado em ${safeNiche}.
Seu papel é pesquisar informações, dados e referências para um artigo.
Gere um briefing completo que permita a um escritor criar conteúdo de alta qualidade.

Blog: ${safeName}
Nicho: ${safeNiche}
Tom: ${safeTone || 'profissional'}
Persona: ${safePersona || 'especialista'}
Público: ${safeAudience || 'público geral'}
Keywords: ${safeKeywords || 'não definidas'}
Idioma: ${blogConfig.contentLanguage}

Retorne:
- briefing: resumo executivo completo para o escritor
- keyPoints: pontos-chave a abordar no artigo
- references: fontes e referências relevantes
- dataPoints: dados e exemplos práticos
- statistics: estatísticas e números relevantes
- competitorInsights: análise de como concorrentes cobrem o tema
- enrichedOutline: sugestão de outline enriquecido com os insights da pesquisa`

    const prompt = `Pesquise e compile informações para um artigo sobre: "${safeTopic}"
${safeAngle ? `Ângulo/abordagem: ${safeAngle}` : ''}

Compile um briefing completo com:
1. Resumo executivo do que cobrir
2. Pontos-chave a abordar
3. Referências e fontes
4. Dados, estatísticas ou exemplos relevantes
5. Estatísticas numéricas atuais
6. Como concorrentes abordam este tema
7. Outline enriquecido com sugestões baseadas na pesquisa`

    const result = await AIRouter.generateObject({
      agentType: 'researcher',
      system,
      prompt,
      schema: researcherOutputSchema,
    })

    return result.object
  }
}
