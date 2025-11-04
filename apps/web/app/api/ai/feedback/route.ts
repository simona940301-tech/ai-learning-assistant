import { NextRequest, NextResponse } from 'next/server'
import { chatCompletionJSON } from '@/lib/openai'

interface FeedbackRequestBody {
  question: string
  selected_option_label: string
  judge: {
    correct: boolean
    canonical_skill: string
    answer: string
    steps: string[]
    mistakes: string[]
  }
}

interface FeedbackResponse {
  kind: 'ConceptFeedbackLite'
  md: string
  next_actions: Array<{ action_id: 'TRY_ANOTHER' | 'SAVE_TO_BACKPACK'; label: string }>
}

export async function POST(request: NextRequest) {
  try {
    const { question, selected_option_label, judge }: FeedbackRequestBody = await request.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }
    if (!selected_option_label?.trim()) {
      return NextResponse.json({ error: 'selected_option_label is required' }, { status: 400 })
    }
    if (!judge) {
      return NextResponse.json({ error: 'judge result is required' }, { status: 400 })
    }

    const summary = [
      `Question:\n${question.trim()}`,
      `Learner picked: ${selected_option_label}`,
      `Correct answer: ${judge.answer}`,
      `Canonical Skill: ${judge.canonical_skill}`,
      `Steps: ${judge.steps.join(' / ')}`,
      `Mistakes: ${judge.mistakes.join(' / ')}`,
    ].join('\n')

    const result = await chatCompletionJSON<FeedbackResponse>(
      [
        {
          role: 'system',
          content:
            'You create a short feedback card for a learner after judging a GSAT English question. Respond with JSON containing kind, md, and next_actions. md must be Markdown under 120 words.',
        },
        { role: 'user', content: summary },
      ],
      { model: 'gpt-4o-mini', temperature: 0.3 }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Feedback API error', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
