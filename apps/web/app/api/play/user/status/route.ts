import { NextRequest } from 'next/server'
import { getSupabaseClient, isMockModeEnabled } from '@/lib/api/auth'
import { Api } from '@/lib/api/response'
import { ApiErrorCode } from '@/lib/types/api'

/**
 * GET /api/play/user/status
 * 
 * Get user battle status including dailyEnergy and wallet balance
 * Auto-resets dailyEnergy if reset time has passed (UTC+8 04:00)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient(req)

    // Check authentication
    let user
    const authResult = await supabase.auth.getUser()
    user = authResult.data?.user
    const authError = authResult.error

    if (authError || !user) {
      if (isMockModeEnabled()) {
        // In mock mode, use the mock user ID
        user = { id: process.env.BACKPACK_DEV_USER_ID || 'e770f9cd-52a7-43de-b983-70f6f78d2f53' } as any
      } else {
        return Api.unauthorized('Authentication required')
      }
    }

    // Get user profile with lazy-reset logic (skip in mock mode)
    let profile, profileError

    if (isMockModeEnabled()) {
      // In mock mode, return mock profile data and skip database operations
      const nextResetTime = getNextResetTime()
      profile = {
        id: user.id,
        daily_energy: 8,
        daily_energy_count: 8,
        daily_energy_reset_at: nextResetTime.toISOString(),
        coins: 1000,
        user_wallet_balance: 1000,
        elo_rank: 1000,
        energy_last_updated_at: new Date().toISOString(),
      }
      profileError = null
      
      // Return immediately in mock mode, skip RPC and database updates
      return Api.success(
        {
          dailyEnergyCount: 8,
          walletBalance: 1000,
          eloRank: 1000,
          dailyEnergyResetAt: nextResetTime.toISOString(),
          energyLastUpdatedAt: profile.energy_last_updated_at,
        },
        Api.withTimestamp()
      )
    } else {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      profile = result.data
      profileError = result.error
    }

    if (profileError || !profile) {
      // In development mode, auto-create profile for dev user
      const isDev = process.env.NODE_ENV === 'development'
      const isDevUser = user.id === 'e770f9cd-52a7-43de-b983-70f6f78d2f53'

      if (isDev && isDevUser && profileError?.code === 'PGRST116') {
        console.log('[Play User Status] Auto-creating dev profile...')

        const nextResetTime = getNextResetTime()
        const payloads: Record<string, any>[] = [
          {
            id: user.id,
            name: 'Dev User',
            daily_energy: 8,
            daily_energy_reset_at: nextResetTime.toISOString(),
            coins: 1000,
            elo_rank: 1000,
          },
          {
            id: user.id,
            name: 'Dev User',
            daily_energy_count: 8,
            daily_energy_reset_at: nextResetTime.toISOString(),
            user_wallet_balance: 1000,
            elo_rank: 1000,
          },
        ]

        if (isMockModeEnabled()) {
          payloads.forEach(payload => {
            payload.role = payload.role ?? 'student'
          })
        }

        let newProfile: Record<string, any> | null = null
        let createError: any = null

        for (const payload of payloads) {
          const { data, error } = await supabase
            .from('profiles')
            .insert(payload)
            .select('*')
            .single()

          if (!error) {
            newProfile = data as Record<string, any>
            createError = null
            break
          }

          createError = error
        }

        if (createError || !newProfile) {
          console.error('[Play User Status] Failed to create dev profile:', createError)
          return Api.customError(
            ApiErrorCode.DATABASE_ERROR,
            'Failed to create dev profile'
          )
        }

        console.log('[Play User Status] Dev profile created successfully')
        return Api.success(
          {
            dailyEnergyCount: newProfile.daily_energy ?? newProfile.daily_energy_count ?? 8,
            walletBalance: newProfile.coins ?? newProfile.user_wallet_balance ?? 0,
            eloRank: newProfile.elo_rank || 1000,
            dailyEnergyResetAt: newProfile.daily_energy_reset_at,
            userId: user.id,
            name: newProfile.name || newProfile.full_name || null,
            avatarUrl: newProfile.avatar_url || newProfile.avatar || null,
          },
          Api.withTimestamp()
        )
      }

      console.error('[Play User Status] Profile error:', profileError)
      return Api.notFound('User profile')
    }

    // Lazy-reset: Check if dailyEnergy needs reset
    const nowUtc = new Date()

    const hasDailyEnergy = Object.prototype.hasOwnProperty.call(profile, 'daily_energy')
    const hasDailyEnergyCount = Object.prototype.hasOwnProperty.call(profile, 'daily_energy_count')

    let dailyEnergy: number
    let energyLastUpdatedAt: string | null = null

    if (hasDailyEnergy) {
      dailyEnergy = profile.daily_energy
      energyLastUpdatedAt = profile.energy_last_updated_at
    } else if (hasDailyEnergyCount) {
      dailyEnergy = profile.daily_energy_count
      energyLastUpdatedAt = profile.energy_last_updated_at
    } else {
      console.error('[Play User Status] profiles table missing daily energy columns')
      return Api.customError(
        ApiErrorCode.DATABASE_ERROR,
        'profiles table missing daily energy columns'
      )
    }

    // 🔧 FIX: Auto-initialize energy_last_updated_at if it's NULL
    // This happens for users created before the energy regeneration migration
    if (!energyLastUpdatedAt) {
      console.warn(`[Play User Status] User ${user.id} has NULL energy_last_updated_at, initializing...`)
      const now = new Date().toISOString()
      energyLastUpdatedAt = now

      const updatePayload: Record<string, any> = {
        energy_last_updated_at: now,
      }

      // Also ensure daily_energy_reset_at is set
      if (!profile.daily_energy_reset_at) {
        const nextResetTime = getNextResetTime()
        updatePayload.daily_energy_reset_at = nextResetTime.toISOString()
      }

      await supabase.from('profiles').update(updatePayload).eq('id', user.id)
      console.log(`[Play User Status] Initialized energy_last_updated_at for user ${user.id}`)
    }

    // Compute current energy using regeneration logic with enterprise-grade error handling
    const { data: calcData, error: calcError } = await supabase.rpc('calculate_current_energy', {
      p_daily_energy: dailyEnergy,
      p_last_updated_at: energyLastUpdatedAt,
      p_max_energy: 8,
      p_interval_minutes: 30,
    })

    if (calcError) {
      console.error('[Play User Status] Regeneration RPC error:', calcError)
      // Enterprise-grade fallback: return current energy value if RPC fails
      console.warn('[Play User Status] Using fallback energy calculation due to RPC error')
      const regeneratedEnergy = dailyEnergy // Fallback to stored value
      
      return Api.success(
        {
          dailyEnergyCount: regeneratedEnergy,
          walletBalance: profile.coins ?? profile.user_wallet_balance ?? 0,
          eloRank: profile.elo_rank || 1000,
          dailyEnergyResetAt: profile.daily_energy_reset_at,
          energyLastUpdatedAt: profile.energy_last_updated_at || new Date().toISOString(),
        },
        Api.withTimestamp()
      )
    }

    const regeneratedEnergy = calcData as number

    // If regenerated value differs, persist it WITHOUT updating timestamp
    // ⚠️ CRITICAL: energy_last_updated_at should ONLY be updated when consuming energy,
    // NOT when regenerating. Otherwise, the countdown timer will reset on every page load.
    if (regeneratedEnergy !== dailyEnergy) {
      const updatePayload: Record<string, any> = {}

      // ❌ DO NOT update energy_last_updated_at here!
      // It should remain as the time when energy was last CONSUMED

      if (hasDailyEnergy) {
        updatePayload.daily_energy = regeneratedEnergy
      }
      if (hasDailyEnergyCount) {
        updatePayload.daily_energy_count = regeneratedEnergy
      }

      await supabase.from('profiles').update(updatePayload).eq('id', user.id)
      dailyEnergy = regeneratedEnergy
    }

    let dailyEnergyResetAt = profile.daily_energy_reset_at

    const resetTimeUtc = new Date(dailyEnergyResetAt)

    if (nowUtc >= resetTimeUtc) {
      // Reset needed: Update in database
      const nextResetTime = getNextResetTime()

      const updatePayload: Record<string, any> = {
        daily_energy_reset_at: nextResetTime.toISOString(),
      }
      if (hasDailyEnergy) {
        updatePayload.daily_energy = 8
      }
      if (hasDailyEnergyCount) {
        updatePayload.daily_energy_count = 8
      }

      const { error: updateError } = await supabase.from('profiles').update(updatePayload).eq('id', user.id)

      if (!updateError) {
        dailyEnergy = 8
        dailyEnergyResetAt = nextResetTime.toISOString()
      } else {
        console.error('[Play User Status] Failed to reset daily energy:', updateError)
      }
    }

    return Api.success(
      {
        dailyEnergyCount: dailyEnergy,
        walletBalance: profile.coins ?? profile.user_wallet_balance ?? 0,
        eloRank: profile.elo_rank || 1000,
        dailyEnergyResetAt,
        energyLastUpdatedAt: energyLastUpdatedAt || new Date().toISOString(),  // 🔧 FIX: 使用更新後的變量，不是原始 profile
        // 基本資料（供前端安全渲染用）
        userId: user.id,
        name: profile.name || profile.full_name || null,
        avatarUrl: profile.avatar_url || profile.avatar || null,
      },
      Api.withTimestamp()
    )
  } catch (error) {
    console.error('[Play User Status] Error:', error)
    return Api.serverError(
      error instanceof Error ? error.message : undefined
    )
  }
}

/**
 * Calculate next reset time (UTC+8 04:00)
 * Returns UTC timestamp
 */
function getNextResetTime(): Date {
  const now = new Date()
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))

  // Set to 04:00 today
  taipeiTime.setHours(4, 0, 0, 0)

  // If already past 04:00 today, set to 04:00 tomorrow
  if (taipeiTime <= now) {
    taipeiTime.setDate(taipeiTime.getDate() + 1)
  }

  // Convert back to UTC
  const utcOffset = now.getTime() - now.getTimezoneOffset() * 60000
  const taipeiOffset = taipeiTime.getTime() - new Date(taipeiTime.toLocaleString('en-US', { timeZone: 'Asia/Taipei' })).getTime()

  return new Date(taipeiTime.getTime() - taipeiOffset)
}
