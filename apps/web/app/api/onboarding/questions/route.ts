import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/onboarding/questions
 * Get onboarding questions for challenge
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

    // Build query
    let query = supabase
      .from('onboarding_questions')
      .select('*')
      .eq('is_active', true)
      .eq('subject', subject)

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
      .order('total_shown', { ascending: true }) // Prioritize less-shown questions
      .limit(count * 3) // Get more than needed for random selection

    if (error) {
      console.error('[OnboardingQuestionsAPI] Failed to fetch questions:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch questions'
      }, { status: 500 })
    }

    // Remove duplicates by ID first
    const uniqueQuestions = Array.from(
      new Map(questions.map(q => [q.id, q])).values()
    )

    // Randomly select the requested count (ensure no duplicates)
    const selectedQuestions = uniqueQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, count)

    return NextResponse.json({
      success: true,
      questions: selectedQuestions
    })
  } catch (error) {
    console.error('[OnboardingQuestionsAPI] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
