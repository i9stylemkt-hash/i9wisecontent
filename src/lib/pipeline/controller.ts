import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PlannerAgent } from '@/lib/ai/agents/planner'
import { ResearcherAgent } from '@/lib/ai/agents/researcher'
import { WriterAgent } from '@/lib/ai/agents/writer'
import { ReviewerAgent } from '@/lib/ai/agents/reviewer'
import { PipelineStateMachine } from './state-machine'
import { Logger } from '@/lib/utils/logger'
import { PipelineTimeoutError } from '@/lib/utils/errors'
import { slugify } from '@/lib/utils'
import type {
  PlannerInput,
  ResearcherInput,
  WriterInput,
  ReviewerInput,
  WriterOutput,
  ReviewerOutput,
} from '@/lib/ai/agents/types'

const logger = new Logger('PipelineController')

export interface PipelineOptions {
  blogId: string
  userId: string
  ideaTitle?: string
  ideaId?: string
  runId?: string // para resumir de approval gate
}

export type AutomationLevel = 'manual' | 'semi_auto' | 'full_auto'

export interface PipelineExecutionResult {
  runId: string
  status: 'completed' | 'failed' | 'awaiting_approval' | 'revision'
  articleId?: string
  error?: string
}

/**
 * Pipeline Controller — orquestra os 4 agentes de IA em sequência.
 * Usa PipelineStateMachine para validar todas as transições.
 * Suporta retry automático com feedback do Reviewer.
 */
export class PipelineController {
  private static readonly MAX_DURATION_MS = 10 * 60 * 1000 // 10 minutos
  private static readonly MAX_RETRIES = 2

  /**
   * Cria pipeline_run com status "queued" e retorna ID.
   * Usado quando o API route precisa retornar 202 imediatamente.
   */
  static async enqueue(options: PipelineOptions): Promise<string> {
    const supabase = await createServerSupabaseClient()

    const { data: run, error: runError } = await supabase
      .from('pipeline_runs')
      .insert({
        blog_id: options.blogId,
        idea_id: options.ideaId ?? null,
        status: 'queued',
        current_stage: 'queued',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (runError || !run) {
      logger.error('Falha ao criar pipeline run', runError ?? undefined, {
        blogId: options.blogId,
      })
      throw new Error('Falha ao criar pipeline run')
    }

    const runId = (run as { id: string }).id
    logger.info('Pipeline enqueued', { runId, blogId: options.blogId })
    return runId
  }

  /**
   * Executa o pipeline completo com state machine e retry.
   * Planning → Research → Writing → Review (→ Retry se score baixo)
   */
  static async execute(options: PipelineOptions): Promise<PipelineExecutionResult> {
    const supabase = await createServerSupabaseClient()
    const startTime = Date.now()

    // Timeout via AbortController
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), this.MAX_DURATION_MS)

    // Se já tem runId (chamado via enqueue), usar; senão criar
    let runId = options.runId
    if (!runId) {
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
      runId = (run as { id: string }).id
    }

    // Iniciar state machine
    const sm = new PipelineStateMachine('queued')

    // 1. Carregar config do blog
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', options.blogId)
      .eq('user_id', options.userId)
      .single()

    if (blogError || !blog) {
      await this.markFailed(supabase, runId, 'Blog não encontrado', startTime)
      return { runId, status: 'failed', error: 'Blog não encontrado' }
    }

    const b = blog as Record<string, unknown>
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
      sm.transition('planning')
      await this.updateStage(supabase, runId, 'planning')
      logger.info('Stage: planning', { runId })
      this.checkAbort(abortController, 'planning')

      const plannerInput: PlannerInput = { blogConfig, ideaTitle: options.ideaTitle }
      const plan = await PlannerAgent.execute(plannerInput)
      await this.logAgent(supabase, runId, 'planner', plan)

      // STAGE 2: Research
      sm.transition('researching')
      await this.updateStage(supabase, runId, 'research')
      logger.info('Stage: researching', { runId })
      this.checkAbort(abortController, 'researching')

      const researcherInput: ResearcherInput = {
        blogConfig,
        topic: plan.title,
        angle: plan.angle,
      }
      const research = await ResearcherAgent.execute(researcherInput)
      await this.logAgent(supabase, runId, 'researcher', research)

      // STAGE 3: Writing
      sm.transition('writing')
      await this.updateStage(supabase, runId, 'generation')
      logger.info('Stage: writing', { runId })
      this.checkAbort(abortController, 'writing')

      const writerInput: WriterInput = {
        blogConfig,
        topic: plan.title,
        briefing: research.briefing,
        targetWordCount: plan.estimatedWordCount,
      }
      let article: WriterOutput = await WriterAgent.execute(writerInput)
      await this.logAgent(supabase, runId, 'writer', article)

      // STAGE 4: Review
      sm.transition('reviewing')
      await this.updateStage(supabase, runId, 'review')
      logger.info('Stage: reviewing', { runId })
      this.checkAbort(abortController, 'reviewing')

      const qualityThreshold = (b.quality_threshold as number) || 7
      const reviewerInput: ReviewerInput = {
        blogConfig,
        article: { title: article.title, content: article.content },
        qualityThreshold,
      }
      let review: ReviewerOutput = await ReviewerAgent.execute(reviewerInput)
      await this.logAgent(supabase, runId, 'reviewer', review)

      // RETRY LOOP: se não aprovado e score abaixo do threshold, reescrever com feedback
      let retryCount = 0
      while (!review.approved && retryCount < this.MAX_RETRIES) {
        retryCount++
        logger.info('Retry com feedback do reviewer', {
          runId,
          attempt: retryCount,
          score: review.overallScore,
          threshold: qualityThreshold,
        })

        // Voltar para writing: reviewing → revision → writing
        sm.transition('revision')
        sm.transition('writing')
        await this.updateStage(supabase, runId, 'generation')
        this.checkAbort(abortController, 'writing')

        // Reescrever com feedback
        article = await this.retryWithFeedback(blogConfig, writerInput, review, retryCount)
        await this.logAgent(supabase, runId, 'writer', { ...article, retryAttempt: retryCount })

        // Re-review
        sm.transition('reviewing')
        await this.updateStage(supabase, runId, 'review')
        this.checkAbort(abortController, 'reviewing')

        const retryReviewInput: ReviewerInput = {
          blogConfig,
          article: { title: article.title, content: article.content },
          qualityThreshold,
        }
        review = await ReviewerAgent.execute(retryReviewInput)
        await this.logAgent(supabase, runId, 'reviewer', {
          ...review,
          retryAttempt: retryCount,
        })
      }

      // Decidir resultado final
      let finalStatus: 'completed' | 'revision'
      let articleStatus: string
      if (review.approved) {
        finalStatus = 'completed'
        articleStatus = 'ready'
      } else {
        // Após max retries sem aprovação, marcar para revisão humana
        finalStatus = 'revision'
        articleStatus = 'revision'
        logger.warn('Pipeline esgotou retries sem aprovação', {
          runId,
          retries: retryCount,
          finalScore: review.overallScore,
        })
      }

      // Transição final
      sm.transition(finalStatus)

      // Criar artigo
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
          status: articleStatus,
          quality_score: review.overallScore,
          scoring_details: review.scores,
          tags: plan.targetKeywords,
        })
        .select()
        .single()

      const articleId = (createdArticle as { id: string } | null)?.id ?? undefined

      // Atualizar pipeline run
      const duration = Date.now() - startTime
      await supabase
        .from('pipeline_runs')
        .update({
          status: finalStatus,
          current_stage: finalStatus,
          article_id: articleId ?? null,
          duration_ms: duration,
          retry_count: retryCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId)

      logger.info('Pipeline concluído', {
        runId,
        status: finalStatus,
        articleId,
        duration,
        retries: retryCount,
      })

      return { runId, status: finalStatus, articleId }
    } catch (error) {
      if (abortController.signal.aborted) {
        const duration = Date.now() - startTime
        const timeoutError = new PipelineTimeoutError(duration, sm.state)
        await this.markFailed(supabase, runId, timeoutError.message, startTime)
        logger.error('Pipeline timeout', timeoutError, { runId, stage: sm.state })
        return { runId, status: 'failed', error: timeoutError.message }
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.markFailed(supabase, runId, errorMessage, startTime)
      logger.error('Pipeline falhou', error instanceof Error ? error : undefined, {
        runId,
        stage: sm.state,
      })
      return { runId, status: 'failed', error: errorMessage }
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Reescreve artigo incorporando feedback do reviewer.
   */
  private static async retryWithFeedback(
    blogConfig: WriterInput['blogConfig'],
    originalInput: WriterInput,
    review: ReviewerOutput,
    attempt: number
  ): Promise<WriterOutput> {
    const feedbackTemplate = `REESCRITA (tentativa ${attempt}/${this.MAX_RETRIES}):
    
O artigo anterior recebeu score ${review.overallScore}/10 e NÃO foi aprovado.

Feedback do revisor:
${review.feedback}

Sugestões específicas:
${review.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Scores por critério:
- Gramática: ${review.scores.grammar}/10
- Coerência: ${review.scores.coherence}/10
- Tom: ${review.scores.toneAdherence}/10
- SEO: ${review.scores.seo}/10
- Originalidade: ${review.scores.originality}/10
- Legibilidade: ${review.scores.readability}/10

Por favor, reescreva o artigo corrigindo os problemas apontados.`

    const retryInput: WriterInput = {
      ...originalInput,
      template: feedbackTemplate,
    }

    return WriterAgent.execute(retryInput)
  }

  /**
   * Verifica se o pipeline deve pausar para aprovação nesta etapa.
   * - "manual": pausa após cada etapa
   * - "semi_auto": pausa apenas após revisão
   * - "full_auto": nunca pausa
   */
  static shouldPauseForApproval(
    automationLevel: AutomationLevel,
    currentStage: string
  ): boolean {
    switch (automationLevel) {
      case 'manual':
        return true // pausa após cada etapa
      case 'semi_auto':
        return currentStage === 'reviewing' // pausa apenas após revisão
      case 'full_auto':
        return false
      default:
        return false
    }
  }

  /**
   * Pausa o pipeline para aguardar aprovação humana.
   */
  private static async pauseForApproval(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    runId: string,
    awaitingStage: string
  ): Promise<void> {
    await supabase
      .from('pipeline_runs')
      .update({
        status: 'awaiting_approval',
        current_stage: 'awaiting_approval',
        awaiting_stage: awaitingStage,
      })
      .eq('id', runId)

    logger.info('Pipeline pausado para aprovação', { runId, awaitingStage })
  }

  private static checkAbort(controller: AbortController, stage: string): void {
    if (controller.signal.aborted) {
      throw new PipelineTimeoutError(this.MAX_DURATION_MS, stage)
    }
  }

  private static async markFailed(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    runId: string,
    errorMessage: string,
    startTime: number
  ): Promise<void> {
    await supabase
      .from('pipeline_runs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        duration_ms: Date.now() - startTime,
      })
      .eq('id', runId)
  }

  private static async updateStage(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    runId: string,
    stage: string
  ): Promise<void> {
    await supabase
      .from('pipeline_runs')
      .update({ current_stage: stage })
      .eq('id', runId)
  }

  private static async logAgent(
    supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
    runId: string,
    agentType: string,
    output: unknown
  ): Promise<void> {
    await supabase.from('agent_logs').insert({
      pipeline_run_id: runId,
      agent_type: agentType,
      model_used: 'auto',
      provider: 'auto',
      output_data: output,
      status: 'completed',
    })
  }
}
