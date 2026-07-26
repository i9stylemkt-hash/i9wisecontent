import { AIRouter } from '@/lib/ai/router'
import type { WriterInput, WriterOutput } from './types'

export class WriterAgent {
  static async execute(input: WriterInput): Promise<WriterOutput> {
    const system = `Você é um escritor de conteúdo especializado em ${input.blogConfig.niche}.
Seu papel é criar artigos completos, de alta qualidade, prontos para publicação.

Blog: ${input.blogConfig.name}
Tom de voz: ${input.blogConfig.toneOfVoice || 'profissional e acessível'}
Persona: ${input.blogConfig.authorPersona || 'especialista no tema'}
Público: ${input.blogConfig.targetAudience || 'público geral'}
Idioma: ${input.blogConfig.contentLanguage}

Regras:
- Escreva em Markdown
- Use headings (##, ###) para estruturar
- Parágrafos curtos (máx 3-4 frases)
- Inclua exemplos práticos quando possível
- Otimize para SEO naturalmente
- Extensão alvo: ${input.targetWordCount || 1500} palavras`

    const prompt = `Escreva um artigo completo sobre: "${input.topic}"

Briefing de pesquisa:
${input.briefing}

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
