// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateCost, MODEL_PRICING } from '@/lib/ai/cost-calculator'

const KNOWN_MODELS = Object.keys(MODEL_PRICING)

describe('Feature: audit-corrections-plan, Property 4: Cost calculator non-negative and proportional', () => {
  it('cost is always >= 0 for any known model and tokens >= 0', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...KNOWN_MODELS),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (model, inputTokens, outputTokens) => {
          const cost = calculateCost(model, inputTokens, outputTokens)
          expect(cost).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('doubling both input and output tokens doubles the cost (proportionality)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...KNOWN_MODELS),
        fc.integer({ min: 1, max: 500_000 }),
        fc.integer({ min: 1, max: 500_000 }),
        (model, inputTokens, outputTokens) => {
          const cost1 = calculateCost(model, inputTokens, outputTokens)
          const cost2 = calculateCost(model, inputTokens * 2, outputTokens * 2)

          // cost2 should be exactly 2 * cost1 (linear pricing)
          expect(cost2).toBeCloseTo(cost1 * 2, 10)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('unknown model returns 0 cost', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !KNOWN_MODELS.includes(s)),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (model, inputTokens, outputTokens) => {
          const cost = calculateCost(model, inputTokens, outputTokens)
          expect(cost).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })
})
