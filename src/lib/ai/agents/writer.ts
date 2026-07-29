import { AIRouter } from '@/lib/ai/router'
import { PromptSanitizer, FIELD_LIMITS } from '@/lib/ai/sanitizer'
import type { WriterInput, WriterOutput } from './types'

export class WriterAgent {
  static async execute(input: WriterInput): Promise<WriterOutput> {
    // Sanitize user-provided fields before prompt interpolation
    const safeName = PromptSanitizer.sanitize(input.blogConfig.name, { maxLength: FIELD_LIMITS.title })
    const safeNiche = PromptSanitizer.sanitize(input.blogConfig.niche, { maxLength: FIELD_LIMITS.description })
    const safeTone = PromptSanitizer.sanitize(input.blogConfig.toneOfVoice ?? '', { maxLength: FIELD_LIMITS.persona })
    const safePersona = PromptSanitizer.sanitize(input.blogConfig.authorPersona ?? '', { maxLength: FIELD_LIMITS.persona })
    const safeAudience = PromptSanitizer.sanitize(input.blogConfig.targetAudience ?? '', { maxLength: FIELD_LIMITS.persona })
    const safeTopic = PromptSanitizer.sanitize(input.topic, { maxLength: FIELD_LIMITS.title })
    const safeBriefing = PromptSanitizer.sanitize(input.briefing, { maxLength: FIELD_LIMITS.default })

    const system = `Você é um escritor de conteúdo especializado em ${safeNiche}.
Seu papel é criar artigos completos, de alta qualidade, prontos para publicação.

Blog: ${safeName}
Tom de voz: ${safeTone || 'profissional e acessível'}
Persona: ${safePersona || 'especialista no tema'}
Público: ${safeAudience || 'público geral'}
Idioma: ${input.blogConfig.contentLanguage}

Regras:
- Escreva em Markdown
- Use headings (##, ###) para estruturar
- Parágrafos curtos (máx 3-4 frases)
- Inclua exemplos práticos quando possível
- Otimize para SEO naturalmente
- Extensão alvo: ${input.targetWordCount || 1500} palavras`

    const prompt = `Escreva um artigo completo sobre: "${safeTopic}"

Briefing de pesquisa:
${safeBriefing}

${input.template ? `Siga esta estrutura:\n${input.template}` : ''}

Retorne:
1. O artigo completo em Markdown (depois de "ARTIGO:")
2. Uma meta description de até 160 caracteres (depois de "META:")
3. Um resumo de 2-3 frases (depois de "RESUMO:")`

    const result = await AIRouter.generateText({
      agentType: 'writer',
      system,
      prompt,
    })

    // Parse the writer's output
    const text = result.text
    const articleMatch = text.match(/ARTIGO:([\s\S]*?)(?=META:|$)/i)
    const metaMatch = text.match(/META:([\s\S]*?)(?=RESUMO:|$)/i)
    const summaryMatch = text.match(/RESUMO:([\s\S]*?)$/i)

    const content = articleMatch?.[1]?.trim() || text
    const metaDescription = metaMatch?.[1]?.trim().slice(0, 160) || ''
    const summary = summaryMatch?.[1]?.trim() || ''

    // Extract title from first heading or use input topic
    const titleMatch = content.match(/^#\s+(.+)/m)
    const title = titleMatch?.[1] || input.topic

    return { title, content, metaDescription, summary }
  }
}
