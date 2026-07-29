import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { advanceRequestSchema } from '@/lib/validations/article'
import { isValidTransition } from '@/lib/validations/article'
import { ADVANCE_MAP, StageExecutor } from '@/lib/pipeline/stage-executor'
import type { BlogConfig, ArticleStatus, AdvanceResponse } from '@/lib/pipeline/constants'
import { Logger } from '@/lib/utils/logger'

const logger = new Logger('API:ArticleAdvance')

export const maxDuration = 300

export async function POST(
  request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const parsed = advanceRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Fetch article with blog info to verify ownership
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('*, blogs!inner(user_id, name, niche, tone_of_voice, author_persona, target_audience, keywords, content_language, quality_threshold)')
      .eq('id', articleId)
      .eq('blogs.user_id', user.id)
      .single()

    if (fetchError || !article) {
      return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 })
    }

    const a = article as Record<string, unknown>
    const currentStatus = (a.status as ArticleStatus) || 'idea'
    const blogData = a.blogs as Record<string, unknown>

    // Check if this status can advance
    const advanceInfo = ADVANCE_MAP[currentStatus]
    if (!advanceInfo) {
      return NextResponse.json(
        {
          error: `O artigo no status "${currentStatus}" não pode avançar automaticamente.`,
          currentStatus,
          attemptedTarget: 'next',
        },
        { status: 422 }
      )
    }

    const { nextStatus, agent } = advanceInfo

    // Validate transition
    if (!isValidTransition(currentStatus, nextStatus)) {
      return NextResponse.json(
        {
          error: `Transição inválida: ${currentStatus} → ${nextStatus}`,
          currentStatus,
          attemptedTarget: nextStatus,
        },
        { status: 422 }
      )
    }

    // Save current content atomically + update status
    const updateData: Record<string, unknown> = {
      title: parsed.data.title,
      content_markdown: parsed.data.contentMarkdown,
      content: parsed.data.contentMarkdown,
      status: nextStatus,
    }
    if (parsed.data.metaDescription) {
      updateData.meta_description = parsed.data.metaDescription
    }

    const { error: updateError } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', articleId)

    if (updateError) {
      logger.error('Failed to save and advance article', updateError)
      return NextResponse.json({ error: 'Erro ao salvar artigo' }, { status: 500 })
    }

    // Build blog config for agent
    const blogConfig: BlogConfig = {
      name: (blogData.name as string) || '',
      niche: (blogData.niche as string) || '',
      toneOfVoice: (blogData.tone_of_voice as string) || null,
      authorPersona: (blogData.author_persona as string) || null,
      targetAudience: (blogData.target_audience as string) || null,
      keywords: (blogData.keywords as string[]) || [],
      contentLanguage: (blogData.content_language as string) || 'pt-BR',
    }

    // Execute agent in background
    after(async () => {
      try {
        await StageExecutor.execute({
          articleId,
          userId: user.id,
          blogId: a.blog_id as string,
          targetStage: nextStatus,
          blogConfig,
        })
        logger.info('Stage executor completed', { articleId, stage: nextStatus })
      } catch (error) {
        logger.error('Stage executor failed in background', error instanceof Error ? error : undefined, {
          articleId,
          stage: nextStatus,
        })
      }
    })

    // Return 202 immediately
    const response: AdvanceResponse = {
      articleId,
      previousStatus: currentStatus,
      newStatus: nextStatus,
      targetStage: nextStatus as 'planning' | 'researching' | 'writing' | 'reviewing',
      message: `Artigo avançado para ${nextStatus}. Agente "${agent}" executando em background.`,
    }

    return NextResponse.json(response, { status: 202 })
  } catch (error) {
    logger.error('Advance endpoint error', error instanceof Error ? error : undefined)
    const msg = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
