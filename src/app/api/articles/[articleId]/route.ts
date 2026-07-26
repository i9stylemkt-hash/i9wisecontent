import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ArticleService } from '@/lib/services/article.service'
import { updateArticleSchema } from '@/lib/validations/article'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const article = await ArticleService.getById(articleId, user.id)
    return NextResponse.json(article)
  } catch {
    return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = updateArticleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const article = await ArticleService.update(articleId, parsed.data, user.id)
    return NextResponse.json(article)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao atualizar'
    const status = msg.includes('Transição inválida') ? 422 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    await ArticleService.delete(articleId, user.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir artigo' }, { status: 500 })
  }
}
