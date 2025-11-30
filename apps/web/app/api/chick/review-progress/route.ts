import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { grantErrorReviewFoodReward } from '@/lib/chick/rewards'

/**
 * POST /api/chick/review-progress
 * 追蹤錯題複習進度，每複習 5 題給予 1 碗飼料
 */
export async function POST(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)
  if (!user) {
    const status = errorType === 'unauthenticated' ? 401 : 400
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { questionId } = body

    if (!questionId) {
      return NextResponse.json({ error: 'INVALID_INPUT', message: 'questionId is required' }, { status: 400 })
    }

    // 1. 獲取或創建複習進度記錄
    const today = new Date().toISOString().split('T')[0]
    const { data: progress, error: progressError } = await supabase
      .from('chick_error_review_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    let currentCount = progress?.current_count || 0
    const lastReset = progress?.last_reset_at || today

    // 2. 如果日期不同，重置計數
    if (lastReset !== today) {
      currentCount = 0
    }

    // 3. 增加計數
    currentCount += 1

    // 4. 計算應該給予的碗數（每 5 題 1 碗）
    const previousBowlsEarned = Math.floor((currentCount - 1) / 5)
    const currentBowlsEarned = Math.floor(currentCount / 5)
    const bowlsToAdd = currentBowlsEarned - previousBowlsEarned

    // 5. 如果達到 5 的倍數，給予獎勵
    if (bowlsToAdd > 0) {
      await grantErrorReviewFoodReward(supabase, user.id, currentCount)
    }

    // 6. 更新進度記錄
    const { error: updateError } = await supabase
      .from('chick_error_review_progress')
      .upsert(
        {
          user_id: user.id,
          current_count: currentCount,
          last_reset_at: today,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (updateError) {
      console.error('[POST /api/chick/review-progress] Update error:', updateError)
      return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      currentCount,
      bowlsEarned: bowlsToAdd,
      nextRewardAt: Math.ceil(currentCount / 5) * 5, // 下次獎勵的題數
    })
  } catch (error) {
    console.error('[POST /api/chick/review-progress] Unexpected error:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

/**
 * GET /api/chick/review-progress
 * 獲取當前複習進度
 */
export async function GET(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)
  if (!user) {
    const status = errorType === 'unauthenticated' ? 401 : 400
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: progress } = await supabase
      .from('chick_error_review_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const currentCount = progress?.current_count || 0
    const lastReset = progress?.last_reset_at || today
    const isToday = lastReset === today

    return NextResponse.json({
      success: true,
      currentCount: isToday ? currentCount : 0,
      nextRewardAt: Math.ceil((isToday ? currentCount : 0) / 5) * 5,
      progressToNextReward: (isToday ? currentCount : 0) % 5,
    })
  } catch (error) {
    console.error('[GET /api/chick/review-progress] Unexpected error:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

