// @vitest-environment node

/**
 * Property Test — Task 1.5
 * Property 9: Logger Sanitization of Sensitive Fields
 *
 * For any object containing fields whose names match sensitive patterns
 * (apiKey, password, token, secret, key_encrypted, authorization),
 * the sanitized output must replace those values with "[REDACTED]"
 * while preserving all other fields unchanged.
 *
 * Feature: audit-fixes-implementation, Property 9: Logger Sanitization of Sensitive Fields
 * Validates: Requirements 22.1, 22.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { sanitize } from '@/lib/utils/logger'

const SENSITIVE_KEYS = [
  'apiKey',
  'password',
  'token',
  'secret',
  'key_encrypted',
  'authorization',
  'API_KEY',
  'userPassword',
  'accessToken',
  'clientSecret',
  'x-authorization',
]

const SAFE_KEYS = ['name', 'email', 'userId', 'message', 'status', 'count', 'url', 'data']

describe('Logger Sanitization — Property Tests', () => {
  it('Property 9: sensitive fields are replaced with [REDACTED]', () => {
    const sensitiveKeyArb = fc.constantFrom(...SENSITIVE_KEYS)
    const valueArb = fc.oneof(fc.string(), fc.integer(), fc.boolean())

    fc.assert(
      fc.property(sensitiveKeyArb, valueArb, (key, value) => {
        const input = { [key]: value }
        const result = sanitize(input) as Record<string, unknown>
        expect(result[key]).toBe('[REDACTED]')
      }),
      { numRuns: 100 }
    )
  })

  it('Property 9: non-sensitive fields are preserved unchanged', () => {
    const safeKeyArb = fc.constantFrom(...SAFE_KEYS)
    const valueArb = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null)
    )

    fc.assert(
      fc.property(safeKeyArb, valueArb, (key, value) => {
        const input = { [key]: value }
        const result = sanitize(input) as Record<string, unknown>
        expect(result[key]).toBe(value)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 9: mixed objects have sensitive fields redacted and safe fields preserved', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.string(),
        fc.string(),
        (safeValue, sensitiveValue, safeValue2, sensitiveValue2) => {
          const input = {
            name: safeValue,
            apiKey: sensitiveValue,
            email: safeValue2,
            password: sensitiveValue2,
          }
          const result = sanitize(input) as Record<string, unknown>

          expect(result.name).toBe(safeValue)
          expect(result.email).toBe(safeValue2)
          expect(result.apiKey).toBe('[REDACTED]')
          expect(result.password).toBe('[REDACTED]')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9: nested objects have sensitive fields redacted recursively', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (nestedSensitive, deepValue) => {
        const input = {
          user: {
            name: deepValue,
            token: nestedSensitive,
          },
        }
        const result = sanitize(input) as { user: Record<string, unknown> }

        expect(result.user.name).toBe(deepValue)
        expect(result.user.token).toBe('[REDACTED]')
      }),
      { numRuns: 100 }
    )
  })

  it('Property 9: arrays are processed recursively', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (name, secret) => {
        const input = [
          { name, secret },
          { name: 'other', secret: 'val' },
        ]
        const result = sanitize(input) as Array<Record<string, unknown>>

        expect(result[0]?.name).toBe(name)
        expect(result[0]?.secret).toBe('[REDACTED]')
        expect(result[1]?.name).toBe('other')
        expect(result[1]?.secret).toBe('[REDACTED]')
      }),
      { numRuns: 100 }
    )
  })

  it('handles null and undefined gracefully', () => {
    expect(sanitize(null)).toBeNull()
    expect(sanitize(undefined)).toBeUndefined()
  })

  it('handles primitive values as passthrough', () => {
    expect(sanitize('hello')).toBe('hello')
    expect(sanitize(42)).toBe(42)
    expect(sanitize(true)).toBe(true)
  })
})
