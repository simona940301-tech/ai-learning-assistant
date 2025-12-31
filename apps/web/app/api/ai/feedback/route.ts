import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { chatCompletionJSON } from '@/lib/gemini'
import { Api } from '@/lib/api/response'

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
    const { user, errorType } = await getApiUser(request)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
            ? 'Authentication required'
            : 'Authentication error occurred'

      return Api.unauthorized(message)
    }

    const { question, selected_option_label, judge }: FeedbackRequestBody = await request.json()
    if (!question?.trim()) {
      return Api.badRequest('question is required')
    }
    if (!selected_option_label?.trim()) {
      return Api.badRequest('selected_option_label is required')
    }
    if (!judge) {
      return Api.badRequest('judge result is required')
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
      { model: 'gemini-1.5-flash', temperature: 0.3 }
    )

    return Api.success(result)
  } catch (error) {
    console.error('Feedback API error', error)
    return Api.serverError(
      error instanceof Error ? error.message : undefined
    )
  }
}
