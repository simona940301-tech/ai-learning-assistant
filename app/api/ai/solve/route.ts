import { NextRequest, NextResponse } from 'next/server'
import { chatCompletionJSON } from '@/lib/openai'

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
    const { question, judge }: SolveRequestBody = await request.json()
    if (!question?.trim()) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }
    if (!judge) {
      return NextResponse.json({ error: 'judge result is required' }, { status: 400 })
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
      { model: 'gpt-4o-mini', temperature: 0.25 }
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Solve API error', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
