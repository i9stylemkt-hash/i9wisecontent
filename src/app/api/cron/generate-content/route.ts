import { NextResponse } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // TODO: Implementar lógica de geração automática (Sprint 9)
    // 1. Buscar blogs ativos com artigos agendados para hoje
    // 2. Para cada artigo, executar pipeline de geração
    // 3. Salvar resultados no banco

    return NextResponse.json({
      status: 'ok',
      message: 'Cron de geração executado',
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ status: 'error', message }, { status: 500 })
  }
}
