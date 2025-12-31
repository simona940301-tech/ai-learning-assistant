import { NextRequest } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'
import { Api } from '@/lib/api/response'
import { ApiErrorCode } from '@/lib/types/api'

/**
 * POST /api/play/user/consume-energy
 * 
 * Consume 1 daily energy for battle
 * Returns success/failure based on available energy
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient(req)

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Api.unauthorized('Authentication required')
    }

    // Get current energy (with lazy-reset)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return Api.notFound('User profile')
    }

    // Check if reset needed
    const nowUtc = new Date()

    const hasDailyEnergy = Object.prototype.hasOwnProperty.call(profile, 'daily_energy')
    const hasDailyEnergyCount = Object.prototype.hasOwnProperty.call(profile, 'daily_energy_count')

    if (!hasDailyEnergy && !hasDailyEnergyCount) {
      console.error('[Consume Energy] profiles table missing daily energy columns')
      return Api.customError(
        ApiErrorCode.DATABASE_ERROR,
        'profiles table missing daily energy columns'
      )
    }

    // Determine current stored energy and timestamp
    let dailyEnergy: number
    let energyLastUpdatedAt: string | null = null

    if (hasDailyEnergy) {
      dailyEnergy = profile.daily_energy
      energyLastUpdatedAt = profile.energy_last_updated_at
    } else if (hasDailyEnergyCount) {
      dailyEnergy = profile.daily_energy_count
      energyLastUpdatedAt = profile.energy_last_updated_at
    } else {
      console.error('[Consume Energy] profiles table missing daily energy columns')
      return Api.customError(
        ApiErrorCode.DATABASE_ERROR,
        'profiles table missing daily energy columns'
      )
    }

    // Compute current energy using regeneration logic
    const { data: calcData, error: calcError } = await supabase.rpc('calculate_current_energy', {
      p_daily_energy: dailyEnergy,
      p_last_updated_at: energyLastUpdatedAt,
      p_max_energy: 8,
      p_interval_minutes: 30,
    })

    if (calcError) {
      console.error('[Consume Energy] Regeneration RPC error:', calcError)
      return Api.serverError('Failed to compute energy')
    }

    let currentEnergy = calcData as number
    let resetAt = profile.daily_energy_reset_at

    // Fallback: 如果 daily_energy_reset_at 為 NULL，自動修正
    if (!resetAt) {
      console.warn(`[Consume Energy] User ${user.id} has NULL daily_energy_reset_at, fixing...`)
      const nextResetTime = getNextResetTime()
      resetAt = nextResetTime.toISOString()

      // 同時修正羽毛為滿值
      if (currentEnergy < 8) {
        currentEnergy = 8
      }

      // 更新資料庫
      const updatePayload: Record<string, any> = {
        daily_energy_reset_at: resetAt,
        energy_last_updated_at: new Date().toISOString(),
      }
      if (hasDailyEnergy) {
        updatePayload.daily_energy = currentEnergy
      }
      if (hasDailyEnergyCount) {
        updatePayload.daily_energy_count = currentEnergy
      }

      await supabase.from('profiles').update(updatePayload).eq('id', user.id)
    }

    const resetTimeUtc = new Date(resetAt)

    if (nowUtc >= resetTimeUtc) {
      // Reset first
      const nextResetTime = getNextResetTime()
      currentEnergy = 8
      resetAt = nextResetTime.toISOString()

      const resetPayload: Record<string, any> = {
        daily_energy_reset_at: resetAt,
        energy_last_updated_at: new Date().toISOString(),
      }
      if (hasDailyEnergy) {
        resetPayload.daily_energy = 8
      }
      if (hasDailyEnergyCount) {
        resetPayload.daily_energy_count = 8
      }

      await supabase.from('profiles').update(resetPayload).eq('id', user.id)
    } else if (currentEnergy !== dailyEnergy) {
      // If regeneration happened but no daily reset, persist the regenerated value
      // ⚠️ IMPORTANT: Do NOT update energy_last_updated_at here!
      // We only update it when CONSUMING energy (below)
      const updatePayload: Record<string, any> = {}
      if (hasDailyEnergy) {
        updatePayload.daily_energy = currentEnergy
      }
      if (hasDailyEnergyCount) {
        updatePayload.daily_energy_count = currentEnergy
      }
      await supabase.from('profiles').update(updatePayload).eq('id', user.id)
    }

    // Check if energy available
    if (currentEnergy <= 0) {
      return Api.customError(
        ApiErrorCode.INSUFFICIENT_BALANCE,
        'Daily energy exhausted',
        { dailyEnergyCount: 0 }
      )
    }

    // Consume energy and update timestamp
    // ✅ CRITICAL: Update energy_last_updated_at ONLY when consuming
    const updatePayload: Record<string, any> = {
      energy_last_updated_at: new Date().toISOString(), // ✅ This is the correct place!
    }
    if (hasDailyEnergy) {
      updatePayload.daily_energy = currentEnergy - 1
    }
    if (hasDailyEnergyCount) {
      updatePayload.daily_energy_count = currentEnergy - 1
    }

    const { error: updateError } = await supabase.from('profiles').update(updatePayload).eq('id', user.id)

    if (updateError) {
      console.error('[Consume Energy] Update error:', updateError)
      return Api.customError(
        ApiErrorCode.DATABASE_ERROR,
        'Failed to consume energy'
      )
    }

    return Api.success(
      { dailyEnergyCount: currentEnergy - 1 },
      Api.withTimestamp()
    )
  } catch (error) {
    console.error('[Consume Energy] Error:', error)
    return Api.serverError(
      error instanceof Error ? error.message : undefined
    )
  }
}

function getNextResetTime(): Date {
  const now = new Date()
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  taipeiTime.setHours(4, 0, 0, 0)
  if (taipeiTime <= now) {
    taipeiTime.setDate(taipeiTime.getDate() + 1)
  }
  const utcOffset = now.getTime() - now.getTimezoneOffset() * 60000
  const taipeiOffset = taipeiTime.getTime() - new Date(taipeiTime.toLocaleString('en-US', { timeZone: 'Asia/Taipei' })).getTime()
  return new Date(taipeiTime.getTime() - taipeiOffset)
}
