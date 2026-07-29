// @vitest-environment node

/**
 * Property Test — Task 5.11
 * Property 8: Email Authorization Enforcement
 *
 * Para qualquer email, `isEmailAllowed(email)` retorna true sse email
 * corresponde a entrada na ALLOWED_EMAILS (match exato ou domínio).
 * Se ALLOWED_EMAILS undefined, retorna false para todos.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { isEmailAllowed } from '@/lib/supabase/auth-guard'

// Arbitrary para gerar emails válidos
const emailLocalArb = fc.stringMatching(/^[a-z][a-z0-9]{0,15}$/)
const domainArb = fc.stringMatching(/^[a-z][a-z0-9]{0,10}\.[a-z]{2,4}$/)
const emailArb = fc.tuple(emailLocalArb, domainArb).map(([local, domain]) => `${local}@${domain}`)

describe('Auth Guard — Property Tests', () => {
  const originalEnv = process.env.ALLOWED_EMAILS

  beforeEach(() => {
    delete process.env.ALLOWED_EMAILS
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ALLOWED_EMAILS = originalEnv
    } else {
      delete process.env.ALLOWED_EMAILS
    }
  })

  describe('ALLOWED_EMAILS undefined', () => {
    it('Property 8: retorna false para qualquer email quando ALLOWED_EMAILS não definida', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          delete process.env.ALLOWED_EMAILS
          expect(isEmailAllowed(email)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Exact match', () => {
    it('Property 8: retorna true para email com exact match', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          process.env.ALLOWED_EMAILS = email
          expect(isEmailAllowed(email)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 8: retorna false para email que não está na lista', () => {
      fc.assert(
        fc.property(emailArb, emailArb, (allowedEmail, testEmail) => {
          // Garante que são diferentes
          fc.pre(allowedEmail.toLowerCase() !== testEmail.toLowerCase())
          process.env.ALLOWED_EMAILS = allowedEmail
          expect(isEmailAllowed(testEmail)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 8: match exato funciona com múltiplos emails na lista', () => {
      fc.assert(
        fc.property(
          fc.array(emailArb, { minLength: 2, maxLength: 5 }),
          fc.nat(),
          (emails, indexSeed) => {
            // Garante emails únicos
            const uniqueEmails = [...new Set(emails.map((e) => e.toLowerCase()))]
            fc.pre(uniqueEmails.length >= 2)

            process.env.ALLOWED_EMAILS = uniqueEmails.join(',')
            const targetIndex = indexSeed % uniqueEmails.length
            expect(isEmailAllowed(uniqueEmails[targetIndex])).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Domain match', () => {
    it('Property 8: retorna true para qualquer email do domínio permitido', () => {
      fc.assert(
        fc.property(emailLocalArb, domainArb, (local, domain) => {
          process.env.ALLOWED_EMAILS = `@${domain}`
          const email = `${local}@${domain}`
          expect(isEmailAllowed(email)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 8: retorna false para email de domínio diferente', () => {
      fc.assert(
        fc.property(emailLocalArb, domainArb, domainArb, (local, allowedDomain, testDomain) => {
          fc.pre(allowedDomain.toLowerCase() !== testDomain.toLowerCase())
          process.env.ALLOWED_EMAILS = `@${allowedDomain}`
          const email = `${local}@${testDomain}`
          expect(isEmailAllowed(email)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Case insensitivity', () => {
    it('Property 8: match é case-insensitive para exact match', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          process.env.ALLOWED_EMAILS = email.toLowerCase()
          // Testa com versão uppercase
          expect(isEmailAllowed(email.toUpperCase())).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 8: match é case-insensitive para domain match', () => {
      fc.assert(
        fc.property(emailLocalArb, domainArb, (local, domain) => {
          process.env.ALLOWED_EMAILS = `@${domain.toLowerCase()}`
          const email = `${local}@${domain.toUpperCase()}`
          expect(isEmailAllowed(email)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Empty/whitespace ALLOWED_EMAILS', () => {
    it('Property 8: retorna false quando ALLOWED_EMAILS é string vazia', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          process.env.ALLOWED_EMAILS = ''
          expect(isEmailAllowed(email)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('Property 8: retorna false quando ALLOWED_EMAILS só tem espaços/vírgulas', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          process.env.ALLOWED_EMAILS = ' , , , '
          expect(isEmailAllowed(email)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })
})
