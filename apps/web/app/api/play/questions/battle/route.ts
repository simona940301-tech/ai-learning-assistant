import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/play/questions/battle
 *
 * 獲取對戰題目（支援系統題庫、用戶自創題目、混合模式）
 *
 * Body:
 * - subject: string (可選) - 學科篩選
 * - difficulty: number (可選) - 難度篩選
 * - numQuestions: number (默認 10) - 題目數量
 * - questionSource: 'SYSTEM' | 'UGC' | 'MIXED' (默認 'SYSTEM') - 題目來源
 * - enableUserCreatedQuestions: boolean (默認 false) - 是否啟用用戶自創題目
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      subject,
      difficulty,
      numQuestions = 10,
      questionSource = 'SYSTEM',
      enableUserCreatedQuestions = false,
    } = body

    const supabase = await createClient()

    let systemQuestions: any[] = []
    let ugcQuestions: any[] = []

    // 根據 questionSource 決定題目來源
    const needSystemQuestions = questionSource === 'SYSTEM' || questionSource === 'MIXED'
    const needUGCQuestions = (questionSource === 'UGC' || questionSource === 'MIXED') && enableUserCreatedQuestions

    // 1. 獲取系統題目
    if (needSystemQuestions) {
      let systemQuery = supabase
        .from('seed_questions')
        .select('*')

      if (subject) {
        systemQuery = systemQuery.eq('subject', subject)
      }
      if (difficulty) {
        systemQuery = systemQuery.eq('difficulty', difficulty)
      }

      const { data: sysData, error: sysError } = await systemQuery
        .limit(questionSource === 'MIXED' ? numQuestions * 2 : numQuestions * 3)
        .order('id', { ascending: false })

      if (sysError) {
        console.error('[Battle Questions] System questions error:', sysError)
      } else {
        systemQuestions = sysData || []
      }
    }

    // 2. 獲取用戶自創題目（僅 APPROVED 狀態）
    if (needUGCQuestions) {
      let ugcQuery = supabase
        .from('ugc_questions')
        .select('*')
        .eq('review_status', 'APPROVED')

      if (subject) {
        ugcQuery = ugcQuery.eq('subject', subject)
      }
      if (difficulty) {
        ugcQuery = ugcQuery.eq('difficulty', difficulty)
      }

      const { data: ugcData, error: ugcError } = await ugcQuery
        .limit(questionSource === 'MIXED' ? numQuestions * 2 : numQuestions * 3)
        .order('created_at', { ascending: false })

      if (ugcError) {
        console.error('[Battle Questions] UGC questions error:', ugcError)
      } else {
        ugcQuestions = ugcData || []
      }
    }

    // 3. 格式化系統題目
    const formattedSystemQuestions = systemQuestions.map((q: any) => ({
      id: q.id?.toString() || '',
      question_text: q.question_text || q.questionText || '',
      questionText: q.question_text || q.questionText || '',
      options: q.options || [],
      correct_answer: q.correct_answer || q.correctAnswer || '',
      correctAnswer: q.correct_answer || q.correctAnswer || '',
      difficulty: q.difficulty || 1,
      time_limit: q.time_limit || q.timeLimit || 20,
      timeLimit: q.time_limit || q.timeLimit || 20,
      skill_tags: q.skill_tags || q.skillTags || [],
      skillTags: q.skill_tags || q.skillTags || [],
      subject: q.subject || '',
      is_ugc: false,
    }))

    // 4. 格式化用戶自創題目
    const formattedUGCQuestions = ugcQuestions.map((q: any) => ({
      id: `ugc_${q.id}`,
      question_text: q.question_text || '',
      questionText: q.question_text || '',
      options: [
        { id: 'A', text: q.option_a, label: 'A' },
        { id: 'B', text: q.option_b, label: 'B' },
        { id: 'C', text: q.option_c, label: 'C' },
        { id: 'D', text: q.option_d, label: 'D' },
      ],
      correct_answer: q.correct_answer || '',
      correctAnswer: q.correct_answer || '',
      difficulty: q.difficulty || 3,
      time_limit: 20,
      timeLimit: 20,
      skill_tags: q.skill_tags || [],
      skillTags: q.skill_tags || [],
      subject: q.subject || '',
      is_ugc: true,
      user_created_hint: q.deceiver_option || null,
      designer_id: q.designer_id,
    }))

    // 5. 混合並隨機選擇題目
    let allQuestions: any[] = []

    if (questionSource === 'SYSTEM') {
      allQuestions = formattedSystemQuestions
    } else if (questionSource === 'UGC') {
      allQuestions = formattedUGCQuestions
    } else if (questionSource === 'MIXED') {
      // 混合模式：50% 系統題目 + 50% 用戶自創題目
      const halfNum = Math.ceil(numQuestions / 2)
      const systemSample = formattedSystemQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, halfNum)
      const ugcSample = formattedUGCQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, halfNum)
      allQuestions = [...systemSample, ...ugcSample]
    }

    // 6. 隨機打亂並選擇指定數量
    const shuffled = allQuestions.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, numQuestions)

    // 7. 檢查是否有足夠的題目
    if (selected.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_QUESTIONS_FOUND',
            message: '找不到符合條件的題目',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // 8. 更新用戶自創題目的使用計數
    const ugcIds = selected
      .filter((q) => q.is_ugc)
      .map((q) => q.id.replace('ugc_', ''))

    if (ugcIds.length > 0) {
      // Update usage count for UGC questions
      // Note: Supabase JS client doesn't support raw SQL, so we update individually
      for (const ugcId of ugcIds) {
        const { data: currentQuestion } = await supabase
          .from('ugc_questions')
          .select('usage_count')
          .eq('id', ugcId)
          .single()

        if (currentQuestion) {
          await supabase
            .from('ugc_questions')
            .update({ usage_count: (currentQuestion.usage_count || 0) + 1 })
            .eq('id', ugcId)
        }
      }
    }

    return NextResponse.json({
      success: true,
      questions: selected,
      total: selected.length,
      source: questionSource,
      breakdown: {
        system: selected.filter((q) => !q.is_ugc).length,
        ugc: selected.filter((q) => q.is_ugc).length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Battle Questions] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
