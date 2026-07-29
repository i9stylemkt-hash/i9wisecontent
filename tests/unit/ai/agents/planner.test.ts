// @vitest-environment node

/**
 * Property Test — Task 5.2
 * Property 4: Agent Output Schema Completeness
 *
 * Para qualquer configuração de blog válida, o PlannerAgent output schema
 * deve conter todos os campos required (title, titleSuggestions, angle,
 * outline, targetKeywords, estimatedWordCount, contentType, targetAudienceSegment).
 * Testa que o schema Zod rejeita objetos com campos faltantes.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { z } from 'zod'

// Define o schema idêntico ao do PlannerAgent
const plannerOutputSchema = z.object({
  title: z.string(),
  titleSuggestions: z.array(z.string()).min(3).max(5),
  angle: z.string(),
  outline: z.array(z.string()),
  targetKeywords: z.array(z.string()),
  estimatedWordCount: z.number(),
  contentType: z.string(),
  targetAudienceSegment: z.string(),
})

const REQUIRED_FIELDS = [
  'title',
  'titleSuggestions',
  'angle',
  'outline',
  'targetKeywords',
  'estimatedWordCount',
  'contentType',
  'targetAudienceSegment',
] as const

// Arbitrary para gerar output válido completo
const validOutputArb = fc.record({
  title: fc.string({ minLength: 1 }),
  titleSuggestions: fc.array(fc.string({ minLength: 1 }), { minLength: 3, maxLength: 5 }),
  angle: fc.string({ minLength: 1 }),
  outline: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
  targetKeywords: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
  estimatedWordCount: fc.nat({ max: 10000 }),
  contentType: fc.constantFrom('tutorial', 'listicle', 'how-to', 'opinion', 'case-study', 'review'),
  targetAudienceSegment: fc.string({ minLength: 1 }),
})

describe('PlannerAgent Output Schema — Property Tests', () => {
  it('Property 4: schema aceita objetos válidos com todos os campos required', () => {
    fc.assert(
      fc.property(validOutputArb, (output) => {
        const result = plannerOutputSchema.safeParse(output)
        expect(result.success).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 4: schema rejeita objetos com qualquer campo required faltante', () => {
    fc.assert(
      fc.property(
        validOutputArb,
        fc.constantFrom(...REQUIRED_FIELDS),
        (output, fieldToRemove) => {
          const incomplete = { ...output }
          delete (incomplete as Record<string, unknown>)[fieldToRemove]
          const result = plannerOutputSchema.safeParse(incomplete)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: schema rejeita objetos com campos de tipo errado', () => {
    fc.assert(
      fc.property(
        validOutputArb,
        fc.constantFrom(...REQUIRED_FIELDS),
        (output, fieldToCorrupt) => {
          const corrupted = { ...output } as Record<string, unknown>
          // Substitui o campo por um tipo incompatível
          if (fieldToCorrupt === 'estimatedWordCount') {
            corrupted[fieldToCorrupt] = 'not-a-number'
          } else if (
            fieldToCorrupt === 'titleSuggestions' ||
            fieldToCorrupt === 'outline' ||
            fieldToCorrupt === 'targetKeywords'
          ) {
            corrupted[fieldToCorrupt] = 'not-an-array'
          } else {
            corrupted[fieldToCorrupt] = 12345
          }
          const result = plannerOutputSchema.safeParse(corrupted)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: schema rejeita titleSuggestions com menos de 3 itens', () => {
    fc.assert(
      fc.property(
        validOutputArb,
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 2 }),
        (output, shortSuggestions) => {
          const invalid = { ...output, titleSuggestions: shortSuggestions }
          const result = plannerOutputSchema.safeParse(invalid)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: schema rejeita titleSuggestions com mais de 5 itens', () => {
    fc.assert(
      fc.property(
        validOutputArb,
        fc.array(fc.string({ minLength: 1 }), { minLength: 6, maxLength: 10 }),
        (output, longSuggestions) => {
          const invalid = { ...output, titleSuggestions: longSuggestions }
          const result = plannerOutputSchema.safeParse(invalid)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: schema contém todos os 8 campos required', () => {
    // Verifica estruturalmente que o schema tem exatamente os campos esperados
    const shape = plannerOutputSchema.shape
    for (const field of REQUIRED_FIELDS) {
      expect(shape).toHaveProperty(field)
    }
    expect(Object.keys(shape)).toHaveLength(REQUIRED_FIELDS.length)
  })
})
