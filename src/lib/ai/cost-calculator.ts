/**
 * Cost Calculator — calcula custos de tokens por modelo de IA.
 * Preços em USD por 1M tokens (input/output separados).
 */

/** Pricing table: USD per 1M tokens */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Google
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  // Anthropic
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-haiku-3-20240307': { input: 0.25, output: 1.25 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  // Groq (hosted models — preços oficiais conforme docs Groq Jul/2026)
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  'openai/gpt-oss-20b': { input: 0.075, output: 0.30 },
  'openai/gpt-oss-120b': { input: 0.15, output: 0.60 },
  // OpenRouter (varia por modelo, defaults)
  'meta-llama/llama-3.1-70b-instruct': { input: 0.52, output: 0.75 },
  'google/gemini-2.0-flash-001': { input: 0.10, output: 0.40 },
}

/**
 * Calcula o custo total de uma chamada de IA.
 *
 * @param model - Identificador do modelo (deve estar em MODEL_PRICING)
 * @param tokensInput - Número de tokens de input (prompt)
 * @param tokensOutput - Número de tokens de output (completion)
 * @returns Custo em USD. Retorna 0 se modelo não encontrado na tabela.
 */
export function calculateCost(
  model: string,
  tokensInput: number,
  tokensOutput: number
): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0

  // Preço por 1M tokens → converter para custo por token
  const inputCost = (tokensInput / 1_000_000) * pricing.input
  const outputCost = (tokensOutput / 1_000_000) * pricing.output

  return inputCost + outputCost
}

/**
 * Verifica se um modelo tem pricing registrado.
 */
export function hasModelPricing(model: string): boolean {
  return model in MODEL_PRICING
}
