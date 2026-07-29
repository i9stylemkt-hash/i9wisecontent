// @vitest-environment node

/**
 * Unit Tests — env-validator.ts
 * Validates startup environment variable checks for Wave 1 (Startup Hardening).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateEnv } from '@/lib/utils/env-validator'

describe('validateEnv', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Fresh shallow copy for each test
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ------- ENCRYPTION_KEY -------

  describe('ENCRYPTION_KEY', () => {
    it('dev mode: warns but does NOT throw when ENCRYPTION_KEY is missing', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.ENCRYPTION_KEY
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => validateEnv()).not.toThrow()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ENCRYPTION_KEY')
      )
    })

    it('prod mode: throws Error with descriptive message when ENCRYPTION_KEY is missing', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.ENCRYPTION_KEY
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      expect(() => validateEnv()).toThrow(/ENCRYPTION_KEY/)
    })

    it('prod mode: throws when ENCRYPTION_KEY includes generation command in error', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.ENCRYPTION_KEY
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      expect(() => validateEnv()).toThrow(/randomBytes/)
    })

    it('validates 64 hex char format — valid key passes', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'abcdef0123456789'.repeat(4) // 64 hex chars
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      expect(() => validateEnv()).not.toThrow()
    })

    it('validates 64 hex char format — 63 chars is invalid', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'a'.repeat(63)
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      expect(() => validateEnv()).toThrow(/ENCRYPTION_KEY/)
    })

    it('validates 64 hex char format — non-hex chars are invalid', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'g'.repeat(64) // 'g' is not hex
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      expect(() => validateEnv()).toThrow(/ENCRYPTION_KEY/)
    })

    it('validates 64 hex char format — 65 chars is invalid', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'a'.repeat(65)
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      expect(() => validateEnv()).toThrow(/ENCRYPTION_KEY/)
    })
  })

  // ------- CRON_SECRET -------

  describe('CRON_SECRET', () => {
    it('dev mode: warns but does NOT throw when CRON_SECRET is too short', () => {
      process.env.NODE_ENV = 'development'
      process.env.ENCRYPTION_KEY = 'a'.repeat(64)
      process.env.CRON_SECRET = 'short' // < 16 chars
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => validateEnv()).not.toThrow()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('CRON_SECRET')
      )
    })

    it('prod mode: throws when CRON_SECRET is less than 16 chars', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'a'.repeat(64)
      process.env.CRON_SECRET = 'only15charshere' // 15 chars
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      expect(() => validateEnv()).toThrow(/CRON_SECRET/)
    })

    it('prod mode: passes when CRON_SECRET is exactly 16 chars', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'a'.repeat(64)
      process.env.CRON_SECRET = 'exactly16chars!!' // 16 chars
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      expect(() => validateEnv()).not.toThrow()
    })

    it('prod mode: throws when CRON_SECRET is missing', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'a'.repeat(64)
      delete process.env.CRON_SECRET
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-key'

      expect(() => validateEnv()).toThrow(/CRON_SECRET/)
    })
  })

  // ------- SUPABASE_SERVICE_ROLE_KEY -------

  describe('SUPABASE_SERVICE_ROLE_KEY', () => {
    it('dev mode: warns but does NOT throw when SERVICE_ROLE_KEY is empty', () => {
      process.env.NODE_ENV = 'development'
      process.env.ENCRYPTION_KEY = 'a'.repeat(64)
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = ''

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => validateEnv()).not.toThrow()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SUPABASE_SERVICE_ROLE_KEY')
      )
    })

    it('prod mode: throws when SERVICE_ROLE_KEY is empty', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'a'.repeat(64)
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = ''

      expect(() => validateEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
    })

    it('prod mode: throws when SERVICE_ROLE_KEY is only whitespace', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'a'.repeat(64)
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = '   '

      expect(() => validateEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
    })

    it('prod mode: passes when SERVICE_ROLE_KEY has a value', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'a'.repeat(64)
      process.env.CRON_SECRET = 'a'.repeat(16)
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_valid_key'

      expect(() => validateEnv()).not.toThrow()
    })
  })

  // ------- All valid -------

  describe('all variables valid', () => {
    it('does not warn or throw when all env vars are valid', () => {
      process.env.NODE_ENV = 'production'
      process.env.ENCRYPTION_KEY = 'abcdef0123456789'.repeat(4)
      process.env.CRON_SECRET = 'a_secure_cron_secret_value'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_valid_key'

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => validateEnv()).not.toThrow()
      expect(warnSpy).not.toHaveBeenCalled()
    })
  })
})
