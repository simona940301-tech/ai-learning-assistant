import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { chatCompletionJSON } from '@/lib/gemini'
import { Api } from '@/lib/api/response'

interface SolveRequestBody {
  question: string
  judge: {
    canonical_skill: string
    answer: string
    steps: string[]
    mistakes: string[]
  }
}

interface SolveResponseBody {
  kind: 'SolveNoteLite'
  md: string
  summary_bullets: string[]
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

    const { question, judge }: SolveRequestBody = await request.json()
    if (!question?.trim()) {
      return Api.badRequest('question is required')
    }
    if (!judge) {
      return Api.badRequest('judge result is required')
    }

    const prompt = [
      `Question:\n${question.trim()}`,
      `Canonical Skill: ${judge.canonical_skill}`,
      `Answer: ${judge.answer}`,
      `Solution Steps: ${judge.steps.join(' / ')}`,
      `Common Mistakes: ${judge.mistakes.join(' / ')}`,
      'Create a concise Markdown table summarizing the concept, evidence, common traps, and practice advice. Provide 2-4 summary bullets highlighting takeaways.',
      'Respond with JSON containing kind="SolveNoteLite", md (Markdown), and summary_bullets (array of strings).',
    ].join('\n\n')

    const result = await chatCompletionJSON<SolveResponseBody>(
      [
        {
          role: 'system',
          content:
            'You are a GSAT English tutor generating structured study notes. Keep a calm professional tone. Output JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      {
        useCase: 'quick', // ⚡ Use 2.5 Flash for fast response
        temperature: 0.25
      }
    )

    return Api.success(result)
  } catch (error) {
    console.error('Solve API error', error)
    return Api.serverError(
      error instanceof Error ? error.message : undefined
    )
  }
}
