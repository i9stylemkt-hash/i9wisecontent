import { createClient } from '@supabase/supabase-js'

// ⚠️ ATENÇÃO: Este client bypassa RLS!
// Usar APENAS em server-side para operações administrativas (cron jobs, migrations)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
