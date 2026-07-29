// @vitest-environment node

/**
 * Property Test — Task 3.4
 * Property 3: Cost Calculation Non-Negativity and Proportionality
 *
 * Para qualquer modelo válido e token counts não-negativos,
 * o custo calculado deve ser não-negativo e crescer
 * monotonicamente com a contagem de tokens.
 *
 * Feature: audit-fixes-implementation, Property 3: Cost Calculation Non-Negativity and Proportionality
 * Validates: Requirements 7.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateCost, MODEL_PRICING, hasModelPricing } from '@/lib/ai/cost-calculator'

const VALID_MODELS = Object.keys(MODEL_PRICING)
const modelArb = fc.constantFrom(...VALID_MODELS)
const tokenArb = fc.nat({ max: 1_000_000 }) // 0 a 1M tokens

describe('Cost Calculator — Property Tests', () => {
  it('Property 3: custo é sempre não-negativo para modelos válidos', () => {
    fc.assert(
      fc.property(modelArb, tokenArb, tokenArb, (model, tokensInput, tokensOutput) => {
        const cost = calculateCost(model, tokensInput, tokensOutput)
        expect(cost).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 200 }
    )
  })

  it('Property 3: custo cresce monotonicamente com tokens de input', () => {
    fc.assert(
      fc.property(
        modelArb,
        tokenArb,
        tokenArb,
        fc.nat({ max: 100_000 }),
        (model, baseInput, output, increment) => {
          const cost1 = calculateCost(model, baseInput, output)
          const cost2 = calculateCost(model, baseInput + increment, output)
          expect(cost2).toBeGreaterThanOrEqual(cost1)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('Property 3: custo cresce monotonicamente com tokens de output', () => {
    fc.assert(
      fc.property(
        modelArb,
        tokenArb,
        tokenArb,
        fc.nat({ max: 100_000 }),
        (model, input, baseOutput, increment) => {
          const cost1 = calculateCost(model, input, baseOutput)
          const cost2 = calculateCost(model, input, baseOutput + increment)
          expect(cost2).toBeGreaterThanOrEqual(cost1)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('Property 3: custo é zero quando tokens são zero', () => {
    for (const model of VALID_MODELS) {
      expect(calculateCost(model, 0, 0)).toBe(0)
    }
  })

  it('custo retorna 0 para modelos não registrados', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => !hasModelPricing(s)),
        tokenArb,
        tokenArb,
        (unknownModel, input, output) => {
          expect(calculateCost(unknownModel, input, output)).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('hasModelPricing retorna true para modelos registrados', () => {
    for (const model of VALID_MODELS) {
      expect(hasModelPricing(model)).toBe(true)
    }
  })
})
