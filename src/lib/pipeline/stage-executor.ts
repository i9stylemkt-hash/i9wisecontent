/**
 * Stage Executor — executes a single pipeline stage for an article.
 * Used by the /api/articles/[articleId]/advance endpoint.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PlannerAgent } from '@/lib/ai/agents/planner'
import { ResearcherAgent } from '@/lib/ai/agents/researcher'
import { WriterAgent } from '@/lib/ai/agents/writer'
import { ReviewerAgent } from '@/lib/ai/agents/reviewer'
import { Logger } from '@/lib/utils/logger'
import type {
  PlannerInput,
  PlannerOutput,
  ResearcherInput,
  ResearcherOutput,
  WriterInput,
  WriterOutput,
  ReviewerInput,
  ReviewerOutput,
} from '@/lib/ai/agents/types'
import { ADVANCE_MAP } from './constants'
import type { ArticleStatus, BlogConfig } from './constants'

// Re-export types from constants for convenience
export type { ArticleStatus, BlogConfig, AdvanceRequest, AdvanceResponse } from './constants'
export { ADVANCE_MAP, STAGE_LABELS } from './constants'

const logger = new Logger('StageExecutor')

// ============================================
// TYPES (additional, server-only)
// ============================================

export interface StageExecutorInput {
  articleId: string
  userId: string
  blogId: string
  targetStage: ArticleStatus
  blogConfig: BlogConfig
}

export interface StageExecutorResult {
  success: boolean
  output?: Record<string, unknown>
  error?: string
  finalStatus: ArticleStatus
}

export interface GenerationMetadata {
  planner?: PlannerOutput & { completedAt: string }
  researcher?: ResearcherOutput & { completedAt: string }
  writer?: WriterOutput & { completedAt: string }
  reviewer?: ReviewerOutput & { retryCount: number; completedAt: string }
  _meta?: {
    lastAdvancedAt: string
    lastAgent: string
    pipelineError?: string
    failedStage?: string
  }
}

// ============================================
// CONTEXT ASSEMBLY
// ============================================

/**
 * Returns the required context fields from generation_metadata for a given target stage.
 * Throws if required prior stage results are missing.
 */
export function getRequiredContext(
  targetStage: ArticleStatus,
  metadata: GenerationMetadata | null
): Record<string, unknown> {
  switch (targetStage) {
    case 'planning':
      // Planning only needs blog config + article title/content (provided separately)
      return {}

    case 'researching': {
      if (!metadata?.planner) {
        throw new Error('Dados do estágio "planejamento" não encontrados. Execute o estágio anterior primeiro.')
      }
      return {
        planTitle: metadata.planner.title,
        planAngle: metadata.planner.angle,
        planOutline: metadata.planner.outline,
        planKeywords: metadata.planner.targetKeywords,
      }
    }

    case 'writing': {
      if (!metadata?.planner) {
        throw new Error('Dados do estágio "planejamento" não encontrados. Execute o estágio anterior primeiro.')
      }
      if (!metadata?.researcher) {
        throw new Error('Dados do estágio "pesquisa" não encontrados. Execute o estágio anterior primeiro.')
      }
      return {
        planTitle: metadata.planner.title,
        planEstimatedWordCount: metadata.planner.estimatedWordCount,
        researchBriefing: metadata.researcher.briefing,
        researchKeyPoints: metadata.researcher.keyPoints,
        researchEnrichedOutline: metadata.researcher.enrichedOutline,
      }
    }

    case 'reviewing':
      // Reviewing uses article content directly (provided separately)
      return {}

    default:
      return {}
  }
}

// ============================================
// STAGE EXECUTOR
// ============================================

const MAX_REVIEWER_RETRIES = 2

export class StageExecutor {
  /**
   * Executes a single pipeline stage for the given article.
   * Loads context, invokes the agent, persists results, and updates article status.
   */
  static async execute(input: StageExecutorInput): Promise<StageExecutorResult> {
    const supabase = await createServerSupabaseClient()
    const { articleId, userId, blogId, targetStage, blogConfig } = input

    try {
      // Load article with current data
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single()

      if (fetchError || !article) {
        throw new Error('Artigo não encontrado')
      }

      const a = article as Record<string, unknown>
      const metadata: GenerationMetadata = (a.generation_metadata as GenerationMetadata) || {}

      // Validate required context
      const context = getRequiredContext(targetStage, metadata)

      // Execute the appropriate agent
      let output: Record<string, unknown>
      let finalStatus: ArticleStatus = targetStage

      switch (targetStage) {
        case 'planning': {
          const plannerInput: PlannerInput = {
            blogConfig,
            ideaTitle: (a.title as string) || undefined,
          }
          const planResult = await PlannerAgent.execute(plannerInput)
          output = { ...planResult, completedAt: new Date().toISOString() }
          metadata.planner = output as unknown as GenerationMetadata['planner']
          break
        }

        case 'researching': {
          const researcherInput: ResearcherInput = {
            blogConfig,
            topic: (context.planTitle as string) || (a.title as string),
            angle: context.planAngle as string | undefined,
          }
          const researchResult = await ResearcherAgent.execute(researcherInput)
          output = { ...researchResult, completedAt: new Date().toISOString() }
          metadata.researcher = output as unknown as GenerationMetadata['researcher']
          break
        }

        case 'writing': {
          const writerInput: WriterInput = {
            blogConfig,
            topic: (context.planTitle as string) || (a.title as string),
            briefing: (context.researchBriefing as string) || '',
            targetWordCount: (context.planEstimatedWordCount as number) || 1500,
          }
          const writeResult = await WriterAgent.execute(writerInput)
          output = { ...writeResult, completedAt: new Date().toISOString() }
          metadata.writer = output as unknown as GenerationMetadata['writer']

          // Update article content fields with writer output
          await supabase
            .from('articles')
            .update({
              title: writeResult.title,
              content_markdown: writeResult.content,
              content: writeResult.content,
              meta_description: writeResult.metaDescription,
              summary: writeResult.summary,
            })
            .eq('id', articleId)
          break
        }

        case 'reviewing': {
          const qualityThreshold = 7 // Default, could come from blog config
          const reviewerInput: ReviewerInput = {
            blogConfig,
            article: {
              title: (a.title as string) || '',
              content: (a.content_markdown as string) || (a.content as string) || '',
            },
            qualityThreshold,
          }
          const reviewResult = await ReviewerAgent.execute(reviewerInput)
          const currentRetryCount = metadata.reviewer?.retryCount || 0

          output = {
            ...reviewResult,
            retryCount: currentRetryCount,
            completedAt: new Date().toISOString(),
          }
          metadata.reviewer = output as unknown as GenerationMetadata['reviewer']

          // Determine final status based on review
          if (reviewResult.approved) {
            finalStatus = 'ready'
          } else if (currentRetryCount < MAX_REVIEWER_RETRIES) {
            // Will retry: transition back to writing with feedback
            finalStatus = 'writing'
            metadata.reviewer = {
              ...metadata.reviewer!,
              retryCount: currentRetryCount + 1,
            }
          } else {
            finalStatus = 'revision'
          }

          // Update quality score
          await supabase
            .from('articles')
            .update({ quality_score: reviewResult.overallScore })
            .eq('id', articleId)
          break
        }

        default:
          throw new Error(`Estágio inválido: ${targetStage}`)
      }

      // Update _meta
      metadata._meta = {
        lastAdvancedAt: new Date().toISOString(),
        lastAgent: ADVANCE_MAP[targetStage]?.agent || targetStage,
        pipelineError: undefined,
        failedStage: undefined,
      }

      // Persist generation_metadata and update final status
      await supabase
        .from('articles')
        .update({
          generation_metadata: metadata as unknown,
          status: finalStatus,
        })
        .eq('id', articleId)

      logger.info('Stage executed successfully', {
        articleId,
        targetStage,
        finalStatus,
      })

      return { success: true, output, finalStatus }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

      // Persist error info without overwriting existing metadata
      try {
        const { data: currentArticle } = await supabase
          .from('articles')
          .select('generation_metadata')
          .eq('id', articleId)
          .single()

        const currentMetadata = (currentArticle?.generation_metadata as GenerationMetadata) || {}
        currentMetadata._meta = {
          ...currentMetadata._meta,
          lastAdvancedAt: new Date().toISOString(),
          lastAgent: ADVANCE_MAP[targetStage]?.agent || targetStage,
          pipelineError: errorMessage,
          failedStage: targetStage,
        }

        await supabase
          .from('articles')
          .update({ generation_metadata: currentMetadata as unknown })
          .eq('id', articleId)
      } catch {
        // If even the error persistence fails, just log it
        logger.error('Failed to persist pipeline error', undefined, { articleId, targetStage })
      }

      logger.error('Stage execution failed', error instanceof Error ? error : undefined, {
        articleId,
        targetStage,
      })

      return { success: false, error: errorMessage, finalStatus: targetStage }
    }
  }
}
