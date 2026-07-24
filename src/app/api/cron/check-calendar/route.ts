import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // TODO: Implementar verificação do calendário editorial (Sprint 9)
    // 1. Buscar itens do calendário para hoje
    // 2. Criar tarefas de IA para itens pendentes
    // 3. Notificar usuário se necessário

    return NextResponse.json({
      status: 'ok',
      message: 'Calendário verificado',
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ status: 'error', message }, { status: 500 })
  }
}
