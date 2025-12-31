import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/play/battle/answers
 * 獲取對戰的答題記錄
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const matchId = searchParams.get('matchId')

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'matchId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 獲取當前用戶
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 從 battle_events 獲取當前用戶的答題記錄
    // 注意：可能需要等待事件寫入，所以嘗試多次查詢
    let events = null
    let attempts = 0
    const maxAttempts = 5 // 增加到 5 次重試
    
    console.log('[Battle Answers] Starting fetch for matchId:', matchId, 'userId:', user.id)
    
    while (attempts < maxAttempts && !events) {
      console.log(`[Battle Answers] Attempt ${attempts + 1}/${maxAttempts}`)
      
      const { data, error } = await supabase
        .from('battle_events')
        .select('question_id_array, is_correct_array, user_id, match_id, created_at, metadata')
        .eq('match_id', matchId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error(`[Battle Answers] Error on attempt ${attempts + 1}:`, error)
        if (attempts === maxAttempts - 1) {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
          )
        }
      }

      if (data) {
        console.log(`[Battle Answers] Found events on attempt ${attempts + 1}:`, {
          matchId: data.match_id,
          questionCount: data.question_id_array?.length || 0,
          correctCount: data.is_correct_array?.filter((c: boolean) => c).length || 0,
          wrongCount: data.is_correct_array?.filter((c: boolean) => !c).length || 0,
          created_at: data.created_at,
        })
        events = data
        break
      } else {
        console.log(`[Battle Answers] No data found on attempt ${attempts + 1}`)
      }

      // 如果沒有找到，等待一下再重試
      if (attempts < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 增加到 1 秒
      }
      attempts++
    }

    if (!events) {
      console.warn('[Battle Answers] No events found after', maxAttempts, 'attempts for matchId:', matchId)
      // 嘗試查詢所有該 matchId 的記錄（不限制 user_id）來調試
      const { data: allEvents } = await supabase
        .from('battle_events')
        .select('user_id, match_id, question_id_array, is_correct_array')
        .eq('match_id', matchId)
        .limit(10)
      console.log('[Battle Answers] All events for this matchId:', allEvents)
      
      return NextResponse.json({
        success: true,
        answers: [],
      })
    }

    console.log('[Battle Answers] Final events data:', {
      questionCount: events.question_id_array?.length || 0,
      correctCount: events.is_correct_array?.filter((c: boolean) => c).length || 0,
      wrongCount: events.is_correct_array?.filter((c: boolean) => !c).length || 0,
      question_id_array: events.question_id_array,
      is_correct_array: events.is_correct_array,
    })

    // 組合題目 ID 和答題結果
    const userAnswerArray = Array.isArray(events.metadata?.user_answers)
      ? events.metadata?.user_answers
      : []

    const answers = (events.question_id_array || []).map((questionId: string, index: number) => ({
      questionId: String(questionId), // 確保是字符串
      isCorrect: Boolean(events.is_correct_array?.[index]),
      userAnswer: userAnswerArray?.[index] ?? null,
    }))

    return NextResponse.json({
      success: true,
      answers,
    })
  } catch (error) {
    console.error('[Battle Answers] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
