import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { rateLimiter, RATE_LIMITS, makeRateLimitKey } from '@/lib/middleware/rate-limiter'

/**
 * Determina a categoria de rate limit baseado no path.
 * Retorna null se não deve aplicar rate limit.
 */
function getRateLimitCategory(pathname: string): keyof typeof RATE_LIMITS | null {
  if (pathname.startsWith('/api/pipeline')) return 'pipeline'
  if (pathname.startsWith('/api/auth') || pathname === '/login' || pathname === '/register') return 'auth'
  if (pathname.startsWith('/api/')) return 'crud'
  return null
}

/**
 * Extrai identificador para rate limiting.
 * Para rotas autenticadas: usa cookie de sessão como proxy do userId.
 * Para rotas auth: usa IP.
 */
function extractIdentifier(request: NextRequest, category: string): string {
  if (category === 'auth') {
    // Usar IP para rotas de auth (sem sessão ainda)
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown-ip'
  }
  // Para rotas autenticadas, usar cookie de sessão como proxy
  const sessionCookie = request.cookies.get('sb-access-token')?.value
    ?? request.cookies.get('sb-refresh-token')?.value
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
  return sessionCookie.slice(0, 32) // Usar só um prefixo como key
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limiting para rotas de API
  const category = getRateLimitCategory(pathname)
  if (category) {
    const config = RATE_LIMITS[category]
    if (config) {
      const identifier = extractIdentifier(request, category)
      const key = makeRateLimitKey(identifier, category)
      const result = rateLimiter.check(key, config)

      if (!result.allowed) {
        return NextResponse.json(
          { error: 'Limite de requisições excedido', retryAfter: result.retryAfterMs },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((result.retryAfterMs ?? 60000) / 1000)),
            },
          }
        )
      }
    }
  }

  // Session refresh (autenticação Supabase)
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
