import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runScheduler } from '@/lib/pipeline/scheduler'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Get all users with active blogs (for the scheduler to process)
    const { data: users } = await supabase
      .from('blogs')
      .select('user_id')
      .eq('is_active', true)

    const uniqueUserIds = [...new Set((users || []).map((u) => (u as { user_id: string }).user_id))]

    const allResults = []
    for (const userId of uniqueUserIds) {
      const result = await runScheduler(userId)
      allResults.push({ userId, ...result })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Cron de geração executado',
      timestamp: new Date().toISOString(),
      results: allResults,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ status: 'error', message }, { status: 500 })
  }
}
