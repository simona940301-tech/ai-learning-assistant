import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/play/ugc-questions/approved
 * 獲取已審核通過的用戶自創題目（用於對戰系統）
 *
 * Query params:
 * - subject: 學科篩選 (可選)
 * - difficulty: 難度篩選 (可選，1-5)
 * - limit: 數量限制 (默認 20)
 * - random: 是否隨機抽取 (默認 true)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 解析查詢參數
    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')
    const difficulty = searchParams.get('difficulty')
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)
    const random = searchParams.get('random') !== 'false'

    // 構建查詢 - 只獲取已審核通過的題目
    let query = supabase
      .from('ugc_questions')
      .select('*')
      .eq('review_status', 'APPROVED')

    // 按學科過濾
    if (subject && ['chinese', 'english', 'social', 'science', 'math'].includes(subject)) {
      query = query.eq('subject', subject)
    }

    // 按難度過濾
    if (difficulty) {
      const difficultyNum = Number(difficulty)
      if (difficultyNum >= 1 && difficultyNum <= 5) {
        query = query.eq('difficulty', difficultyNum)
      }
    }

    // 限制數量
    query = query.limit(limit * 3) // 先取 3 倍數量，後續隨機抽取

    const { data: questions, error: queryError } = await query

    if (queryError) {
      console.error('[UGC Approved] Query error:', queryError)
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: '查詢失敗' },
        { status: 500 }
      )
    }

    // 隨機抽取
    let selectedQuestions = questions || []
    if (random && selectedQuestions.length > limit) {
      selectedQuestions = selectedQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, limit)
    } else {
      selectedQuestions = selectedQuestions.slice(0, limit)
    }

    // 格式化響應（統一題目格式）
    const formattedQuestions = selectedQuestions.map((q: any) => ({
      id: q.id,
      question_text: q.question_text,
      questionText: q.question_text, // 兼容字段
      options: [
        { id: 'A', text: q.option_a, label: 'A' },
        { id: 'B', text: q.option_b, label: 'B' },
        { id: 'C', text: q.option_c, label: 'C' },
        { id: 'D', text: q.option_d, label: 'D' },
      ],
      correct_answer: q.correct_answer,
      correctAnswer: q.correct_answer, // 兼容字段
      subject: q.subject,
      difficulty: q.difficulty,
      skill_tags: q.skill_tags || [],
      skillTags: q.skill_tags || [], // 兼容字段
      user_created_hint: q.deceiver_option || null, // 用戶自創提示
      is_ugc: true, // 標記為用戶自創題目
      designer_id: q.designer_id,
      usage_count: q.usage_count,
    }))

    // 更新使用計數（批量更新）
    if (formattedQuestions.length > 0) {
      const questionIds = formattedQuestions.map((q: any) => q.id)
      const { error: rpcError } = await supabase.rpc('increment_ugc_usage_count', { question_ids: questionIds })
      if (rpcError) {
        console.warn('[UGC Approved] Failed to increment usage count:', rpcError)
        // 不影響主流程，只記錄警告
      }
    }

    return NextResponse.json({
      success: true,
      questions: formattedQuestions,
      total: formattedQuestions.length,
      filters: {
        subject: subject || 'all',
        difficulty: difficulty || 'all',
      },
    })
  } catch (error) {
    console.error('[UGC Approved] Unexpected error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
      { status: 500 }
    )
  }
}
