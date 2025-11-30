import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuestions, generateFromErrorBook, cacheGeneratedQuestion } from '@/lib/services/rag-question-generator'

/**
 * POST /api/questions/generate
 *
 * Generate practice questions using RAG when question bank is insufficient
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      conceptTag,
      subject,
      difficulty,
      count = 5,
      useErrorBook = true,
      cacheQuestions = true
    } = body

    if (!conceptTag || !subject) {
      return NextResponse.json(
        { error: 'conceptTag and subject are required' },
        { status: 400 }
      )
    }

    // Generate questions
    let questions
    if (useErrorBook) {
      questions = await generateFromErrorBook(user.id, conceptTag, count, supabase)
    } else {
      questions = await generateQuestions({
        conceptTag,
        subject,
        difficulty: difficulty || 3,
        count
      })
    }

    // Optionally cache generated questions
    if (cacheQuestions) {
      const cachePromises = questions.map(q => cacheGeneratedQuestion(q, supabase))
      await Promise.all(cachePromises)
    }

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
      metadata: {
        conceptTag,
        subject,
        generated_at: new Date().toISOString(),
        cached: cacheQuestions
      }
    })

  } catch (error) {
    console.error('[Question Generate API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate questions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
