import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { IdeaService } from '@/lib/services/idea.service'
import { createIdeaSchema } from '@/lib/validations/idea'
import { parsePaginationParams, createPaginatedResult, getOffset } from '@/lib/utils/pagination'
import { Logger } from '@/lib/utils/logger'

const logger = new Logger('API:Ideas')

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const params = parsePaginationParams(searchParams)
    const offset = getOffset(params)

    let query = supabase
      .from('ideas')
      .select('*, blogs!inner(user_id, name)', { count: 'exact' })
      .eq('blogs.user_id', user.id)
      .order('created_at', { ascending: false })

    const blogId = searchParams.get('blog_id')
    if (blogId) query = query.eq('blog_id', blogId)

    query = query.range(offset, offset + params.pageSize - 1)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json(createPaginatedResult(data ?? [], count ?? 0, params))
  } catch (error) {
    logger.error('Error fetching ideas', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Erro ao buscar ideias' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = createIdeaSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const idea = await IdeaService.create(parsed.data, user.id)
    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao criar ideia'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
