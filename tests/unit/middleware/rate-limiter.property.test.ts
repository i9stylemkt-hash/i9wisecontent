// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { SlidingWindowRateLimiter } from '@/lib/middleware/rate-limiter'
import type { RateLimitConfig } from '@/lib/middleware/rate-limiter'

describe('Feature: audit-corrections-plan, Property 5: Rate limiter max-L', () => {
  const instances: SlidingWindowRateLimiter[] = []

  afterEach(() => {
    // Clean up all instances to prevent timer leaks
    for (const instance of instances) {
      instance.destroy()
    }
    instances.length = 0
  })

  it('for N requests (N > maxRequests) from same key in same window, exactly maxRequests are allowed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 5, max: 100 }),
        (maxRequests, extraRequests) => {
          const limiter = new SlidingWindowRateLimiter(600_000) // long cleanup interval
          instances.push(limiter)

          const config: RateLimitConfig = {
            windowMs: 60_000,
            maxRequests,
          }
          const key = `test-key-${Math.random()}`
          const totalRequests = maxRequests + extraRequests

          let allowedCount = 0
          for (let i = 0; i < totalRequests; i++) {
            const result = limiter.check(key, config)
            if (result.allowed) {
              allowedCount++
            }
          }

          expect(allowedCount).toBe(maxRequests)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('different keys are rate-limited independently', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 2, max: 5 }),
        (maxRequests, numKeys) => {
          const limiter = new SlidingWindowRateLimiter(600_000)
          instances.push(limiter)

          const config: RateLimitConfig = {
            windowMs: 60_000,
            maxRequests,
          }

          // Each key should independently get maxRequests allowed
          for (let k = 0; k < numKeys; k++) {
            const key = `key-${k}-${Math.random()}`
            let allowedCount = 0

            for (let i = 0; i < maxRequests + 5; i++) {
              const result = limiter.check(key, config)
              if (result.allowed) allowedCount++
            }

            expect(allowedCount).toBe(maxRequests)
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})
