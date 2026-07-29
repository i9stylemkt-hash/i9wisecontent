// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import * as fc from 'fast-check'

describe('Feature: audit-corrections-plan, Property 1: Crypto Round-Trip', () => {
  beforeAll(() => {
    // Set a valid 64-hex-char key (32 bytes) before importing crypto module
    process.env.ENCRYPTION_KEY = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
  })

  it('decrypt(encrypt(input)) === input for any string of 1-10000 chars', async () => {
    // Dynamic import to pick up the env var
    const { encrypt, decrypt } = await import('@/lib/utils/crypto')

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10000 }),
        (input) => {
          const encrypted = encrypt(input)
          const decrypted = decrypt(encrypted)
          expect(decrypted).toBe(input)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('encrypt produces different ciphertext for same input (random IV)', async () => {
    const { encrypt } = await import('@/lib/utils/crypto')

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (input) => {
          const encrypted1 = encrypt(input)
          const encrypted2 = encrypt(input)
          // Due to random IV, same plaintext produces different ciphertext
          return encrypted1 !== encrypted2
        }
      ),
      { numRuns: 50 }
    )
  })
})
