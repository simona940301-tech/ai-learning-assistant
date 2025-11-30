import { NextRequest, NextResponse } from 'next/server'
// 強制動態渲染
export const dynamic = 'force-dynamic'
import { getSupabaseClient } from '@/lib/api/auth'
import { enqueueChickMessage } from '@/packages/server/chick'

/**
 * POST /api/play/battle/events
 * 
 * P9: Rust 引擎寫入戰鬥結果事件
 * 
 * 功能：
 * - 接收 Rust 引擎發送的 BATTLE_END 事件
 * - 將事件寫入 battle_events 表
 * - 觸發 Supabase Realtime 通知（供 P10 監聽）
 * 
 * Request Body:
 * {
 *   "user_id": "uuid",
 *   "opponent_id": "uuid" | null,
 *   "match_id": "string",
 *   "match_type": "PVP" | "PVE_TRAINING" | "PVE_CHALLENGE",
 *   "question_id_array": ["uuid1", "uuid2", ...],
 *   "is_correct_array": [true, false, ...],
 *   "final_scores": { "player1": 100, "player2": 80 },
 *   "server_timestamp": 1234567890123
 * }
 * 
 * 認證：
 * - 可以通過 API Key 或 Service Role 認證
 * - 或通過環境變數 BATTLE_EVENTS_API_KEY 驗證
 */
export async function POST(req: NextRequest) {
  try {
    // ============================================
    // 1. API Key 驗證（可選）
    // ============================================
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')
    const expectedApiKey = process.env.BATTLE_EVENTS_API_KEY

    if (expectedApiKey && apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid API key' },
        { status: 401 }
      )
    }

    // ============================================
    // 2. 解析請求體
    // ============================================
    const body = await req.json()
    const {
      user_id,
      opponent_id,
      match_id,
      match_type,
      question_id_array,
      is_correct_array,
      final_scores,
      server_timestamp,
      metadata,
    } = body

    // 驗證必填字段
    if (!user_id || !match_id || !match_type || !question_id_array || !is_correct_array) {
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR',
          message: 'Missing required fields: user_id, match_id, match_type, question_id_array, is_correct_array',
        },
        { status: 400 }
      )
    }

    // 驗證 match_type
    if (!['PVP', 'PVE_TRAINING', 'PVE_CHALLENGE'].includes(match_type)) {
      return NextResponse.json(
        { error: 'INVALID_MATCH_TYPE', message: 'match_type must be PVP, PVE_TRAINING, or PVE_CHALLENGE' },
        { status: 400 }
      )
    }

    // 驗證數組長度匹配
    if (!Array.isArray(question_id_array) || !Array.isArray(is_correct_array)) {
      return NextResponse.json(
        { error: 'INVALID_ARRAY_FORMAT', message: 'question_id_array and is_correct_array must be arrays' },
        { status: 400 }
      )
    }

    // ============================================
    // 3. 寫入 battle_events 表
    // ============================================
    const supabase = getSupabaseClient(req)

    const { data: event, error: insertError } = await supabase
      .from('battle_events')
      .insert({
        user_id,
        opponent_id: opponent_id || null,
        match_id,
        match_type,
        question_id_array: question_id_array,
        is_correct_array: is_correct_array,
        final_scores: final_scores || { player1: 0, player2: 0 },
        server_timestamp: server_timestamp || Date.now(),
        processed: false,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Battle Events API] Insert error:', insertError)
      return NextResponse.json(
        { 
          error: 'INSERT_FAILED',
          message: insertError.message,
        },
        { status: 500 }
      )
    }

    // ============================================
    // 4. Chick hook (IQ/Fatigue + message)
    // ============================================
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('chick_iq, chick_fatigue, chick_fatigue_battle_counter, chick_emotion_state')
        .eq('id', user_id)
        .single()

      if (profileError) {
        console.error('[Chick Hook][battle_end] Failed to load profile:', profileError)
      } else {
        const currentIq = profile?.chick_iq ?? 5
        const currentFatigue = profile?.chick_fatigue ?? 0
        const currentCounter = profile?.chick_fatigue_battle_counter ?? 0
        const emotionState = profile?.chick_emotion_state ?? 'normal'

        const nextIq = Math.min(currentIq + 1, 10)
        let nextCounter = currentCounter + 1
        let nextFatigue = currentFatigue
        let fatigueIncreased = false

        if (nextCounter >= 5) {
          nextFatigue = Math.min(currentFatigue + 1, 3)
          nextCounter = 0
          fatigueIncreased = true
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            chick_iq: nextIq,
            chick_fatigue: nextFatigue,
            chick_fatigue_battle_counter: nextCounter,
          })
          .eq('id', user_id)

        if (updateError) {
          console.error('[Chick Hook][battle_end] Failed to update profile:', updateError)
        } else {
          const stateSnapshot = { iq: nextIq, fatigue: nextFatigue, emotionState }
          const candidateType = fatigueIncreased ? 'S2' : 'S1'
          await enqueueChickMessage({
            userId: user_id,
            candidates: [{ type: candidateType, stateSnapshot }],
            client: supabase,
            defaultSnapshot: stateSnapshot,
          })
        }
      }
    } catch (hookError) {
      console.error('[Chick Hook][battle_end] Unexpected error:', hookError)
    }

    // ============================================
    // 5. 返回成功響應
    // ============================================
    return NextResponse.json({
      success: true,
      event_id: event.id,
      message: 'Battle event recorded successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[POST /api/play/battle/events] Error:', error)
    return NextResponse.json(
      { 
        error: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/play/battle/events
 * 
 * 查詢戰鬥事件（用於調試和監控）
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient(req)

    // 檢查認證（用戶只能查看自己的事件）
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const matchType = searchParams.get('match_type')

    let query = supabase
      .from('battle_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (matchType) {
      query = query.eq('match_type', matchType)
    }

    const { data: events, error: fetchError } = await query

    if (fetchError) {
      return NextResponse.json(
        { error: 'FETCH_FAILED', message: fetchError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      count: events?.length || 0,
    })
  } catch (error) {
    console.error('[GET /api/play/battle/events] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}
