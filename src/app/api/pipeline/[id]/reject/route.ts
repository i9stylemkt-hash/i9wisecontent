import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/utils/logger'
import { errorResponse } from '@/lib/utils/api-response'

const logger = new Logger('API:Pipeline:Reject')

/**
 * POST /api/pipeline/[id]/reject
 * Rejeita um pipeline que está em estado awaiting_approval.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const reason = (body as { reason?: string }).reason || 'Rejeitado pelo usuário'

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

    // Marcar como rejeitado
    await supabase
      .from('pipeline_runs')
      .update({
        status: 'rejected',
        error_message: reason,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)

    logger.info('Pipeline rejeitado', { runId, userId: user.id, reason })

    return NextResponse.json({ id: runId, status: 'rejected', reason })
  } catch (error) {
    return errorResponse(error, 'API:Pipeline:Reject')
  }
}
