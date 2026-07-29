/**
 * API Response Handler — centralizes error-to-HTTP-response mapping.
 * - Logs full error details server-side via Logger
 * - Returns safe, generic messages to the client in production
 * - Includes debug info in development
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Logger } from './logger'
import { AppError } from './errors'

export function errorResponse(error: unknown, context: string): NextResponse {
  const logger = new Logger(context)

  // Zod validation errors: safe to expose field-level details
  if (error instanceof ZodError) {
    logger.warn('Validation error', { issues: error.issues })
    return NextResponse.json(
      {
        error: 'Dados inválidos',
        details: error.issues.map((i) => i.message),
      },
      { status: 400 }
    )
  }

  // Known application errors: use configured status code
  if (error instanceof AppError) {
    logger.error(`AppError [${error.code}]`, error, { statusCode: error.statusCode })
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: getClientMessage(error),
        code: error.code,
        ...(isDev && { debug: error.message }),
      },
      { status: error.statusCode }
    )
  }

  // Unknown errors: log full detail, return generic message
  const err = error instanceof Error ? error : new Error(String(error))
  logger.error('Unhandled error', err)

  const isDev = process.env.NODE_ENV === 'development'
  return NextResponse.json(
    {
      error: 'Erro interno do servidor',
      ...(isDev && { debug: err.message }),
    },
    { status: 500 }
  )
}

/**
 * Maps AppError codes to safe client-facing messages.
 * In production, these prevent leaking internal details.
 */
function getClientMessage(error: AppError): string {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return 'Dados inválidos'
    case 'AUTHENTICATION_ERROR':
      return 'Não autenticado'
    case 'AUTHORIZATION_ERROR':
      return 'Sem permissão'
    case 'NOT_FOUND':
      return 'Recurso não encontrado'
    case 'RATE_LIMIT_EXCEEDED':
      return 'Limite de requisições excedido'
    case 'PIPELINE_TRANSITION_ERROR':
      return 'Operação inválida para o estado atual do pipeline'
    case 'PIPELINE_TIMEOUT':
      return 'Pipeline excedeu o tempo limite'
    case 'CONCURRENCY_LIMIT':
      return 'Limite de execuções simultâneas atingido'
    case 'AI_PROVIDER_ERROR':
      return 'Erro ao processar com IA'
    default:
      return 'Erro interno do servidor'
  }
}

/**
 * Creates a success response with standard shape.
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}
