import { createAdminClient } from '@/lib/supabase/admin'
import { PipelineController } from './controller'
import { Logger } from '@/lib/utils/logger'

const logger = new Logger('Scheduler')

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
 * Scheduler — evaluates which blogs need content and triggers pipelines.
 * Uses admin client (service role key) to bypass RLS, since cron jobs
 * don't have a user session with cookies.
 */
export async function runScheduler(userId: string): Promise<SchedulerResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY is missing or empty — aborting scheduler run')
    return { triggered: 0, results: [] }
  }

  const supabase = createAdminClient()

  // Get all active blogs for the user
  const { data: blogs, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !blogs) {
    logger.error('Failed to fetch blogs for scheduling', error ?? undefined, { userId })
    return { triggered: 0, results: [] }
  }

  const results: SchedulerResult['results'] = []

  for (const blog of blogs) {
    const b = blog as Record<string, unknown>
    const blogId = b.id as string
    const frequency = (b.publication_frequency as string) || 'weekly'
    const intervalDays = FREQUENCY_DAYS[frequency] || 7

    // Check last article creation date for this blog
    const { data: lastArticle } = await supabase
      .from('articles')
      .select('created_at')
      .eq('blog_id', blogId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lastDate = lastArticle
      ? new Date((lastArticle as { created_at: string }).created_at)
      : new Date(0)
    const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSince >= intervalDays) {
      try {
        await PipelineController.enqueue({
          blogId,
          userId,
        })
        results.push({ blogId, status: 'enqueued' })
        logger.info('Pipeline enqueued by scheduler', { blogId, daysSince, frequency })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results.push({ blogId, status: 'error', error: errorMessage })
        logger.error('Scheduler pipeline enqueue failed', err instanceof Error ? err : undefined, {
          blogId,
          frequency,
        })
      }
    }
  }

  logger.info('Scheduler run completed', {
    userId,
    totalBlogs: blogs.length,
    triggered: results.filter((r) => r.status === 'enqueued').length,
  })

  return { triggered: results.filter((r) => r.status === 'enqueued').length, results }
}
