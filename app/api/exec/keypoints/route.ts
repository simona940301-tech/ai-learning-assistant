/**
 * Key Points Executor
 * Generates concise exam tips and key concepts summary
 */

import { NextRequest, NextResponse } from 'next/server'
import { chatCompletionJSON } from '@/lib/openai'
import { KeyPointsResultSchema, type KeyPointsResult } from '@/lib/solve-types'
import { z } from 'zod'

const RequestSchema = z.object({
  questionText: z.string(),
  subject: z.enum(['english', 'math', 'chinese', 'social', 'science', 'unknown']),
  target: z.enum(['exam_tips', 'concepts', 'vocab']),
  maxBullets: z.number().int().min(1).max(10).default(5),
})

const KEYPOINTS_SYSTEM_PROMPT = `You are a GSAT exam prep expert summarizing key points.
Generate concise, actionable bullet points for students.

Response format (JSON):
{
  "title": "簡短標題（如：「關係子句 - 考試重點」）",
  "bullets": [
    "• 重點1：簡潔說明",
    "• 重點2：簡潔說明",
    "• 重點3：簡潔說明"
  ],
  "examples": [
    {
      "label": "範例類型",
      "example": "具體example"
    }
  ]
}

Rules:
- title: Under 20 chars, descriptive
- bullets: 3-7 items, each under 60 chars
- examples: 2-4 concrete examples (optional)
- Use clear, student-friendly language
- Focus on exam-relevant insights`

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { questionText, subject, target, maxBullets } = RequestSchema.parse(body)

    console.log('[exec/keypoints] subject:', subject, 'target:', target, 'max:', maxBullets)

    // Build prompt based on target
    let targetDescription = ''
    if (target === 'exam_tips') {
      targetDescription = 'Focus on exam strategies and common mistakes to avoid.'
    } else if (target === 'concepts') {
      targetDescription = 'Focus on core concepts and definitions.'
    } else {
      targetDescription = 'Focus on key vocabulary and terminology.'
    }

    const userPrompt = `Question context: ${questionText}
Subject: ${subject}
Target: ${target}

${targetDescription}

Generate ${maxBullets} key points.`

    // Call OpenAI
    const result = await chatCompletionJSON<KeyPointsResult>(
      [
        { role: 'system', content: KEYPOINTS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { model: 'gpt-4o-mini', temperature: 0.3 }
    )

    // Limit bullets to maxBullets
    if (result.bullets.length > maxBullets) {
      result.bullets = result.bullets.slice(0, maxBullets)
    }

    // Validate
    const validated = KeyPointsResultSchema.parse(result)

    const latency = Date.now() - startTime
    console.log('[exec/keypoints] generated', validated.bullets.length, 'bullets in', latency, 'ms')

    return NextResponse.json({
      result: validated,
      _meta: { latency_ms: latency },
    })
  } catch (error) {
    console.error('[exec/keypoints] error:', error)
    const latency = Date.now() - startTime

    return NextResponse.json(
      {
        error: 'keypoints_executor_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        _meta: { latency_ms: latency },
      },
      { status: 500 }
    )
  }
}
