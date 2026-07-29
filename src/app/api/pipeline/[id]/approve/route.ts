import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/utils/logger'
import { errorResponse } from '@/lib/utils/api-response'

const logger = new Logger('API:Pipeline:Approve')

/**
 * POST /api/pipeline/[id]/approve
 * Aprova um pipeline que está em estado awaiting_approval e o retoma.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Buscar pipeline run
    const { data: run, error } = await supabase
      .from('pipeline_runs')
      .select('*, blogs!inner(user_id)')
      .eq('id', runId)
      .single()

    if (error || !run) {
      return NextResponse.json({ error: 'Pipeline não encontrado' }, { status: 404 })
    }

    const runData = run as Record<string, unknown>
    const blogData = runData.blogs as Record<string, unknown>

    // Verificar ownership
    if (blogData.user_id !== user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Verificar estado
    if (runData.status !== 'awaiting_approval') {
      return NextResponse.json(
        { error: 'Pipeline não está aguardando aprovação' },
        { status: 409 }
      )
    }

    // Retomar pipeline: atualizar status para o próximo estágio
    const awaitingStage = (runData.awaiting_stage as string) || 'planning'
    await supabase
      .from('pipeline_runs')
      .update({
        status: 'running',
        current_stage: awaitingStage,
      })
      .eq('id', runId)

    logger.info('Pipeline aprovado', { runId, userId: user.id, resumeStage: awaitingStage })

    return NextResponse.json({ id: runId, status: 'running', resumedAt: awaitingStage })
  } catch (error) {
    return errorResponse(error, 'API:Pipeline:Approve')
  }
}
