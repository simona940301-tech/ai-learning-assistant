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

    // Transform to expected format
    const transformedQuestions = selectedQuestions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      difficulty_level: q.difficulty_level,
      explanation: null, // seed_questions does not have explanation column
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
