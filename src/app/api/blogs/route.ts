import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BlogService } from '@/lib/services/blog.service'
import { createBlogSchema } from '@/lib/validations/blog'
import { Logger } from '@/lib/utils/logger'

const logger = new Logger('API:Blogs')

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const blogs = await BlogService.getAll(user.id)
    return NextResponse.json(blogs)
  } catch (error) {
    logger.error('Error fetching blogs', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Erro ao buscar blogs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createBlogSchema.safeParse(body)

    if (!parsed.success) {
      logger.warn('Blog validation failed', { details: parsed.error.flatten() })
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const blog = await BlogService.create(parsed.data, user.id)
    return NextResponse.json(blog, { status: 201 })
  } catch (error) {
    logger.error('Error creating blog', error instanceof Error ? error : undefined)
    const message = error instanceof Error ? error.message : 'Erro ao criar blog'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
