import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'

/**
 * POST /api/play/questions/seed
 *
 * Get seed questions from database for PVE training
 *
 * Body:
 * - subject: string (optional) - filter by subject
 * - difficulty: number (optional) - filter by difficulty
 * - numQuestions: number (default: 10) - number of questions to fetch
 * - excludeIds: string[] (optional) - exclude specific question IDs
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subject, difficulty, numQuestions = 10, excludeIds = [] } = body

    const supabase = getSupabaseClient(req)

    // Check for internal API key to bypass RLS/Auth if needed
    const internalApiKey = req.headers.get('x-internal-api-key')
    const envInternalApiKey = process.env.INTERNAL_API_KEY

    let adminSupabase = supabase
    if (internalApiKey && envInternalApiKey && internalApiKey === envInternalApiKey) {
      console.log('[Seed Questions] Using internal API key for admin access')
      // Create admin client with service role key
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (serviceRoleKey && supabaseUrl) {
        const { createClient } = await import('@supabase/supabase-js')
        adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          }
        })
      }
    }

    // Use adminSupabase for queries if available, otherwise fallback to user supabase
    const db = adminSupabase

    // Build query
    let query = db
      .from('seed_questions')
      .select('*')

    // Apply filters
    if (subject) {
      query = query.eq('subject', subject)
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }
    if (excludeIds && excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }

    // Fetch random questions
    const { data: questions, error } = await query
      .limit(numQuestions * 2) // Fetch more than needed for randomization
      .order('id', { ascending: false })

    if (error) {
      console.error('[Seed Questions] Database error:', error)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_QUESTIONS_FOUND',
            message: 'No seed questions available for the specified filters',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // Randomize and select requested number
    const shuffled = questions.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, numQuestions)

    // Transform to expected format
    const formattedQuestions = selected.map((q: any) => ({
      id: q.id?.toString() || '',
      question_text: q.question_text || q.questionText || '',
      options: q.options || [],
      correct_answer: q.correct_answer || q.correctAnswer || '',
      difficulty: q.difficulty || 1,
      time_limit: q.time_limit || q.timeLimit || 20,
      skill_tags: q.skill_tags || q.skillTags || [],
      subject: q.subject || '',
    }))

    return NextResponse.json({
      success: true,
      questions: formattedQuestions,
      total: formattedQuestions.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Seed Questions] Error:', error)
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
