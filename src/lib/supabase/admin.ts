import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
        'Please set it in your .env.local file. See .env.example for reference.'
    )
  }
  return url
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
        'This key is required for admin operations (cron jobs, scheduler). ' +
        'Please set it in your .env.local file. See .env.example for reference.'
    )
  }
  return key
}

/**
 * Creates an admin Supabase client that bypasses RLS.
 *
 * ⚠️ ATENÇÃO: Este client bypassa RLS!
 * Usar APENAS em server-side para operações administrativas (cron jobs, scheduler, migrations).
 * NUNCA importar este arquivo em componentes client-side.
 */
export function createAdminClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
