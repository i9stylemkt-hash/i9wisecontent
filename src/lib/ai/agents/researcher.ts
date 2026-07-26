import { z } from 'zod'
import { AIRouter } from '@/lib/ai/router'
import type { ResearcherInput, ResearcherOutput } from './types'

const researcherOutputSchema = z.object({
  briefing: z.string(),
  keyPoints: z.array(z.string()),
  references: z.array(z.string()),
  dataPoints: z.array(z.string()),
})

export class ResearcherAgent {
  static async execute(input: ResearcherInput): Promise<ResearcherOutput> {
    const system = `Você é um pesquisador de conteúdo especializado em ${input.blogConfig.niche}.
Seu papel é pesquisar informações, dados e referências para um artigo.
Gere um briefing completo que permita a um escritor criar conteúdo de alta qualidade.

Blog: ${input.blogConfig.name}
Tom: ${input.blogConfig.toneOfVoice || 'profissional'}
Público: ${input.blogConfig.targetAudience || 'público geral'}
Idioma: ${input.blogConfig.contentLanguage}

Retorne: briefing detalhado, key points, referências e dados relevantes.`

    const prompt = `Pesquise e compile informações para um artigo sobre: "${input.topic}"
${input.angle ? `Ângulo/abordagem: ${input.angle}` : ''}

Compile um briefing completo com:
1. Resumo executivo do que cobrir
2. Pontos-chave a abordar
3. Referências e fontes
4. Dados, estatísticas ou exemplos relevantes`

    const result = await AIRouter.generateObject({
      agentType: 'researcher',
      system,
      prompt,
      schema: researcherOutputSchema,
    })

    return result.object
  }
}
