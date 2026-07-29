import { validateEnv } from '@/lib/utils/env-validator'

/**
 * Next.js Instrumentation — runs once on server startup.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export function register() {
  validateEnv()
}
