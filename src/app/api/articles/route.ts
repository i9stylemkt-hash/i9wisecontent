import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ArticleService } from '@/lib/services/article.service'
import { createArticleSchema } from '@/lib/validations/article'
import { parsePaginationParams, createPaginatedResult, getOffset } from '@/lib/utils/pagination'
import { Logger } from '@/lib/utils/logger'

const logger = new Logger('API:Articles')

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const params = parsePaginationParams(searchParams)
    const offset = getOffset(params)

    let query = supabase
      .from('articles')
      .select('*, blogs!inner(user_id)', { count: 'exact' })
      .eq('blogs.user_id', user.id)
      .order('created_at', { ascending: false })

    const blogId = searchParams.get('blog_id')
    if (blogId) query = query.eq('blog_id', blogId)

    const status = searchParams.get('status')
    if (status) {
      const statuses = status.split(',')
      query = query.in('status', statuses)
    }

    const search = searchParams.get('search')
    if (search) query = query.ilike('title', `%${search}%`)

    query = query.range(offset, offset + params.pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json(createPaginatedResult(data ?? [], count ?? 0, params))
  } catch (error) {
    logger.error('Error fetching articles', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Erro ao buscar artigos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = createArticleSchema.safeParse(body)

    if (!parsed.success) {
      logger.warn('Article validation failed', { details: parsed.error.flatten() })
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const article = await ArticleService.create(parsed.data, user.id)
    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    logger.error('Error creating article', error instanceof Error ? error : undefined)
    const msg = error instanceof Error ? error.message : 'Erro ao criar artigo'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
