import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuthorizationService } from '@/lib/services/authorization-service'

/**
 * POST /api/admin/ugc-questions/review
 * 審核用戶自創題目（管理員功能）
 *
 * ⚠️ 注意：此 API 應該添加管理員權限驗證
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 驗證用戶身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
    }

    // 檢查管理員權限
    const authService = new AuthorizationService(supabase)
    const isAdmin = await authService.checkRole(user.id, 'admin')
    if (!isAdmin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: '權限不足' }, { status: 403 })
    }

    // 解析請求體
    const body = await request.json()
    const { questionId, action, reason } = body

    if (!questionId || !action) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '請提供題目 ID 和操作類型' },
        { status: 400 }
      )
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'INVALID_ACTION', message: '操作類型必須為 APPROVE 或 REJECT' },
        { status: 400 }
      )
    }

    // 檢查題目是否存在
    const { data: question, error: fetchError } = await supabase
      .from('ugc_questions')
      .select('*')
      .eq('id', questionId)
      .single()

    if (fetchError || !question) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '題目不存在' },
        { status: 404 }
      )
    }

    // 更新審核狀態
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
    const { error: updateError } = await supabase
      .from('ugc_questions')
      .update({
        review_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId)

    if (updateError) {
      console.error('[Admin Review] Update error:', updateError)
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '更新失敗' },
        { status: 500 }
      )
    }

    // 如果是批准，可以發放獎勵（可選）
    if (action === 'APPROVE') {
      const rewardAmount = 10.0 // 審核通過獎勵 10 金幣

      // 更新設計者錢包 - Use RPC function for atomic increment
      await supabase.rpc('increment_user_wallet', {
        user_id: question.designer_id,
        amount: rewardAmount
      })

      // 創建交易記錄
      await supabase.from('transactions').insert({
        user_id: question.designer_id,
        amount: rewardAmount,
        transaction_type: 'REWARD',
        status: 'SUCCESS',
        metadata: {
          source: 'ugc_question_approved',
          question_id: questionId,
          reason: '題目審核通過獎勵',
        },
      })
    }

    // 記錄審核日誌（可選：創建 audit_logs 表）
    console.log(`[Admin Review] Question ${questionId} ${newStatus} by ${user.id}`, {
      reason: reason || 'No reason provided',
    })

    return NextResponse.json({
      success: true,
      message: `題目已${action === 'APPROVE' ? '批准' : '拒絕'}`,
      questionId,
      newStatus,
    })
  } catch (error) {
    console.error('[Admin Review] Unexpected error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/ugc-questions/review
 * 獲取待審核的題目列表（管理員功能）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 驗證用戶身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
    }

    // 檢查管理員權限
    const authService = new AuthorizationService(supabase)
    const isAdmin = await authService.checkRole(user.id, 'admin')
    if (!isAdmin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: '權限不足' }, { status: 403 })
    }

    // 解析查詢參數
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Number(searchParams.get('offset')) || 0

    // 獲取待審核題目
    const { data: questions, error: queryError, count } = await supabase
      .from('ugc_questions')
      .select('*, profiles!designer_id(id, name)', { count: 'exact' })
      .eq('review_status', 'PENDING')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (queryError) {
      console.error('[Admin Review] Query error:', queryError)
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '查詢失敗' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      questions: questions || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[Admin Review] Unexpected error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    )
  }
}
