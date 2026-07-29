import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/utils/logger'

const logger = new Logger('API:NotificationsReadAll')

export async function PATCH() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error marking all notifications as read', error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Erro ao atualizar notificações' }, { status: 500 })
  }
}
