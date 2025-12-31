import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/play/ugc-questions/update
 * 更新用戶自創題目（僅限 PENDING 狀態）
 */
export async function PATCH(request: NextRequest) {
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

    // 解析請求體
    const body = await request.json()
    const {
      id,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      userCreatedHint,
      subject,
      difficulty,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '請提供題目 ID' },
        { status: 400 }
      )
    }

    // 檢查題目是否存在且屬於當前用戶
    const { data: existingQuestion, error: fetchError } = await supabase
      .from('ugc_questions')
      .select('*')
      .eq('id', id)
      .eq('designer_id', user.id)
      .single()

    if (fetchError || !existingQuestion) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '題目不存在或無權限編輯' },
        { status: 404 }
      )
    }

    // 只允許編輯 PENDING 狀態的題目
    if (existingQuestion.review_status !== 'PENDING') {
      return NextResponse.json(
        { error: 'INVALID_STATUS', message: '只能編輯待審核的題目' },
        { status: 400 }
      )
    }

    // 構建更新對象
    const updates: any = {}

    if (questionText !== undefined) updates.question_text = questionText
    if (optionA !== undefined) updates.option_a = optionA
    if (optionB !== undefined) updates.option_b = optionB
    if (optionC !== undefined) updates.option_c = optionC
    if (optionD !== undefined) updates.option_d = optionD
    if (correctAnswer !== undefined) {
      if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
        return NextResponse.json(
          { error: 'INVALID_ANSWER', message: '正確答案必須是 A、B、C 或 D' },
          { status: 400 }
        )
      }
      updates.correct_answer = correctAnswer
      updates.correct_option = correctAnswer
    }
    if (userCreatedHint !== undefined) updates.deceiver_option = userCreatedHint
    if (subject !== undefined) {
      const validSubjects = ['chinese', 'english', 'social', 'science', 'math']
      if (!validSubjects.includes(subject)) {
        return NextResponse.json(
          { error: 'INVALID_SUBJECT', message: '無效的學科' },
          { status: 400 }
        )
      }
      updates.subject = subject
    }
    if (difficulty !== undefined) {
      const difficultyValue = Number(difficulty)
      if (difficultyValue < 1 || difficultyValue > 5) {
        return NextResponse.json(
          { error: 'INVALID_DIFFICULTY', message: '難度必須在 1-5 之間' },
          { status: 400 }
        )
      }
      updates.difficulty = difficultyValue
    }

    // 如果沒有任何更新
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'NO_UPDATES', message: '沒有需要更新的內容' },
        { status: 400 }
      )
    }

    // 更新題目
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('ugc_questions')
      .update(updates)
      .eq('id', id)
      .eq('designer_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('[UGC Update] Database error:', updateError)
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '更新失敗' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '題目已更新',
      question: {
        id: updatedQuestion.id,
        questionText: updatedQuestion.question_text,
        subject: updatedQuestion.subject,
        difficulty: updatedQuestion.difficulty,
        reviewStatus: updatedQuestion.review_status,
        updatedAt: updatedQuestion.updated_at,
      },
    })
  } catch (error) {
    console.error('[UGC Update] Unexpected error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    )
  }
}
