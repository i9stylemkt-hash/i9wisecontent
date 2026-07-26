import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MetricsService } from '@/lib/services/metrics.service'

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'dashboard'

    if (type === 'costs') {
      const days = Number(searchParams.get('days') || 30)
      const breakdown = await MetricsService.getCostBreakdown(user.id, days)
      return NextResponse.json(breakdown)
    }

    const stats = await MetricsService.getDashboardStats(user.id)
    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar métricas' }, { status: 500 })
  }
}
