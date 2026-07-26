import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Testar conexão básica com o banco
    const { data, error } = await supabase.from('profiles').select('count')

    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message: error.message,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 }
      )
    }

    // Verificar se RLS está ativo verificando a tabela blogs
    const { error: rlsError } = await supabase.from('blogs').select('count')

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase conectado com sucesso!',
      connection: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        profiles: data,
        blogs_accessible: !rlsError,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        status: 'error',
        message,
        hint: 'Verifique as variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local',
      },
      { status: 500 }
    )
  }
}
