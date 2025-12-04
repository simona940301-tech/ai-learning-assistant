import type { SupabaseClient } from '@supabase/supabase-js'
import { getServiceSupabaseClient } from '../../../lib/supabase'

interface PruneResult {
  deleted: number
}

/**
 * Keep only the latest 20 messages for a user.
 * Uses service role client by default to bypass RLS in cron/hooks.
 */
export async function pruneChickMessages(userId: string, client?: SupabaseClient): Promise<PruneResult> {
  const db = client ?? getServiceSupabaseClient()

  const { data, error } = await db
    .from('chick_messages')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(20, 2000) // rows after the 20th

  if (error) {
    throw new Error(`Failed to fetch messages for pruning: ${error.message}`)
  }

  // ✅ 修復：添加明確的類型注解
  const idsToDelete = (data ?? []).map((row: { id?: string }) => row.id).filter(Boolean)
  if (idsToDelete.length === 0) {
    return { deleted: 0 }
  }

  const { error: deleteError, count } = await db
    .from('chick_messages')
    .delete({ count: 'exact' })
    .in('id', idsToDelete)

  if (deleteError) {
    throw new Error(`Failed to prune old chick messages: ${deleteError.message}`)
  }

  return { deleted: count ?? idsToDelete.length }
}
