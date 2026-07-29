/**
 * Environment Variable Validator — validates required env vars at startup.
 *
 * - Dev (NODE_ENV !== 'production'): warns via Logger, does not throw
 * - Prod (NODE_ENV === 'production'): throws Error with descriptive message
 */

import { Logger } from '@/lib/utils/logger'

const logger = new Logger('EnvValidator')

export interface EnvRule {
  name: string
  validate: (value: string | undefined) => boolean
  message: string
}

const GENERATION_CMD = 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'

const rules: EnvRule[] = [
  {
    name: 'ENCRYPTION_KEY',
    validate: (value) => !!value && /^[0-9a-fA-F]{64}$/.test(value),
    message: `ENCRYPTION_KEY must be present and exactly 64 hex characters. Generate with: ${GENERATION_CMD}`,
  },
  {
    name: 'CRON_SECRET',
    validate: (value) => !!value && value.length >= 16,
    message: `CRON_SECRET must be present and at least 16 characters. Generate with: ${GENERATION_CMD}`,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    validate: (value) => !!value && value.trim().length > 0,
    message: 'SUPABASE_SERVICE_ROLE_KEY must be present and non-empty.',
  },
]

/**
 * Validates required environment variables.
 * In development: emits Logger.warn for each invalid var.
 * In production: throws Error on first invalid var.
 */
export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production'

  for (const rule of rules) {
    const value = process.env[rule.name]
    const isValid = rule.validate(value)

    if (!isValid) {
      if (isProd) {
        throw new Error(`[ENV] ${rule.message}`)
      } else {
        logger.warn(`[ENV WARNING] ${rule.message}`)
      }
    }
  }
}
