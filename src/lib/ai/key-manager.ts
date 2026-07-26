import { createServerSupabaseClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/utils/crypto'

export interface ManagedKey {
  id: string
  provider: string
  alias: string | null
  isActive: boolean
  decryptedKey: string
}

/**
 * Manages encrypted API keys for AI providers.
 * Keys are encrypted at rest and decrypted only when needed for requests.
 */
export class KeyManager {
  /**
   * Store a new API key (encrypted)
   */
  static async store(userId: string, provider: string, key: string, alias?: string) {
    const supabase = await createServerSupabaseClient()
    const keyEncrypted = encrypt(key)

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        provider,
        key_encrypted: keyEncrypted,
        key_alias: alias ?? `${provider}-key`,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get an active key for a provider (decrypted)
   */
  static async getKey(userId: string, provider: string): Promise<string | null> {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .single()

    if (error || !data) return null

    try {
      const key = data as Record<string, unknown>
      return decrypt(key.key_encrypted as string)
    } catch {
      return null
    }
  }

  /**
   * Get all keys for a user (without decryption)
   */
  static async getAll(userId: string) {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, provider, key_alias, is_active, usage_count, total_cost, last_used_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Record usage of a key
   */
  static async recordUsage(keyId: string, cost: number) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.rpc('increment_key_usage', {
      key_id: keyId,
      cost_amount: cost,
    })
    // If RPC doesn't exist, fallback to manual update
    if (error) {
      await supabase
        .from('api_keys')
        .update({
          usage_count: 1, // Will be overwritten — ideally use .increment()
          last_used_at: new Date().toISOString(),
        })
        .eq('id', keyId)
    }
  }

  /**
   * Toggle key active state
   */
  static async toggleActive(id: string, userId: string) {
    const supabase = await createServerSupabaseClient()
    const { data: key } = await supabase
      .from('api_keys')
      .select('is_active')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (!key) throw new Error('Key não encontrada')

    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: !(key as { is_active: boolean }).is_active })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Delete a key
   */
  static async delete(id: string, userId: string) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }
}
