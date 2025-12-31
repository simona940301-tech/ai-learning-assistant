import { ProfileRepo, type Profile } from '@/lib/dal/profile-repo'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Profile Service - Business Logic Layer
 */
export class ProfileService {
  constructor(
    private repo: ProfileRepo,
    private storage: SupabaseClient['storage']
  ) { }

  async getProfile(userId: string): Promise<Profile | null> {
    return this.repo.getById(userId)
  }

  async uploadAvatar(
    userId: string,
    file: File,
    fileName: string
  ): Promise<{ avatarUrl: string; profile: Profile }> {
    // Upload to storage
    const filePath = `avatars/${userId}/${fileName}`
    const { data: uploadData, error: uploadError } = await this.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = this.storage.from('avatars').getPublicUrl(filePath)

    // Update profile
    const profile = await this.repo.updateAvatar(userId, urlData.publicUrl)

    return {
      avatarUrl: urlData.publicUrl,
      profile,
    }
  }

  /**
   * Get user's Elo rank
   * Returns default 1000 if user not found
   */
  async getUserElo(userId: string): Promise<number> {
    const elo = await this.repo.getEloByUserId(userId)
    return elo ?? 1000 // Default Elo if user not found
  }

  /**
   * Update user's Elo rank
   * Ensures Elo doesn't go below 0
   */
  async updateUserElo(userId: string, newElo: number): Promise<Profile> {
    const safeElo = Math.max(0, Math.round(newElo))
    return this.repo.updateElo(userId, safeElo)
  }
}

