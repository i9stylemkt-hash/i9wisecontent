/**
 * Structured Logger — replaces raw console.log/error with context-aware,
 * sanitized logging that formats differently per environment.
 *
 * - Dev: pretty-printed, human-readable
 * - Prod: JSON single-line (machine-parseable)
 * - Sensitive fields are always redacted
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  context: string
  message: string
  metadata?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const SENSITIVE_FIELDS = [
  'apikey',
  'password',
  'token',
  'secret',
  'key_encrypted',
  'authorization',
]

function getConfiguredLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase()
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel as LogLevel
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

function isSensitiveField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase()
  // Normalize by removing separators (underscores, hyphens) for matching
  const normalized = lower.replace(/[-_]/g, '')
  return SENSITIVE_FIELDS.some((sensitive) => {
    const normalizedSensitive = sensitive.replace(/[-_]/g, '')
    return lower.includes(sensitive) || normalized.includes(normalizedSensitive)
  })
}

/**
 * Deep-sanitize an object, replacing sensitive field values with "[REDACTED]".
 * Handles nested objects and arrays recursively.
 */
export function sanitize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item))
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveField(key)) {
      result[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitize(value)
    } else {
      result[key] = value
    }
  }
  return result
}

export class Logger {
  private readonly context: string
  private readonly minLevel: LogLevel

  constructor(context: string) {
    this.context = context
    this.minLevel = getConfiguredLevel()
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, undefined, metadata)
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, undefined, metadata)
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log('error', message, error, metadata)
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, undefined, metadata)
  }

  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
    }

    if (metadata) {
      entry.metadata = sanitize(metadata) as Record<string, unknown>
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    const output = this.format(entry)

    switch (level) {
      case 'error':
        console.error(output)
        break
      case 'warn':
        console.warn(output)
        break
      case 'debug':
        console.debug(output)
        break
      default:
        console.info(output)
    }
  }

  private format(entry: LogEntry): string {
    const isDev = process.env.NODE_ENV !== 'production'

    if (isDev) {
      const levelColors: Record<LogLevel, string> = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
      }
      const reset = '\x1b[0m'
      const color = levelColors[entry.level]

      let output = `${color}[${entry.level.toUpperCase()}]${reset} [${entry.context}] ${entry.message}`

      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        output += `\n  ${JSON.stringify(entry.metadata, null, 2)}`
      }

      if (entry.error) {
        output += `\n  Error: ${entry.error.name}: ${entry.error.message}`
        if (entry.error.stack) {
          output += `\n  ${entry.error.stack}`
        }
      }

      return output
    }

    // Production: compact JSON single-line
    return JSON.stringify(entry)
  }
}
