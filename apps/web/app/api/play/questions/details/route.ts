import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/play/questions/details
 * 獲取題目的完整詳情（包括詳解、難度、出處等）
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const questionIds = searchParams.get('ids')?.split(',') || []

    if (questionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No question IDs provided' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 從 seed_questions 獲取題目詳情
    // 確保 questionIds 是 UUID 格式
    const validQuestionIds = questionIds.filter(id => id && typeof id === 'string')
    
    if (validQuestionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid question IDs' },
        { status: 400 }
      )
    }

    console.log('[Question Details] Fetching questions:', validQuestionIds.length)

    const { data: questions, error } = await supabase
      .from('seed_questions')
      .select(`
        id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        difficulty_level,
        subject,
        source,
        source_type,
        source_year,
        question_explanations(explanation_text)
      `)
      .in('id', validQuestionIds)

    if (error) {
      console.error('[Question Details] Error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // 格式化返回數據
    const formatted = (questions || []).map((q: any) => {
      const explanationEntry = Array.isArray(q.question_explanations)
        ? q.question_explanations[0]
        : q.question_explanations

      const explanationText = explanationEntry?.explanation_text || ''

      return {
        id: q.id,
        questionText: q.question_text,
        options: [q.option_a, q.option_b, q.option_c, q.option_d].filter((opt: string | null | undefined) => Boolean(opt && opt.trim().length)),
        correctAnswer: q.correct_answer,
        difficulty: q.difficulty_level || 3,
        explanation: explanationText,
        source: q.source_type && q.source_year
          ? `${q.source_type} ${q.source_year}`
          : q.source || null,
        subject: q.subject,
      }
    })

    return NextResponse.json({
      success: true,
      questions: formatted,
    })
  } catch (error) {
    console.error('[Question Details] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
