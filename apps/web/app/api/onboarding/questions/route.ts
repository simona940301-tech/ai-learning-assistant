import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/onboarding/questions
 * Get onboarding questions for challenge from seed_questions table
 *
 * Query params:
 * - difficulty: 1-3 (optional, single value)
 * - difficulties: comma-separated list (e.g., "1,2,3") - for dynamic difficulty
 * - subject: 'english' (optional, default)
 * - count: number (optional, default 7)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const difficultyParam = searchParams.get('difficulty')
    const difficultiesParam = searchParams.get('difficulties')
    const subject = searchParams.get('subject') || 'english'
    const count = parseInt(searchParams.get('count') || '7')

    // Build query - use seed_questions table as per new requirements
    let query = supabase
      .from('seed_questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty_level, subject')
      .eq('is_active', true)

    // Handle subject filter (default to english if not specified, but seed_questions has multiple subjects)
    if (subject) {
      query = query.eq('subject', subject)
    }

    // Handle difficulty filter(s)
    if (difficultiesParam) {
      // Multiple difficulties (for dynamic assessment)
      const difficulties = difficultiesParam.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
      if (difficulties.length > 0) {
        query = query.in('difficulty_level', difficulties)
      }
    } else if (difficultyParam) {
      // Single difficulty
      const difficulty = parseInt(difficultyParam)
      if (!isNaN(difficulty)) {
        query = query.eq('difficulty_level', difficulty)
      }
    }

    // Get questions
    const { data: questions, error } = await query
      .limit(count * 5) // Get more than needed for random selection

    if (error) {
      console.error('[OnboardingQuestionsAPI] Failed to fetch questions:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch questions'
      }, { status: 500 })
    }

    if (!questions || questions.length === 0) {
      // Try fallback without filters if specific query failed? No, just report empty.
      console.error('[OnboardingQuestionsAPI] No questions found in database')
      return NextResponse.json({
        success: false,
        error: 'No questions available'
      }, { status: 404 })
    }

    // Remove duplicates by ID first
    const uniqueQuestions = Array.from(
      new Map(questions.map(q => [q.id, q])).values()
    )

    // Randomly select the requested count (ensure no duplicates)
    const selectedQuestions = uniqueQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, count)

    // 🎯 Fetch explanations separately (same pattern as pve-helpers.ts)
    const questionIds = selectedQuestions.map(q => q.id)
    const { data: explanations, error: explError } = await supabase
      .from('question_explanations')
      .select('question_id, explanation_text, option_analysis')
      .in('question_id', questionIds)

    if (explError) {
      console.warn('[OnboardingQuestionsAPI] Failed to fetch explanations:', explError)
    }

    // Create explanation map with merged explanation_text and option_analysis
    const explanationMap = new Map<string, string>()
    if (explanations) {
      explanations.forEach((expl: any) => {
        let fullExplanation = expl.explanation_text || ''

        // Append option_analysis if it exists
        if (expl.option_analysis && typeof expl.option_analysis === 'object') {
          const optionAnalysis = expl.option_analysis

          // Normalize keys to uppercase
          const normalizedAnalysis: Record<string, string> = {}
          Object.keys(optionAnalysis).forEach(key => {
            normalizedAnalysis[key.toUpperCase()] = optionAnalysis[key]
          })

          const optionKeys = ['A', 'B', 'C', 'D'].filter(key => normalizedAnalysis[key])

          if (optionKeys.length > 0) {
            // Clean up dangling "選項分析：" from end of text
            fullExplanation = fullExplanation.replace(/\s*(\*\*|)?選項分析(\*\*|)?[:：]\s*$/g, '')

            fullExplanation += '\n\n**選項分析：**\n'
            optionKeys.forEach(key => {
              fullExplanation += `\n**選項 ${key}**：${normalizedAnalysis[key]}`
            })
          }
        }

        explanationMap.set(expl.question_id, fullExplanation)
      })
    }

    console.log('[OnboardingQuestionsAPI] Explanations fetched:', {
      total: explanations?.length || 0,
      questionCount: selectedQuestions.length,
      coverage: selectedQuestions.length > 0 ? Math.round((explanations?.length || 0) / selectedQuestions.length * 100) : 0
    })

    // Transform to expected format with explanations
    const transformedQuestions = selectedQuestions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      difficulty_level: q.difficulty_level,
      explanation: explanationMap.get(q.id) || undefined, // ✅ Include explanation from separate table
      subject: q.subject
    }))

    return NextResponse.json({
      success: true,
      questions: transformedQuestions
    })
  } catch (error) {
    console.error('[OnboardingQuestionsAPI] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
