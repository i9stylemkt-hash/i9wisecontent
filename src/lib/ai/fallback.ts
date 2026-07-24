import { generateText } from 'ai'
import { geminiModels, groqModels, openRouterModels } from './providers'

// Ordem de fallback por prioridade
const fallbackChain = [
  { name: 'google' as const, model: geminiModels.flash },
  { name: 'groq' as const, model: groqModels.llama70b },
  { name: 'openrouter' as const, model: openRouterModels.llama31Free },
]

interface FallbackOptions {
  system?: string
  temperature?: number
  maxOutputTokens?: number
  preferredProvider?: string
}

export async function generateWithFallback(prompt: string, options?: FallbackOptions) {
  const { system, temperature = 0.7, maxOutputTokens = 2048, preferredProvider } = options || {}

  // Reordenar chain se há provider preferido
  const chain = preferredProvider
    ? [
        ...fallbackChain.filter((p) => p.name === preferredProvider),
        ...fallbackChain.filter((p) => p.name !== preferredProvider),
      ]
    : fallbackChain

  let lastError: Error | null = null

  for (const provider of chain) {
    try {
      const result = await generateText({
        model: provider.model,
        system,
        prompt,
        temperature,
        maxOutputTokens,
      })

      return {
        text: result.text,
        usage: result.usage,
        provider: provider.name,
        fallbackUsed: provider.name !== chain[0]?.name,
      }
    } catch (error) {
      console.warn(`[AI Fallback] ${provider.name} falhou:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
      continue
    }
  }

  throw new Error(`Todos os providers falharam. Último erro: ${lastError?.message}`)
}
