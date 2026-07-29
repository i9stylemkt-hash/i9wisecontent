export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Não autenticado') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Sem permissão') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class RateLimitExceededError extends AppError {
  constructor(
    message = 'Limite de requisições excedido',
    public retryAfterMs?: number
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429)
    this.name = 'RateLimitExceededError'
  }
}

/**
 * @deprecated Use RateLimitExceededError instead
 */
export class RateLimitError extends RateLimitExceededError {
  constructor(message = 'Limite de requisições excedido') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class PipelineTimeoutError extends AppError {
  constructor(
    public durationMs: number,
    public stage?: string
  ) {
    super(
      `Pipeline excedeu o tempo limite (${Math.round(durationMs / 1000)}s)${stage ? ` na etapa ${stage}` : ''}`,
      'PIPELINE_TIMEOUT',
      504
    )
    this.name = 'PipelineTimeoutError'
  }
}

export class ConcurrencyLimitError extends AppError {
  constructor(
    public currentRunning: number,
    public maxConcurrent: number
  ) {
    super(
      `Limite de concorrência atingido (${currentRunning}/${maxConcurrent} pipelines em execução)`,
      'CONCURRENCY_LIMIT',
      429
    )
    this.name = 'ConcurrencyLimitError'
  }
}

// Re-export PipelineTransitionError from state-machine to keep the error hierarchy accessible
export { PipelineTransitionError } from '@/lib/pipeline/state-machine'

export class AIProviderError extends AppError {
  constructor(provider: string, message: string, details?: unknown) {
    super(`[${provider}] ${message}`, 'AI_PROVIDER_ERROR', 502, details)
    this.name = 'AIProviderError'
  }
}
