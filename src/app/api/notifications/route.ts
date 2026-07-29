import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/utils/logger'

const logger = new Logger('API:Notifications')

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    logger.error('Error fetching notifications', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 })
  }
}
