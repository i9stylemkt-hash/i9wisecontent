// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * stripAnsi — removes ANSI escape codes from strings.
 * Same regex pattern used in the audit-reporter.
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')
}

/** Common ANSI escape sequences for testing */
const ANSI_CODES = [
  '\x1B[0m',     // reset
  '\x1B[1m',     // bold
  '\x1B[31m',    // red
  '\x1B[32m',    // green
  '\x1B[33m',    // yellow
  '\x1B[34m',    // blue
  '\x1B[36m',    // cyan
  '\x1B[90m',    // gray
  '\x1B[1;31m',  // bold red
  '\x1B[38;5;196m', // 256-color
  '\x1B[4m',     // underline
  '\x1B[7m',     // reverse
  '\x1B[2J',     // clear screen
  '\x1B[H',      // cursor home
  '\x1B[1A',     // cursor up
]

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B\[[0-9;]*[A-Za-z]/

describe('Feature: audit-corrections-plan, Property 8: Strip ANSI removes escape codes', () => {
  it('output never contains ANSI escape sequences for any input with inserted codes', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 100 }).filter((s) => !s.includes('\x1B')),
            fc.constantFrom(...ANSI_CODES)
          ),
          { minLength: 1, maxLength: 20 }
        ),
        (parts) => {
          // Build input by concatenating text and ANSI codes (no interleaving inside codes)
          const input = parts.join('')
          const result = stripAnsi(input)
          expect(ANSI_REGEX.test(result)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('strings without ANSI codes are preserved unchanged', () => {
    fc.assert(
      fc.property(
        // Generate strings that don't contain ESC character
        fc.string({ minLength: 0, maxLength: 1000 }).filter((s) => !s.includes('\x1B')),
        (input) => {
          const result = stripAnsi(input)
          expect(result).toBe(input)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('all known ANSI codes are removed completely', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ANSI_CODES),
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('\x1B')),
        (ansiCode, text) => {
          const input = `${ansiCode}${text}${ansiCode}`
          const result = stripAnsi(input)
          expect(result).toBe(text)
        }
      ),
      { numRuns: 100 }
    )
  })
})
