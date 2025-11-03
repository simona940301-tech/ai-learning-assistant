import { NextRequest, NextResponse } from 'next/server'
import { chatCompletionJSON } from '@/lib/openai'

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
    const { title, items }: SummarizeRequestBody = await request.json()
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 })
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
      { model: 'gpt-4o-mini', temperature: 0.3 }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Summarize API error', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
