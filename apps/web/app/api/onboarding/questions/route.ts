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

    // Build query - revert to use onboarding_questions table as per requirements
    let query = supabase
      .from('onboarding_questions')
      .select('*')
      .eq('is_active', true) // Only get active questions
    // .eq('subject', subject) // onboarding_questions might not have subject or it uses valid default. 
    // Checking local file view in step 20 (previous version was simple), the new version in step 27 added subject filter.
    // Let's check if onboarding_questions has 'subject'. If not, remove it.
    // The user wants to revert. The previous version (step 20) was:
    // .from('onboarding_questions').select('*').eq('is_active', true).order('difficulty_level').limit(3)
    // The current version (step 27) adds subject filter equal to 'english'.
    // I should be careful. I will assume subject 'english' is fine or optional. 
    // But looking at step 20, it didn't filter by subject.
    // I will remove subject filter to be safe and true to "revert".

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

    // Transform to expected format (seed_questions already uses difficulty_level)
    const transformedQuestions = selectedQuestions.map(q => ({
      id: q.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      difficulty_level: q.difficulty_level, // Already using correct field name
      explanation: q.explanation,
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
