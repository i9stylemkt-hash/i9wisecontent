// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { sanitize } from '@/lib/utils/logger'

const SENSITIVE_FIELD_NAMES = [
  'apiKey',
  'apikey',
  'password',
  'token',
  'secret',
  'authorization',
  'key_encrypted',
]

const NON_SENSITIVE_FIELD_NAMES = [
  'name',
  'email',
  'age',
  'description',
  'title',
  'count',
  'status',
  'message',
  'url',
  'path',
]

describe('Feature: audit-corrections-plan, Property 7: Logger sanitizes sensitive fields', () => {
  it('sensitive fields are always replaced with [REDACTED]', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SENSITIVE_FIELD_NAMES),
        fc.string({ minLength: 1, maxLength: 200 }),
        (fieldName, value) => {
          const obj = { [fieldName]: value }
          const result = sanitize(obj) as Record<string, unknown>
          expect(result[fieldName]).toBe('[REDACTED]')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('non-sensitive fields are preserved unchanged', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NON_SENSITIVE_FIELD_NAMES),
        fc.oneof(
          fc.string({ minLength: 0, maxLength: 200 }),
          fc.integer(),
          fc.boolean()
        ),
        (fieldName, value) => {
          const obj = { [fieldName]: value }
          const result = sanitize(obj) as Record<string, unknown>
          expect(result[fieldName]).toBe(value)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('nested sensitive fields are also redacted', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SENSITIVE_FIELD_NAMES),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (sensitiveField, value, wrapperKey) => {
          // Ensure wrapper key is NOT sensitive
          const safeWrapper = NON_SENSITIVE_FIELD_NAMES[0]!
          const obj = { [safeWrapper]: { [sensitiveField]: value } }
          const result = sanitize(obj) as Record<string, Record<string, unknown>>
          expect(result[safeWrapper]![sensitiveField]).toBe('[REDACTED]')
        }
      ),
      { numRuns: 100 }
    )
  })
})
