import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 增加飼料數量
 */
export async function addFoodBowls(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<{ success: boolean; newCount: number }> {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('food_bowls_count')
    .eq('id', userId)
    .single()

  if (fetchError || !profile) {
    console.error('[addFoodBowls] Failed to fetch profile:', fetchError)
    return { success: false, newCount: 0 }
  }

  const currentCount = profile.food_bowls_count || 0
  const newCount = currentCount + amount

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ food_bowls_count: newCount })
    .eq('id', userId)

  if (updateError) {
    console.error('[addFoodBowls] Failed to update food bowls:', updateError)
    return { success: false, newCount: currentCount }
  }

  return { success: true, newCount }
}

/**
 * 對戰獎勵：根據勝負給予飼料
 * 勝利: +3 份
 * 失敗: +1 份
 */
export async function grantBattleFoodReward(
  supabase: SupabaseClient,
  userId: string,
  didWin: boolean
): Promise<{ success: boolean; bowlsGranted: number }> {
  const bowlsAmount = didWin ? 3 : 1
  const result = await addFoodBowls(supabase, userId, bowlsAmount)
  return {
    success: result.success,
    bowlsGranted: result.success ? bowlsAmount : 0,
  }
}

/**
 * 任務完成獎勵：+5 份飼料
 */
export async function grantMissionFoodReward(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; bowlsGranted: number }> {
  const result = await addFoodBowls(supabase, userId, 5)
  return {
    success: result.success,
    bowlsGranted: result.success ? 5 : 0,
  }
}

/**
 * 錯題複習獎勵：每複習 5 題 +1 份飼料
 */
export async function grantErrorReviewFoodReward(
  supabase: SupabaseClient,
  userId: string,
  reviewCount: number
): Promise<{ success: boolean; bowlsGranted: number }> {
  // 計算應該給予的碗數（每 5 題 1 碗）
  const bowlsAmount = Math.floor(reviewCount / 5)

  if (bowlsAmount === 0) {
    return { success: true, bowlsGranted: 0 }
  }

  const result = await addFoodBowls(supabase, userId, bowlsAmount)
  return {
    success: result.success,
    bowlsGranted: result.success ? bowlsAmount : 0,
  }
}

/**
 * 遊戲模式獎勵：根據表現給予飼料
 * Perfect (100%): +3 份
 * Good (80%+): +2 份
 * Normal: +1 份
 */
export async function grantGameFoodReward(
  supabase: SupabaseClient,
  userId: string,
  foodAmount: number
): Promise<{ success: boolean; bowlsGranted: number }> {
  const result = await addFoodBowls(supabase, userId, foodAmount)
  return {
    success: result.success,
    bowlsGranted: result.success ? foodAmount : 0,
  }
}
