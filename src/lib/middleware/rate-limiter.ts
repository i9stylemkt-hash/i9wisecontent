/**
 * Sliding Window Rate Limiter — controla a taxa de requisições por chave.
 * Implementação em memória usando Map com limpeza periódica.
 */

import { Logger } from '@/lib/utils/logger'
import { RateLimitExceededError } from '@/lib/utils/errors'

const logger = new Logger('RateLimiter')

export interface RateLimitConfig {
  /** Duração da janela em milissegundos */
  windowMs: number
  /** Máximo de requisições permitidas na janela */
  maxRequests: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Tempo em ms até o próximo slot disponível (presente quando bloqueado) */
  retryAfterMs?: number
  /** Requisições restantes na janela atual */
  remaining: number
}

/** Configurações predefinidas por categoria de rota */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  pipeline: { windowMs: 60_000, maxRequests: 5 },
  crud: { windowMs: 60_000, maxRequests: 60 },
  auth: { windowMs: 60_000, maxRequests: 10 },
}

/**
 * Rate limiter com sliding window.
 * Armazena timestamps de requisições por chave e descarta as expiradas.
 */
export class SlidingWindowRateLimiter {
  private windows: Map<string, number[]> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(private readonly cleanupIntervalMs = 60_000) {
    // Limpeza periódica automática
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), this.cleanupIntervalMs)
      // Não bloquear event loop (only works in Node.js runtime, not edge)
      try {
        if (this.cleanupInterval && typeof (this.cleanupInterval as NodeJS.Timeout).unref === 'function') {
          ;(this.cleanupInterval as NodeJS.Timeout).unref()
        }
      } catch {
        // Edge runtime doesn't support unref — safe to ignore
      }
    }
  }

  /**
   * Verifica se a requisição é permitida para a chave dada.
   * Se permitida, registra o timestamp automaticamente.
   */
  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Buscar timestamps existentes e filtrar expirados
    const timestamps = this.windows.get(key) ?? []
    const validTimestamps = timestamps.filter((t) => t > windowStart)

    if (validTimestamps.length >= config.maxRequests) {
      // Calcular quando o primeiro timestamp expira
      const oldestInWindow = validTimestamps[0]!
      const retryAfterMs = oldestInWindow + config.windowMs - now

      logger.debug('Rate limit exceeded', { key, count: validTimestamps.length, config })

      return {
        allowed: false,
        retryAfterMs: Math.max(retryAfterMs, 0),
        remaining: 0,
      }
    }

    // Registrar esta requisição
    validTimestamps.push(now)
    this.windows.set(key, validTimestamps)

    return {
      allowed: true,
      remaining: config.maxRequests - validTimestamps.length,
    }
  }

  /**
   * Remove entradas expiradas de todas as chaves.
   */
  cleanup(): void {
    const now = Date.now()
    // Usar a maior janela possível como referência de expiração
    const maxWindow = Math.max(...Object.values(RATE_LIMITS).map((c) => c.windowMs))

    for (const [key, timestamps] of this.windows.entries()) {
      const valid = timestamps.filter((t) => t > now - maxWindow)
      if (valid.length === 0) {
        this.windows.delete(key)
      } else {
        this.windows.set(key, valid)
      }
    }
  }

  /**
   * Reseta todos os dados (útil para testes).
   */
  reset(): void {
    this.windows.clear()
  }

  /**
   * Para o cleanup automático (para shutdown limpo).
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

/** Instância global (singleton) do rate limiter */
export const rateLimiter = new SlidingWindowRateLimiter()

/**
 * Helper para criar chave de rate limit a partir de userId e categoria.
 */
export function makeRateLimitKey(identifier: string, category: string): string {
  return `${category}:${identifier}`
}

/**
 * Executa rate limiting e lança erro se excedido.
 * Convenience function para uso em API routes.
 */
export function enforceRateLimit(
  identifier: string,
  category: keyof typeof RATE_LIMITS
): RateLimitResult {
  const config = RATE_LIMITS[category]
  if (!config) {
    logger.warn(`Rate limit category "${category}" não encontrada, permitindo requisição`)
    return { allowed: true, remaining: 999 }
  }

  const key = makeRateLimitKey(identifier, category)
  const result = rateLimiter.check(key, config)

  if (!result.allowed) {
    throw new RateLimitExceededError(
      `Limite de ${config.maxRequests} requisições por ${config.windowMs / 1000}s excedido`,
      result.retryAfterMs
    )
  }

  return result
}
