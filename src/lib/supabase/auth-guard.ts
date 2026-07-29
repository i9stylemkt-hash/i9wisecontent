/**
 * Auth Guard — restringe sign-up a emails autorizados.
 *
 * ALLOWED_EMAILS é uma env var com lista de emails/domínios separados por vírgula.
 * - Match exato: "user@example.com"
 * - Match por domínio: "@example.com" (qualquer email nesse domínio)
 *
 * Se ALLOWED_EMAILS não está definida, bloqueia TODOS os cadastros (secure by default).
 */

import { Logger } from '@/lib/utils/logger'

const logger = new Logger('AuthGuard')

/**
 * Verifica se um email está autorizado a se registrar.
 *
 * @param email - Email a verificar
 * @returns true se email é permitido, false caso contrário
 */
export function isEmailAllowed(email: string): boolean {
  const allowedEmails = process.env.ALLOWED_EMAILS

  // Secure by default: se não configurado, bloqueia todos
  if (!allowedEmails) {
    logger.debug('ALLOWED_EMAILS não definida, bloqueando todos os cadastros')
    return false
  }

  const allowedList = allowedEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0)

  if (allowedList.length === 0) {
    return false
  }

  const normalizedEmail = email.toLowerCase().trim()

  const isAllowed = allowedList.some((entry) => {
    if (entry.startsWith('@')) {
      // Domain match: @domain.com
      return normalizedEmail.endsWith(entry)
    }
    // Exact match
    return normalizedEmail === entry
  })

  if (!isAllowed) {
    logger.info('Email não autorizado tentou cadastro', { email: normalizedEmail })
  }

  return isAllowed
}
