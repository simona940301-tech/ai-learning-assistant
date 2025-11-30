import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/play/ugc-questions
 * 查詢用戶自己創建的題目
 *
 * Query params:
 * - status: PENDING | APPROVED | REJECTED (可選)
 * - limit: 數量限制 (默認 50)
 * - offset: 偏移量 (默認 0)
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

    // 解析查詢參數
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'PENDING' | 'APPROVED' | 'REJECTED' | null
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Number(searchParams.get('offset')) || 0

    // 構建查詢
    let query = supabase
      .from('ugc_questions')
      .select('*', { count: 'exact' })
      .eq('designer_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 按狀態過濾
    if (status) {
      query = query.eq('review_status', status)
    }

    const { data: questions, error: queryError, count } = await query

    if (queryError) {
      console.error('[UGC Questions] Query error:', queryError)
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '查詢失敗' },
        { status: 500 }
      )
    }

    // 格式化響應
    const formattedQuestions = (questions || []).map((q: any) => ({
      id: q.id,
      questionText: q.question_text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctAnswer: q.correct_answer,
      userCreatedHint: q.deceiver_option || '',
      subject: q.subject,
      difficulty: q.difficulty,
      reviewStatus: q.review_status,
      usageCount: q.usage_count,
      totalRewards: q.total_rewards,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
    }))

    return NextResponse.json({
      success: true,
      questions: formattedQuestions,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    console.error('[UGC Questions] Unexpected error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/play/ugc-questions?id=xxx
 * 刪除用戶自己創建的題目（僅限 PENDING 狀態）
 */
export async function DELETE(request: NextRequest) {
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

    // 解析查詢參數
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('id')

    if (!questionId) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '請提供題目 ID' },
        { status: 400 }
      )
    }

    // 檢查題目是否存在且屬於當前用戶
    const { data: question, error: fetchError } = await supabase
      .from('ugc_questions')
      .select('*')
      .eq('id', questionId)
      .eq('designer_id', user.id)
      .single()

    if (fetchError || !question) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '題目不存在或無權限刪除' },
        { status: 404 }
      )
    }

    // 只允許刪除 PENDING 狀態的題目
    if (question.review_status !== 'PENDING') {
      return NextResponse.json(
        { error: 'INVALID_STATUS', message: '只能刪除待審核的題目' },
        { status: 400 }
      )
    }

    // 刪除題目
    const { error: deleteError } = await supabase
      .from('ugc_questions')
      .delete()
      .eq('id', questionId)
      .eq('designer_id', user.id)

    if (deleteError) {
      console.error('[UGC Delete] Database error:', deleteError)
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '刪除失敗' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '題目已刪除',
    })
  } catch (error) {
    console.error('[UGC Delete] Unexpected error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    )
  }
}
