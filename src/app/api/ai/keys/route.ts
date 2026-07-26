import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { KeyManager } from '@/lib/ai/key-manager'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const keys = await KeyManager.getAll(user.id)
    return NextResponse.json(keys)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar chaves' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { provider, key, alias } = await request.json()
    if (!provider || !key) {
      return NextResponse.json({ error: 'Provider e key são obrigatórios' }, { status: 400 })
    }

    const result = await KeyManager.store(user.id, provider, key, alias)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
