// @vitest-environment node

/**
 * Property Test — Task 3.8
 * Property 2: Rate Limiter Sliding Window Enforcement
 *
 * Para qualquer sequência de N requests do mesmo key dentro de uma janela W,
 * se N excede maxRequests, todos os requests subsequentes na mesma janela
 * devem ser rejeitados.
 *
 * Feature: audit-fixes-implementation, Property 2: Rate Limiter Sliding Window Enforcement
 * Validates: Requirements 10.1, 10.2, 10.3, 10.5
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { SlidingWindowRateLimiter, type RateLimitConfig } from '@/lib/middleware/rate-limiter'

describe('Rate Limiter — Property Tests', () => {
  let limiter: SlidingWindowRateLimiter

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter(0) // sem cleanup automático em testes
  })

  it('Property 2: exatamente maxRequests são permitidos por janela', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (maxRequests, key) => {
          limiter.reset()
          const config: RateLimitConfig = { windowMs: 60_000, maxRequests }

          // Fazer exatamente maxRequests — todos devem passar
          for (let i = 0; i < maxRequests; i++) {
            const result = limiter.check(key, config)
            expect(result.allowed).toBe(true)
            expect(result.remaining).toBe(maxRequests - (i + 1))
          }

          // O próximo deve ser rejeitado
          const rejected = limiter.check(key, config)
          expect(rejected.allowed).toBe(false)
          expect(rejected.remaining).toBe(0)
          expect(rejected.retryAfterMs).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2: requests após maxRequests são todos rejeitados na mesma janela', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 30 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (maxRequests, extraRequests, key) => {
          limiter.reset()
          const config: RateLimitConfig = { windowMs: 60_000, maxRequests }

          // Preencher a janela
          for (let i = 0; i < maxRequests; i++) {
            limiter.check(key, config)
          }

          // Todos os extras devem ser rejeitados
          for (let i = 0; i < extraRequests; i++) {
            const result = limiter.check(key, config)
            expect(result.allowed).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2: chaves diferentes são independentes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (maxRequests) => {
          limiter.reset()
          const config: RateLimitConfig = { windowMs: 60_000, maxRequests }

          // Esgotar key1
          for (let i = 0; i < maxRequests; i++) {
            limiter.check('key1', config)
          }
          expect(limiter.check('key1', config).allowed).toBe(false)

          // key2 ainda deve funcionar
          const result = limiter.check('key2', config)
          expect(result.allowed).toBe(true)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 2: retryAfterMs é positivo quando bloqueado', () => {
    limiter.reset()
    const config: RateLimitConfig = { windowMs: 60_000, maxRequests: 1 }

    limiter.check('test', config) // usar o único slot
    const result = limiter.check('test', config) // deve ser rejeitado

    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeDefined()
    expect(result.retryAfterMs!).toBeGreaterThanOrEqual(0)
    expect(result.retryAfterMs!).toBeLessThanOrEqual(60_000)
  })

  it('cleanup remove entradas expiradas', () => {
    limiter.reset()
    const config: RateLimitConfig = { windowMs: 1, maxRequests: 1 } // janela de 1ms

    limiter.check('expire-test', config) // registrar

    // Esperar a janela expirar (simular com delay mínimo)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        limiter.cleanup()
        // Após cleanup, deve permitir novamente
        const result = limiter.check('expire-test', config)
        expect(result.allowed).toBe(true)
        resolve()
      }, 5)
    })
  })
})
