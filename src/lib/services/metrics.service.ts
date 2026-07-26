import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface DashboardStats {
  totalArticles: number
  monthCost: number
  avgScore: number
  activeBlogs: number
  articlesThisWeek: number
}

export interface CostBreakdown {
  total: number
  byProvider: Array<{ provider: string; cost: number }>
  byDay: Array<{ date: string; cost: number }>
}

export class MetricsService {
  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    const supabase = await createServerSupabaseClient()

    // Total articles
    const { count: totalArticles } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('blogs.user_id', userId)
      .in('status', ['ready', 'published'])

    // Active blogs
    const { count: activeBlogs } = await supabase
      .from('blogs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)

    // Articles this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: articlesThisWeek } = await supabase
      .from('articles')
      .select('*, blogs!inner(user_id)', { count: 'exact', head: true })
      .eq('blogs.user_id', userId)
      .gte('created_at', weekAgo)

    // Month cost
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { data: costs } = await supabase
      .from('cost_metrics')
      .select('cost_brl')
      .gte('created_at', monthStart)

    const monthCost = (costs || []).reduce(
      (sum, c) => sum + Number((c as { cost_brl: string }).cost_brl || 0),
      0
    )

    // Avg score
    const { data: scores } = await supabase
      .from('articles')
      .select('quality_score, blogs!inner(user_id)')
      .eq('blogs.user_id', userId)
      .not('quality_score', 'is', null)

    const validScores = (scores || []).map((s) => (s as { quality_score: number }).quality_score)
    const avgScore = validScores.length > 0
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length
      : 0

    return {
      totalArticles: totalArticles || 0,
      monthCost: Math.round(monthCost * 100) / 100,
      avgScore: Math.round(avgScore * 10) / 10,
      activeBlogs: activeBlogs || 0,
      articlesThisWeek: articlesThisWeek || 0,
    }
  }

  static async getCostBreakdown(userId: string, days = 30): Promise<CostBreakdown> {
    const supabase = await createServerSupabaseClient()
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: metrics } = await supabase
      .from('cost_metrics')
      .select('provider, cost_brl, created_at')
      .gte('created_at', since)

    if (!metrics) return { total: 0, byProvider: [], byDay: [] }

    const total = metrics.reduce((sum, m) => sum + Number((m as Record<string, unknown>).cost_brl || 0), 0)

    // By provider
    const providerMap = new Map<string, number>()
    for (const m of metrics) {
      const mr = m as Record<string, unknown>
      const provider = mr.provider as string
      providerMap.set(provider, (providerMap.get(provider) || 0) + Number(mr.cost_brl || 0))
    }
    const byProvider = Array.from(providerMap.entries()).map(([provider, cost]) => ({ provider, cost: Math.round(cost * 100) / 100 }))

    // By day
    const dayMap = new Map<string, number>()
    for (const m of metrics) {
      const mr = m as Record<string, unknown>
      const date = (mr.created_at as string).split('T')[0] ?? ''
      dayMap.set(date, (dayMap.get(date) || 0) + Number(mr.cost_brl || 0))
    }
    const byDay = Array.from(dayMap.entries())
      .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return { total: Math.round(total * 100) / 100, byProvider, byDay }
  }
}
