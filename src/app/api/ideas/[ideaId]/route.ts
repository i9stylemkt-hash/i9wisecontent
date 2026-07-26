import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { IdeaService } from '@/lib/services/idea.service'
import { updateIdeaSchema } from '@/lib/validations/idea'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const { ideaId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const idea = await IdeaService.getById(ideaId, user.id)
    return NextResponse.json(idea)
  } catch {
    return NextResponse.json({ error: 'Ideia não encontrada' }, { status: 404 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const { ideaId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = updateIdeaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const idea = await IdeaService.update(ideaId, parsed.data, user.id)
    return NextResponse.json(idea)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const { ideaId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    await IdeaService.delete(ideaId, user.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir ideia' }, { status: 500 })
  }
}
