import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BlogService } from '@/lib/services/blog.service'
import { updateBlogSchema } from '@/lib/validations/blog'
import { Logger } from '@/lib/utils/logger'

const logger = new Logger('API:Blog')

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const { blogId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const blog = await BlogService.getById(blogId, user.id)
    return NextResponse.json(blog)
  } catch (error) {
    logger.error('Error fetching blog', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Blog não encontrado' }, { status: 404 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const { blogId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateBlogSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const blog = await BlogService.update(blogId, parsed.data, user.id)
    return NextResponse.json(blog)
  } catch (error) {
    logger.error('Error updating blog', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Erro ao atualizar blog' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const { blogId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    await BlogService.delete(blogId, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting blog', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Erro ao excluir blog' }, { status: 500 })
  }
}
