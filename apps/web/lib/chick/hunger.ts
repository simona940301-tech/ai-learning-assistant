import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 更新飢餓度（時間驅動）
 * 每小時增加 5 點飢餓度
 */
export async function updateHungerOverTime(
  supabase: SupabaseClient,
  userId: string
): Promise<{ newHunger: number; updated: boolean }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('chick_hunger, chick_hunger_last_updated_at')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    console.error('[updateHungerOverTime] Failed to fetch profile:', error)
    return { newHunger: 50, updated: false }
  }

  const lastUpdate = profile.chick_hunger_last_updated_at
    ? new Date(profile.chick_hunger_last_updated_at)
    : new Date()
  const now = new Date()
  const hoursPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

  // 如果不到 1 小時，不更新
  if (hoursPassed < 1) {
    return { newHunger: profile.chick_hunger || 50, updated: false }
  }

  // 每小時 +5 點，上限 100
  const hungerIncrease = Math.floor(hoursPassed * 5)
  const currentHunger = profile.chick_hunger || 50
  const newHunger = Math.min(100, currentHunger + hungerIncrease)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      chick_hunger: newHunger,
      chick_hunger_last_updated_at: now.toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    console.error('[updateHungerOverTime] Failed to update hunger:', updateError)
    return { newHunger: currentHunger, updated: false }
  }

  return { newHunger, updated: true }
}

/**
 * 增加飢餓度（活動驅動）
 * 用於對戰、任務等活動後增加飢餓度
 */
export async function increaseHungerFromActivity(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<{ newHunger: number }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('chick_hunger')
    .eq('id', userId)
    .single()

  if (!profile) {
    return { newHunger: 50 }
  }

  const currentHunger = profile.chick_hunger || 50
  const newHunger = Math.min(100, currentHunger + amount)

  await supabase
    .from('profiles')
    .update({
      chick_hunger: newHunger,
      chick_hunger_last_updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return { newHunger }
}

/**
 * 檢查並應用飽足狀態 Buff
 * 如果飢餓度 < 30，設置 1 小時的 Buff
 */
export async function checkAndApplyWellFedBuff(
  supabase: SupabaseClient,
  userId: string
): Promise<{ isWellFed: boolean; expiresAt: string | null }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('chick_hunger')
    .eq('id', userId)
    .single()

  if (!profile) {
    return { isWellFed: false, expiresAt: null }
  }

  const isWellFed = (profile.chick_hunger || 50) < 30

  if (isWellFed) {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 小時有效

    await supabase
      .from('battle_progression_state')
      .upsert(
        {
          user_id: userId,
          chick_well_fed_expires_at: expiresAt.toISOString(),
        },
        { onConflict: 'user_id' }
      )

    return { isWellFed: true, expiresAt: expiresAt.toISOString() }
  }

  return { isWellFed: false, expiresAt: null }
}

/**
 * 檢查是否處於飢餓狀態
 */
export function isHungry(hunger: number): boolean {
  return hunger > 80
}

/**
 * 檢查是否處於飽足狀態
 */
export function isWellFed(hunger: number): boolean {
  return hunger < 30
}

