/**
 * Groq Provider Configuration
 * 
 * Referência oficial: https://console.groq.com/docs/api-reference
 * Modelos e limites: https://console.groq.com/docs/models
 * Rate limits: https://console.groq.com/docs/rate-limits
 * Structured Outputs: https://console.groq.com/docs/structured-outputs
 * 
 * Última atualização: Jul/2026
 */

// ============================================
// MODEL SPECIFICATIONS
// ============================================

export interface GroqModelSpec {
  id: string
  contextWindow: number
  maxCompletionTokens: number
  supportsJsonSchema: boolean
  supportsJsonObject: boolean
  supportsToolUse: boolean
  supportsReasoning: boolean
  speedTPS: number
  pricing: { input: number; output: number } // USD per 1M tokens
}

export const GROQ_MODELS: Record<string, GroqModelSpec> = {
  'llama-3.3-70b-versatile': {
    id: 'llama-3.3-70b-versatile',
    contextWindow: 131_072,
    maxCompletionTokens: 32_768,
    supportsJsonSchema: false, // ONLY json_object mode
    supportsJsonObject: true,
    supportsToolUse: true,
    supportsReasoning: false,
    speedTPS: 280,
    pricing: { input: 0.59, output: 0.79 },
  },
  'llama-3.1-8b-instant': {
    id: 'llama-3.1-8b-instant',
    contextWindow: 131_072,
    maxCompletionTokens: 131_072,
    supportsJsonSchema: false,
    supportsJsonObject: true,
    supportsToolUse: true,
    supportsReasoning: false,
    speedTPS: 560,
    pricing: { input: 0.05, output: 0.08 },
  },
  'openai/gpt-oss-20b': {
    id: 'openai/gpt-oss-20b',
    contextWindow: 131_072,
    maxCompletionTokens: 65_536,
    supportsJsonSchema: true, // Supports strict: true structured outputs
    supportsJsonObject: true,
    supportsToolUse: true,
    supportsReasoning: true,
    speedTPS: 1000,
    pricing: { input: 0.075, output: 0.30 },
  },
  'openai/gpt-oss-120b': {
    id: 'openai/gpt-oss-120b',
    contextWindow: 131_072,
    maxCompletionTokens: 65_536,
    supportsJsonSchema: true, // Supports strict: true structured outputs
    supportsJsonObject: true,
    supportsToolUse: true,
    supportsReasoning: true,
    speedTPS: 500,
    pricing: { input: 0.15, output: 0.60 },
  },
} as const

// ============================================
// RATE LIMITS (Free/Developer plan)
// ============================================

export interface GroqRateLimits {
  rpm: number      // Requests per minute
  rpd: number      // Requests per day
  tpm: number      // Tokens per minute
  tpd: number      // Tokens per day
}

export const GROQ_RATE_LIMITS: Record<string, GroqRateLimits> = {
  'llama-3.3-70b-versatile': { rpm: 30, rpd: 1_000, tpm: 12_000, tpd: 100_000 },
  'llama-3.1-8b-instant': { rpm: 30, rpd: 14_400, tpm: 6_000, tpd: 500_000 },
  'openai/gpt-oss-20b': { rpm: 30, rpd: 1_000, tpm: 8_000, tpd: 200_000 },
  'openai/gpt-oss-120b': { rpm: 30, rpd: 1_000, tpm: 8_000, tpd: 200_000 },
}

// ============================================
// BEST PRACTICES FOR GROQ USAGE
// ============================================

/**
 * Recomendações para uso otimizado do Groq no pipeline de agentes:
 * 
 * 1. STRUCTURED OUTPUT:
 *    - Use openai/gpt-oss-20b para generateObject() (suporta json_schema)
 *    - Use llama-3.3-70b com json_object mode para tarefas que não exigem schema estrito
 *    - Inclua instruções JSON claras no system prompt quando usar json_object mode
 * 
 * 2. RATE LIMITING:
 *    - llama-3.3-70b: apenas 12K TPM — cuidado com prompts longos
 *    - Implementar backoff exponencial em 429 errors
 *    - Considerar usar service_tier: "flex" para melhor throughput em batch
 * 
 * 3. PERFORMANCE:
 *    - gpt-oss-20b: 1000 TPS — mais rápido que qualquer modelo
 *    - llama-3.1-8b: 560 TPS — ideal para tarefas leves/rápidas
 *    - Usar temperature baixa (0-0.3) para tarefas determinísticas
 *    - Usar seed para reprodutibilidade quando possível
 * 
 * 4. PROMPTING:
 *    - Groq modelos respondem melhor com instruções concisas e diretas
 *    - Para json_object mode: DEVE incluir "respond in JSON" no prompt
 *    - Evitar prompts muito longos (impacta rate limits por TPM)
 *    - System prompts curtos e focados melhoram latência
 * 
 * 5. TOKEN MANAGEMENT:
 *    - max_completion_tokens é o parâmetro correto (max_tokens deprecated)
 *    - Monitorar usage.queue_time para detectar congestion
 *    - Context window total inclui input + output tokens
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Verifica se um modelo Groq suporta structured output (json_schema).
 */
export function supportsStructuredOutput(modelId: string): boolean {
  return GROQ_MODELS[modelId]?.supportsJsonSchema ?? false
}

/**
 * Retorna o melhor modelo Groq para structured output.
 */
export function getStructuredOutputModel(): string {
  return 'openai/gpt-oss-20b'
}

/**
 * Retorna o melhor modelo Groq para geração de texto rápida.
 */
export function getFastTextModel(): string {
  return 'llama-3.1-8b-instant'
}

/**
 * Retorna o melhor modelo Groq para qualidade geral.
 */
export function getQualityModel(): string {
  return 'llama-3.3-70b-versatile'
}

/**
 * Calcula se um prompt cabe no rate limit de TPM do modelo.
 * Estimativa: 1 token ≈ 4 caracteres.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Verifica se a chamada pode ser feita dentro do rate limit.
 */
export function checkRateLimit(modelId: string, estimatedTokens: number): {
  withinLimit: boolean
  maxTPM: number
  estimated: number
} {
  const limits = GROQ_RATE_LIMITS[modelId]
  if (!limits) return { withinLimit: true, maxTPM: Infinity, estimated: estimatedTokens }
  
  return {
    withinLimit: estimatedTokens <= limits.tpm,
    maxTPM: limits.tpm,
    estimated: estimatedTokens,
  }
}

/**
 * Retorna delay recomendado em ms baseado no header retry-after.
 */
export function getRetryDelay(retryAfterHeader?: string, attempt = 0): number {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10)
    if (!isNaN(seconds)) return seconds * 1000
  }
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(1000 * Math.pow(2, attempt), 30_000)
}
