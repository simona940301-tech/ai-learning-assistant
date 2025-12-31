import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateHint, trackHintUsage } from '@/lib/services/micro-hints'

/**
 * POST /api/hints/generate
 *
 * Generate a progressive hint for a struggling user
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
      questionId,
      questionText,
      options,
      correctAnswer,
      subject,
      conceptTags,
      userAttempts = 0,
      previousHints = []
    } = body

    if (!questionText || !options || !correctAnswer || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate hint
    const hint = await generateHint({
      questionText,
      options,
      correctAnswer,
      subject,
      conceptTags: conceptTags || [],
      userAttempts,
      previousHints
    })

    // Log hint generation
    console.log('[Hints] Generated hint:', {
      userId: user.id,
      questionId,
      level: hint.level,
      type: hint.hintType,
      attempts: userAttempts
    })

    return NextResponse.json({
      success: true,
      hint: hint.hint,
      level: hint.level,
      hintType: hint.hintType,
      shouldRevealAnswer: hint.shouldRevealAnswer,
      message: hint.shouldRevealAnswer
        ? '已經給了 3 個提示，建議查看完整解析'
        : `提示級別 ${hint.level}/3`
    })

  } catch (error) {
    console.error('[Hints API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate hint',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/hints/feedback
 *
 * Track whether a hint was helpful
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { questionId, hintLevel, hintType, wasHelpful } = body

    await trackHintUsage(
      user.id,
      questionId,
      { level: hintLevel, hintType, hint: '', shouldRevealAnswer: false },
      wasHelpful,
      supabase
    )

    return NextResponse.json({
      success: true,
      message: 'Hint feedback recorded'
    })

  } catch (error) {
    console.error('[Hints Feedback API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    )
  }
}
