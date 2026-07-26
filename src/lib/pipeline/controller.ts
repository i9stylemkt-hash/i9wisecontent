import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PlannerAgent } from '@/lib/ai/agents/planner'
import { ResearcherAgent } from '@/lib/ai/agents/researcher'
import { WriterAgent } from '@/lib/ai/agents/writer'
import { ReviewerAgent } from '@/lib/ai/agents/reviewer'
import { slugify } from '@/lib/utils'
import type { PlannerInput, ResearcherInput, WriterInput, ReviewerInput } from '@/lib/ai/agents/types'

export interface PipelineOptions {
  blogId: string
  userId: string
  ideaTitle?: string
  ideaId?: string
}

/**
 * Pipeline Controller — orchestrates the 4 AI agents in sequence
 * Planning → Research → Writing → Review
 */
export class PipelineController {
  static async execute(options: PipelineOptions) {
    const supabase = await createServerSupabaseClient()
    const startTime = Date.now()

    // 1. Load blog config
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', options.blogId)
      .eq('user_id', options.userId)
      .single()

    if (blogError || !blog) throw new Error('Blog não encontrado')
    const b = blog as Record<string, unknown>

    // 2. Create pipeline run record
    const { data: run, error: runError } = await supabase
      .from('pipeline_runs')
      .insert({
        blog_id: options.blogId,
        idea_id: options.ideaId ?? null,
        status: 'running',
        current_stage: 'planning',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (runError || !run) throw new Error('Falha ao criar pipeline run')
    const runId = (run as { id: string }).id

    const blogConfig = {
      name: b.name as string,
      niche: b.niche as string,
      toneOfVoice: b.tone_of_voice as string | null,
      authorPersona: b.author_persona as string | null,
      targetAudience: b.target_audience as string | null,
      keywords: (b.keywords as string[]) || [],
      contentLanguage: (b.content_language as string) || 'pt-BR',
    }

    try {
      // STAGE 1: Planning
      await this.updateStage(supabase, runId, 'planning')
      const plannerInput: PlannerInput = { blogConfig, ideaTitle: options.ideaTitle }
      const plan = await PlannerAgent.execute(plannerInput)

      await this.logAgent(supabase, runId, 'planner', plan)

      // STAGE 2: Research
      await this.updateStage(supabase, runId, 'research')
      const researcherInput: ResearcherInput = { blogConfig, topic: plan.title, angle: plan.angle }
      const research = await ResearcherAgent.execute(researcherInput)

      await this.logAgent(supabase, runId, 'researcher', research)

      // STAGE 3: Writing
      await this.updateStage(supabase, runId, 'generation')
      const writerInput: WriterInput = {
        blogConfig,
        topic: plan.title,
        briefing: research.briefing,
        targetWordCount: plan.estimatedWordCount,
      }
      const article = await WriterAgent.execute(writerInput)

      await this.logAgent(supabase, runId, 'writer', article)

      // STAGE 4: Review
      await this.updateStage(supabase, runId, 'review')
      const qualityThreshold = (b.quality_threshold as number) || 7
      const reviewerInput: ReviewerInput = {
        blogConfig,
        article: { title: article.title, content: article.content },
        qualityThreshold,
      }
      const review = await ReviewerAgent.execute(reviewerInput)

      await this.logAgent(supabase, runId, 'reviewer', review)

      // STAGE 5: Create article
      const status = review.approved ? 'ready' : 'revision'
      const { data: createdArticle } = await supabase
        .from('articles')
        .insert({
          blog_id: options.blogId,
          pipeline_run_id: runId,
          title: article.title,
          slug: slugify(article.title),
          meta_description: article.metaDescription,
          content_markdown: article.content,
          summary: article.summary,
          status,
          quality_score: review.overallScore,
          scoring_details: review.scores,
          tags: plan.targetKeywords,
        })
        .select()
        .single()

      // Update pipeline run as completed
      const duration = Date.now() - startTime
      await supabase
        .from('pipeline_runs')
        .update({
          status: 'completed',
          current_stage: 'completed',
          article_id: (createdArticle as { id: string } | null)?.id ?? null,
          duration_ms: duration,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId)

      return { runId, article: createdArticle, review }
    } catch (error) {
      // Mark as failed
      await supabase
        .from('pipeline_runs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: Date.now() - startTime,
        })
        .eq('id', runId)

      throw error
    }
  }

  private static async updateStage(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, runId: string, stage: string) {
    await supabase
      .from('pipeline_runs')
      .update({ current_stage: stage })
      .eq('id', runId)
  }

  private static async logAgent(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, runId: string, agentType: string, output: unknown) {
    await supabase
      .from('agent_logs')
      .insert({
        pipeline_run_id: runId,
        agent_type: agentType,
        model_used: 'auto',
        provider: 'auto',
        output_data: output,
        status: 'completed',
      })
  }
}
