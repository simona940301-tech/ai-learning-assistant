import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { chatCompletionJSON } from '@/lib/gemini'
import { Api } from '@/lib/api/response'

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

    const { question, options, selected_option_id }: JudgeRequestBody = await request.json()
    if (!question?.trim()) {
      return Api.badRequest('question is required')
    }
    if (!Array.isArray(options) || options.length === 0) {
      return Api.badRequest('options must be a non-empty array')
    }
    if (!selected_option_id) {
      return Api.badRequest('selected_option_id is required')
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
        model: 'gemini-1.5-flash',
        temperature: 0.1,
      }
    )

    return Api.success(result)
  } catch (error) {
    console.error('Judge API error', error)
    return Api.serverError(
      error instanceof Error ? error.message : undefined
    )
  }
}
