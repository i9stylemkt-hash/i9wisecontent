import { generateText, generateObject } from 'ai'
import { google, createGoogleGenerativeAI } from '@ai-sdk/google'
import { anthropic, createAnthropic } from '@ai-sdk/anthropic'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import type { z } from 'zod'
import { calculateCost } from './cost-calculator'
import { KeyManager } from './key-manager'
import { Logger } from '@/lib/utils/logger'

const logger = new Logger('AIRouter')

export type AIProvider = 'google' | 'anthropic' | 'groq' | 'openrouter'

export interface AIRouterConfig {
  provider: AIProvider
  model: string
  temperature?: number
  maxTokens?: number
}

export interface TokenUsage {
  prompt: number
  completion: number
  total: number
}

export interface AIRouterResult {
  text: string
  provider: string
  model: string
  tokensUsed: TokenUsage | null
  cost: number | null
  keySource: 'db' | 'env'
}

export interface AIRouterObjectResult<T> {
  object: T
  provider: string
  model: string
  tokensUsed: TokenUsage | null
  cost: number | null
  keySource: 'db' | 'env'
}

/** Default model configuration by agent type */
export const DEFAULT_MODELS: Record<string, AIRouterConfig> = {
  planner: { provider: 'groq', model: 'llama-3.3-70b-versatile', temperature: 0.7, maxTokens: 4000 },
  researcher: { provider: 'google', model: 'gemini-2.0-flash', temperature: 0.3, maxTokens: 8000 },
  writer: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.8, maxTokens: 16000 },
  reviewer: { provider: 'google', model: 'gemini-2.0-flash', temperature: 0.2, maxTokens: 4000 },
}

/**
 * Groq models that support json_schema structured output.
 * llama-3.3-70b-versatile does NOT support json_schema — only json_object mode.
 * For generateObject(), we must use a compatible model.
 */
const GROQ_STRUCTURED_OUTPUT_MODEL = 'openai/gpt-oss-20b'

/**
 * Models that do NOT support json_schema (structured output via schema).
 * These models only support json_object mode (no schema enforcement).
 */
const GROQ_NO_JSON_SCHEMA_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
]

/** Fallback chain: if primary fails, try next */
const FALLBACK_CHAIN: AIProvider[] = ['google', 'anthropic', 'groq', 'openrouter']

/**
 * AI Router — selects model, handles fallback, tracks token usage and costs.
 * Integrates with KeyManager to use user-stored keys first, falling back to env vars.
 */
export class AIRouter {
  /**
   * Generate text with automatic model selection, fallback, and real metrics
   */
  static async generateText(options: {
    agentType: string
    system: string
    prompt: string
    userId?: string
    config?: Partial<AIRouterConfig>
    abortSignal?: AbortSignal
  }): Promise<AIRouterResult> {
    const defaultConfig = DEFAULT_MODELS[options.agentType] ?? DEFAULT_MODELS.planner!
    const config: AIRouterConfig = { ...defaultConfig, ...options.config }
    const providers = this.buildFallbackChain(config.provider)

    for (const provider of providers) {
      try {
        const keyInfo = await this.resolveKey(options.userId, provider)
        const model = this.getModelWithKey(provider, config.model, keyInfo.key)
        const result = await generateText({
          model,
          system: options.system,
          prompt: options.prompt,
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
          abortSignal: options.abortSignal,
        })

        const tokensUsed = this.extractTokenUsage(result.usage)
        const cost = tokensUsed
          ? calculateCost(config.model, tokensUsed.prompt, tokensUsed.completion)
          : null

        // Registrar uso da chave se veio do banco
        if (keyInfo.keyId && cost !== null) {
          KeyManager.recordUsage(keyInfo.keyId, cost).catch((err) => {
            logger.warn('Falha ao registrar uso de chave', {
              keyId: keyInfo.keyId,
              error: err instanceof Error ? err.message : String(err),
            })
          })
        }

        logger.info('Text generation completed', {
          agentType: options.agentType,
          provider,
          model: config.model,
          tokensUsed: tokensUsed?.total ?? null,
          cost,
          keySource: keyInfo.source,
        })

        return {
          text: result.text,
          provider,
          model: config.model,
          tokensUsed,
          cost,
          keySource: keyInfo.source,
        }
      } catch (error) {
        // Se o sinal foi abortado, não tentar fallback
        if (options.abortSignal?.aborted) {
          throw error
        }

        // Se erro de autenticação e chave do DB, marcar como inválida
        if (this.isAuthError(error)) {
          logger.warn(`Chave inválida para ${provider}, marcando como inativa`)
          // Key invalidation será adicionada quando houver keyId tracking
        }

        logger.warn(`Provider ${provider} falhou, tentando próximo`, {
          agentType: options.agentType,
          provider,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }
    }

    throw new Error('All AI providers failed')
  }

  /**
   * Generate structured output with schema validation and real metrics
   */
  static async generateObject<T>(options: {
    agentType: string
    system: string
    prompt: string
    schema: z.ZodSchema<T>
    userId?: string
    config?: Partial<AIRouterConfig>
    abortSignal?: AbortSignal
  }): Promise<AIRouterObjectResult<T>> {
    const defaultConfig = DEFAULT_MODELS[options.agentType] ?? DEFAULT_MODELS.planner!
    const config: AIRouterConfig = { ...defaultConfig, ...options.config }
    const providers = this.buildFallbackChain(config.provider)

    for (const provider of providers) {
      try {
        const keyInfo = await this.resolveKey(options.userId, provider)
        
        // Para Groq com modelos que não suportam json_schema, usar modelo compatível
        let modelId = config.model
        if (provider === 'groq' && GROQ_NO_JSON_SCHEMA_MODELS.includes(modelId)) {
          logger.info('Groq: switching to structured output compatible model', {
            from: modelId,
            to: GROQ_STRUCTURED_OUTPUT_MODEL,
          })
          modelId = GROQ_STRUCTURED_OUTPUT_MODEL
        }

        const model = this.getModelWithKey(provider, modelId, keyInfo.key)
        const result = await generateObject({
          model,
          system: options.system,
          prompt: options.prompt,
          schema: options.schema,
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
          abortSignal: options.abortSignal,
        })

        const tokensUsed = this.extractTokenUsage(result.usage)
        const cost = tokensUsed
          ? calculateCost(config.model, tokensUsed.prompt, tokensUsed.completion)
          : null

        if (keyInfo.keyId && cost !== null) {
          KeyManager.recordUsage(keyInfo.keyId, cost).catch((err) => {
            logger.warn('Falha ao registrar uso de chave', {
              keyId: keyInfo.keyId,
              error: err instanceof Error ? err.message : String(err),
            })
          })
        }

        logger.info('Structured generation completed', {
          agentType: options.agentType,
          provider,
          model: config.model,
          tokensUsed: tokensUsed?.total ?? null,
          cost,
          keySource: keyInfo.source,
        })

        return {
          object: result.object,
          provider,
          model: config.model,
          tokensUsed,
          cost,
          keySource: keyInfo.source,
        }
      } catch (error) {
        if (options.abortSignal?.aborted) {
          throw error
        }

        if (this.isAuthError(error)) {
          logger.warn(`Chave inválida para ${provider} (structured output)`)
        }

        logger.warn(`Provider ${provider} structured output falhou`, {
          agentType: options.agentType,
          provider,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }
    }

    throw new Error('All AI providers failed for structured output')
  }

  /**
   * Resolve API key: busca no DB (via KeyManager) primeiro, fallback para env var.
   */
  private static async resolveKey(
    userId: string | undefined,
    provider: AIProvider
  ): Promise<{ key: string | undefined; keyId: string | null; source: 'db' | 'env' }> {
    // Tentar buscar chave do usuário no banco
    if (userId) {
      try {
        const dbKey = await KeyManager.getKey(userId, provider)
        if (dbKey) {
          return { key: dbKey, keyId: null, source: 'db' }
        }
      } catch {
        // Falha silenciosa, usar env var
      }
    }

    // Fallback para env var
    return { key: undefined, keyId: null, source: 'env' }
  }

  /**
   * Verifica se o erro é de autenticação (401/403).
   */
  private static isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase()
      return msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')
    }
    return false
  }

  private static extractTokenUsage(
    usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined
  ): TokenUsage | null {
    if (!usage) return null

    const prompt = usage.promptTokens ?? 0
    const completion = usage.completionTokens ?? 0
    const total = usage.totalTokens ?? prompt + completion

    // Se não temos dados reais de tokens, retornar null
    if (prompt === 0 && completion === 0 && total === 0) return null

    // Groq pode retornar apenas totalTokens sem separar prompt/completion
    // Nesse caso, estimamos a divisão (70% prompt, 30% completion)
    if (total > 0 && prompt === 0 && completion === 0) {
      return {
        prompt: Math.round(total * 0.7),
        completion: Math.round(total * 0.3),
        total,
      }
    }

    return { prompt, completion, total }
  }

  /**
   * Cria model instance com chave customizada (do DB) ou default (env var).
   */
  private static getModelWithKey(provider: AIProvider, modelId: string, apiKey: string | undefined) {
    switch (provider) {
      case 'google':
        if (apiKey) {
          const customGoogle = createGoogleGenerativeAI({ apiKey })
          return customGoogle(modelId)
        }
        return google(modelId)
      case 'anthropic':
        if (apiKey) {
          const customAnthropic = createAnthropic({ apiKey })
          return customAnthropic(modelId)
        }
        return anthropic(modelId)
      case 'groq': {
        const groqInstance = createGroq({
          apiKey: apiKey ?? process.env.GROQ_API_KEY,
        })
        return groqInstance(modelId)
      }
      case 'openrouter': {
        const openrouter = createOpenAI({
          baseURL: 'https://openrouter.ai/api/v1',
          apiKey: apiKey ?? process.env.OPENROUTER_API_KEY,
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
