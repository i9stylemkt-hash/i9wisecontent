import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PipelineController } from './controller'

interface SchedulerResult {
  triggered: number
  results: Array<{ blogId: string; status: string; error?: string }>
}

const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  twice_weekly: 3,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

/**
 * Scheduler — evaluates which blogs need content and triggers pipelines
 */
export async function runScheduler(userId: string): Promise<SchedulerResult> {
  const supabase = await createServerSupabaseClient()

  // Get all active blogs for the user
  const { data: blogs, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !blogs) return { triggered: 0, results: [] }

  const results: SchedulerResult['results'] = []

  for (const blog of blogs) {
    const b = blog as Record<string, unknown>
    const frequency = (b.publication_frequency as string) || 'weekly'
    const intervalDays = FREQUENCY_DAYS[frequency] || 7

    // Check last article creation date for this blog
    const { data: lastArticle } = await supabase
      .from('articles')
      .select('created_at')
      .eq('blog_id', b.id as string)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lastDate = lastArticle
      ? new Date((lastArticle as { created_at: string }).created_at)
      : new Date(0)
    const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSince >= intervalDays) {
      try {
        await PipelineController.execute({
          blogId: b.id as string,
          userId,
        })
        results.push({ blogId: b.id as string, status: 'triggered' })
      } catch (err) {
        results.push({
          blogId: b.id as string,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
  }

  return { triggered: results.filter((r) => r.status === 'triggered').length, results }
}
