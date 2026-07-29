import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PipelineController } from '@/lib/pipeline/controller'
import { Logger } from '@/lib/utils/logger'
import { errorResponse } from '@/lib/utils/api-response'

const logger = new Logger('API:Pipeline')

/**
 * Configura timeout máximo para a rota (Vercel serverless).
 * 300 seconds = 5 minutos (max no plano Pro).
 */
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { blogId, ideaTitle, ideaId } = await request.json()
    if (!blogId) {
      return NextResponse.json({ error: 'blogId é obrigatório' }, { status: 400 })
    }

    // Criar pipeline run no banco (status queued)
    const { data: run, error: runError } = await supabase
      .from('pipeline_runs')
      .insert({
        blog_id: blogId,
        idea_id: ideaId ?? null,
        status: 'queued',
        current_stage: 'queued',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (runError || !run) {
      logger.error('Falha ao criar pipeline run', runError ?? undefined)
      return NextResponse.json({ error: 'Falha ao iniciar pipeline' }, { status: 500 })
    }

    const runId = (run as { id: string }).id

    // Executar pipeline em background via after() do Next.js
    after(async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000) // 10 min

      try {
        await PipelineController.execute({
          blogId,
          userId: user.id,
          ideaTitle,
          ideaId,
        })
        logger.info('Pipeline concluído com sucesso', { runId, blogId })
      } catch (error) {
        if (controller.signal.aborted) {
          logger.error('Pipeline abortado por timeout', undefined, { runId, blogId })
          await supabase
            .from('pipeline_runs')
            .update({
              status: 'failed',
              error_message: 'Pipeline excedeu o tempo limite (10 minutos)',
            })
            .eq('id', runId)
        } else {
          logger.error(
            'Pipeline falhou',
            error instanceof Error ? error : undefined,
            { runId, blogId }
          )
        }
      } finally {
        clearTimeout(timeout)
      }
    })

    // Retornar 202 Accepted imediatamente
    return NextResponse.json(
      { id: runId, status: 'queued', message: 'Pipeline iniciado em background' },
      { status: 202 }
    )
  } catch (error) {
    return errorResponse(error, 'API:Pipeline:POST')
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const blogId = searchParams.get('blog_id')

    let query = supabase
      .from('pipeline_runs')
      .select('*, blogs!inner(user_id, name)')
      .eq('blogs.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (blogId) {
      query = query.eq('blog_id', blogId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return errorResponse(error, 'API:Pipeline:GET')
  }
}
