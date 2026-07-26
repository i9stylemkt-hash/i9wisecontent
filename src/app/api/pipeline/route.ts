import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PipelineController } from '@/lib/pipeline/controller'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { blogId, ideaTitle, ideaId } = await request.json()
    if (!blogId) {
      return NextResponse.json({ error: 'blogId é obrigatório' }, { status: 400 })
    }

    const result = await PipelineController.execute({
      blogId,
      userId: user.id,
      ideaTitle,
      ideaId,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro no pipeline'
    console.error('[Pipeline API]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
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
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar pipelines' }, { status: 500 })
  }
}
