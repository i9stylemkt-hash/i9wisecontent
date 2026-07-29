// @vitest-environment node

/**
 * Property Test — Task 3.10
 * Property 1: Crypto Round-Trip
 *
 * Para qualquer string input válida, decrypt(encrypt(input))
 * deve produzir o input original.
 *
 * Feature: audit-fixes-implementation, Property 1: Crypto Round-Trip
 * Validates: Requirements 11.4
 */

import { describe, it, expect, beforeAll } from 'vitest'
import * as fc from 'fast-check'
import { encrypt, decrypt } from '@/lib/utils/crypto'

// Necessário: ENCRYPTION_KEY válida para os testes
beforeAll(() => {
  // 64 hex chars = 32 bytes key
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
})

describe('Crypto — Property Tests', () => {
  it('Property 1: decrypt(encrypt(input)) === input para qualquer string', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (input) => {
          const encrypted = encrypt(input)
          const decrypted = decrypt(encrypted)
          expect(decrypted).toBe(input)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 1: round-trip funciona com strings Unicode', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (input) => {
          // Testar com caracteres especiais comuns
          const unicodeInput = input + '🚀 café ñ 你好'
          const encrypted = encrypt(unicodeInput)
          const decrypted = decrypt(encrypted)
          expect(decrypted).toBe(unicodeInput)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 1: cada encrypt produz resultado diferente (IV aleatório)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (input) => {
          const encrypted1 = encrypt(input)
          const encrypted2 = encrypt(input)
          // Mesmo input gera cyphertext diferente (IV aleatório)
          expect(encrypted1).not.toBe(encrypted2)
          // Mas ambos descriptografam para o mesmo valor
          expect(decrypt(encrypted1)).toBe(input)
          expect(decrypt(encrypted2)).toBe(input)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('formato do output é iv:authTag:encrypted (hex)', () => {
    const encrypted = encrypt('test')
    const parts = encrypted.split(':')
    expect(parts).toHaveLength(3)
    // IV = 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32)
    // Auth tag = 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32)
    // Encrypted data exists
    expect(parts[2]!.length).toBeGreaterThan(0)
  })

  it('decrypt falha com dados inválidos', () => {
    expect(() => decrypt('invalid')).toThrow()
    expect(() => decrypt('aa:bb:cc')).toThrow()
    expect(() => decrypt('')).toThrow()
  })
})
