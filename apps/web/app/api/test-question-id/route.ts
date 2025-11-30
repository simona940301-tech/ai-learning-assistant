import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase'

// This is a DEBUG endpoint for testing Phase 8.5
// Returns the ID of our test question
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Use service client to avoid auth issues in dev debug endpoint
    const supabase = getServiceSupabaseClient()

    // Find the test question by its stem
    const { data, error } = await supabase
      .from('pack_questions')
      .select('id, stem')
      .eq('stem', 'The Taiwanese national health insurance (NHI) scheme is ranked one of the best in the world. In 1995, the system was (1) in Taiwan, a small island with a population of roughly 23 million. What does (1) most likely refer to?')
      .single()

    if (error) {
      console.error('[Test Question ID API] Supabase error:', error)
      return NextResponse.json(
        {
          error: 'Question not found',
          details: error.message || 'Please run SEED_TEST_PACKS_QUESTIONS.sql first',
          hint: 'If you recently reseeded, try hard-refreshing and ensure only one test question exists.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      questionId: data.id,
      stem: data.stem,
      note: 'This is a test endpoint for Phase 8.5 testing. Remove in production.'
    })
  } catch (error) {
    console.error('[Test Question ID API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
