import { generateText, generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { z } from 'zod'

export type AIProvider = 'google' | 'anthropic' | 'groq' | 'openrouter'

export interface AIRouterConfig {
  provider: AIProvider
  model: string
  temperature?: number
  maxTokens?: number
}

/** Default model configuration by agent type */
export const DEFAULT_MODELS: Record<string, AIRouterConfig> = {
  planner: { provider: 'google', model: 'gemini-2.0-flash', temperature: 0.7, maxTokens: 4000 },
  researcher: { provider: 'google', model: 'gemini-2.0-flash', temperature: 0.3, maxTokens: 8000 },
  writer: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.8, maxTokens: 16000 },
  reviewer: { provider: 'google', model: 'gemini-2.0-flash', temperature: 0.2, maxTokens: 4000 },
}

/** Fallback chain: if primary fails, try next */
const FALLBACK_CHAIN: AIProvider[] = ['google', 'anthropic', 'groq', 'openrouter']

/**
 * AI Router — selects model, handles fallback, returns response
 */
export class AIRouter {
  /**
   * Generate text with automatic model selection and fallback
   */
  static async generateText(options: {
    agentType: string
    system: string
    prompt: string
    config?: Partial<AIRouterConfig>
  }): Promise<{ text: string; provider: string; model: string; tokensUsed: number }> {
    const defaultConfig = DEFAULT_MODELS[options.agentType] ?? DEFAULT_MODELS.planner!
    const config: AIRouterConfig = { ...defaultConfig, ...options.config }
    const providers = this.buildFallbackChain(config.provider)

    for (const provider of providers) {
      try {
        const model = this.getModel(provider, config.model)
        const result = await generateText({
          model,
          system: options.system,
          prompt: options.prompt,
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
        })

        return {
          text: result.text,
          provider,
          model: config.model,
          tokensUsed: (result.usage?.totalTokens) || 0,
        }
      } catch (error) {
        console.error(`[AIRouter] ${provider} failed:`, error)
        continue
      }
    }

    throw new Error('All AI providers failed')
  }

  /**
   * Generate structured output with schema validation
   */
  static async generateObject<T>(options: {
    agentType: string
    system: string
    prompt: string
    schema: z.ZodSchema<T>
    config?: Partial<AIRouterConfig>
  }): Promise<{ object: T; provider: string; model: string; tokensUsed: number }> {
    const defaultConfig = DEFAULT_MODELS[options.agentType] ?? DEFAULT_MODELS.planner!
    const config: AIRouterConfig = { ...defaultConfig, ...options.config }
    const providers = this.buildFallbackChain(config.provider)

    for (const provider of providers) {
      try {
        const model = this.getModel(provider, config.model)
        const result = await generateObject({
          model,
          system: options.system,
          prompt: options.prompt,
          schema: options.schema,
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
        })

        return {
          object: result.object,
          provider,
          model: config.model,
          tokensUsed: (result.usage?.totalTokens) || 0,
        }
      } catch (error) {
        console.error(`[AIRouter] ${provider} structured output failed:`, error)
        continue
      }
    }

    throw new Error('All AI providers failed for structured output')
  }

  private static getModel(provider: AIProvider, modelId: string) {
    switch (provider) {
      case 'google':
        return google(modelId)
      case 'anthropic':
        return anthropic(modelId)
      case 'groq': {
        const groq = createOpenAI({
          baseURL: 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY,
        })
        return groq(modelId)
      }
      case 'openrouter': {
        const openrouter = createOpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: process.env.OPENROUTER_API_KEY,
        })
        return openrouter(modelId)
      }
      default:
        return google(modelId)
    }
  }

  private static buildFallbackChain(primary: AIProvider): AIProvider[] {
    const chain = [primary]
    for (const provider of FALLBACK_CHAIN) {
      if (provider !== primary && this.hasKey(provider)) {
        chain.push(provider)
      }
    }
    return chain
  }

  private static hasKey(provider: AIProvider): boolean {
    switch (provider) {
      case 'google': return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
      case 'anthropic': return !!process.env.ANTHROPIC_API_KEY
      case 'groq': return !!process.env.GROQ_API_KEY
      case 'openrouter': return !!process.env.OPENROUTER_API_KEY
      default: return false
    }
  }
}
