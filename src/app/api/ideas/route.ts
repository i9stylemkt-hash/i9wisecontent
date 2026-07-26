import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { IdeaService } from '@/lib/services/idea.service'
import { createIdeaSchema } from '@/lib/validations/idea'

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const blogId = searchParams.get('blog_id') ?? undefined

    const ideas = await IdeaService.getAll(user.id, blogId)
    return NextResponse.json(ideas)
  } catch (error) {
    console.error('Error fetching ideas:', error)
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
