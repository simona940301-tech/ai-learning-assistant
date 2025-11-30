import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { chatCompletionJSON } from '@/lib/gemini'
import { Api } from '@/lib/api/response'

interface SummarySource {
  canonical_skill: string
  note_md: string
}

interface SummarizeRequestBody {
  title?: string
  items: SummarySource[]
}

interface SummarizeResponseBody {
  kind: 'SummarizeLite'
  title: string
  bullets: string[]
  cta: { action_id: 'TRY_ANOTHER'; label: string }
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

    const { title, items }: SummarizeRequestBody = await request.json()
    if (!Array.isArray(items) || items.length === 0) {
      return Api.badRequest('items must be a non-empty array')
    }

    const digest = items
      .map((item, index) => `Item ${index + 1} — Skill: ${item.canonical_skill}\n${item.note_md}`)
      .join('\n\n---\n\n')

    const result = await chatCompletionJSON<SummarizeResponseBody>(
      [
        {
          role: 'system',
          content:
            'You synthesize study notes into concise review cards for GSAT learners. Output JSON with kind, title, bullets, and cta (TRY_ANOTHER).',
        },
        {
          role: 'user',
          content: [
            title ? `Desired title: ${title}` : 'Generate a concise Chinese title summarizing the shared concept.',
            'Notes:',
            digest,
            'Produce 3-5 bullet points with the most reusable takeaways.',
          ].join('\n\n'),
        },
      ],
      { model: 'gemini-1.5-flash', temperature: 0.3 }
    )

    return Api.success(result)
  } catch (error) {
    console.error('Summarize API error', error)
    return Api.serverError(
      error instanceof Error ? error.message : undefined
    )
  }
}
