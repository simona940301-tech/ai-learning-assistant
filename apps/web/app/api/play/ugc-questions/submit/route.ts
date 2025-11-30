import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/play/ugc-questions/submit
 * 提交用戶自創題目
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

    // 解析請求體
    const body = await request.json()
    const {
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

    // 驗證必填欄位
    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !subject) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '請填寫所有必填欄位' },
        { status: 400 }
      )
    }

    // 驗證正確答案
    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      return NextResponse.json(
        { error: 'INVALID_ANSWER', message: '正確答案必須是 A、B、C 或 D' },
        { status: 400 }
      )
    }

    // 驗證學科
    const validSubjects = ['chinese', 'english', 'social', 'science', 'math']
    if (!validSubjects.includes(subject)) {
      return NextResponse.json(
        { error: 'INVALID_SUBJECT', message: '無效的學科' },
        { status: 400 }
      )
    }

    // 驗證難度
    const difficultyValue = Number(difficulty) || 3
    if (difficultyValue < 1 || difficultyValue > 5) {
      return NextResponse.json(
        { error: 'INVALID_DIFFICULTY', message: '難度必須在 1-5 之間' },
        { status: 400 }
      )
    }

    // 插入題目到數據庫
    const { data: question, error: insertError } = await supabase
      .from('ugc_questions')
      .insert({
        designer_id: user.id,
        question_text: questionText,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: correctAnswer,
        correct_option: correctAnswer, // 兼容字段
        deceiver_option: userCreatedHint || '', // 保留原欄位名稱（數據庫層）
        subject,
        difficulty: difficultyValue,
        skill_tags: [], // 可選：未來可以添加技能標籤
        review_status: 'PENDING',
        usage_count: 0,
        total_rewards: 0,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[UGC Submit] Database error:', insertError)
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '提交失敗，請稍後再試' },
        { status: 500 }
      )
    }

    // 返回成功響應
    return NextResponse.json(
      {
        success: true,
        message: '題目已提交審核',
        question: {
          id: question.id,
          questionText: question.question_text,
          subject: question.subject,
          difficulty: question.difficulty,
          reviewStatus: question.review_status,
          createdAt: question.created_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[UGC Submit] Unexpected error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    )
  }
}
