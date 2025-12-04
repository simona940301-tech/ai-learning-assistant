import type { SupabaseClient } from '@supabase/supabase-js'

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  xp: number
  coins: number
  streak: number
  elo_rank: number
  daily_energy: number
  daily_energy_reset_at: string
  energy_last_updated_at: string
  created_at: string
  updated_at: string
  // ✅ 新增：預設頭像 ID
  preset_avatar_id?: string | null
}

/**
 * Profile Repository - Data Access Layer
 * Pure database operations, no business logic
 */
export class ProfileRepo {
  constructor(private db: SupabaseClient) { }

  async getById(userId: string): Promise<Profile | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      throw error
    }

    return data as Profile
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<Profile> {
    const { data, error } = await this.db
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return data as Profile
  }

  /**
   * Get Elo rank for a user
   */
  async getEloByUserId(userId: string): Promise<number | null> {
    const { data, error } = await this.db
      .from('profiles')
      .select('elo_rank')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data.elo_rank
  }

  /**
   * Update Elo rank for a user
   */
  async updateElo(userId: string, newElo: number): Promise<Profile> {
    const { data, error } = await this.db
      .from('profiles')
      .update({ elo_rank: newElo })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return data as Profile
  }
}

