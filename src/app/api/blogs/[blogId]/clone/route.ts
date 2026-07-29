import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BlogService } from '@/lib/services/blog.service'
import { Logger } from '@/lib/utils/logger'

const logger = new Logger('API:BlogClone')

export async function POST(
  request: Request,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { blogId } = await params

    const body = await request.json()
    const { name } = body as { name?: string }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'O campo "name" é obrigatório' },
        { status: 400 }
      )
    }

    const clonedBlog = await BlogService.clone(blogId, user.id, name.trim())
    return NextResponse.json(clonedBlog, { status: 201 })
  } catch (error) {
    logger.error('Error cloning blog', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Erro ao clonar blog' }, { status: 500 })
  }
}
