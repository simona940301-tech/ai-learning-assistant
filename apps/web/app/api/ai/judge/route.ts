import { NextRequest, NextResponse } from 'next/server'
import { chatCompletionJSON } from '@/lib/openai'

interface ConceptOption {
  id: string
  label: string
  is_correct: boolean
  why_plausible: string
}

interface JudgeRequestBody {
  question: string
  options: ConceptOption[]
  selected_option_id: string
}

interface JudgeResponseBody {
  correct: boolean
  canonical_skill: string
  answer: string
  steps: string[]
  mistakes: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { question, options, selected_option_id }: JudgeRequestBody = await request.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }
    if (!Array.isArray(options) || options.length === 0) {
      return NextResponse.json({ error: 'options must be a non-empty array' }, { status: 400 })
    }
    if (!selected_option_id) {
      return NextResponse.json({ error: 'selected_option_id is required' }, { status: 400 })
    }

    const serializedOptions = options
      .map((option) => `${option.id}. ${option.label} → correct:${option.is_correct} | reason:${option.why_plausible}`)
      .join('\n')

    const result = await chatCompletionJSON<JudgeResponseBody>(
      [
        {
          role: 'system',
          content:
            'You judge whether the learner picked the correct grammar concept for an English GSAT question. Respond with JSON only.',
        },
        {
          role: 'user',
          content: [
            `Question:\n${question.trim()}`,
            'Options:',
            serializedOptions,
            `Selected Option ID: ${selected_option_id}`,
            'Return JSON with keys: correct (boolean), canonical_skill (≤15 Chinese chars), answer (original English answer), steps (array of 2-4 concise Chinese strings), mistakes (array of 1-2 common mistakes).',
          ].join('\n\n'),
        },
      ],
      {
        model: 'gpt-4o-mini',
        temperature: 0.1,
      }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Judge API error', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
