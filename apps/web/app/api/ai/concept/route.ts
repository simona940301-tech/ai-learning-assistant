import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { chatCompletionJSON } from '@/lib/gemini'

interface ConceptOption {
  id: string
  label: string
  is_correct: boolean
  why_plausible: string
}

interface ConceptResponse {
  options: ConceptOption[]
}

interface ConceptRequestBody {
  question: string
  context?: string
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorType } = await getApiUser(request)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
          ? 'Authentication required'
          : 'Authentication error occurred'

      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message,
          errorType,
        },
        { status: 401 }
      )
    }

    const { question, context }: ConceptRequestBody = await request.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    const userPrompt = [
      `Question:\n${question.trim()}`,
      context ? `Context:\n${context.trim()}` : null,
      'Return JSON with an "options" array of four objects.',
      'Each object must include id ("A" through "D"), label (Chinese concept name ≤12 chars), is_correct (boolean), and why_plausible (≤40 Chinese characters).',
      'Exactly one option should have is_correct = true.',
    ]
      .filter(Boolean)
      .join('\n\n')

    const completion = await chatCompletionJSON<ConceptResponse>(
      [
        {
          role: 'system',
          content:
            'You are a diagnostic concept router for GSAT-style English questions. Suggest four concise concept options in Chinese. Output JSON only.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      {
        model: 'gpt-4o-mini',
        temperature: 0.1,
      }
    )

    if (!Array.isArray(completion.options) || completion.options.length !== 4) {
      throw new Error('OpenAI response did not include exactly four options')
    }

    return NextResponse.json({ options: completion.options })
  } catch (error) {
    console.error('Concept API error', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
