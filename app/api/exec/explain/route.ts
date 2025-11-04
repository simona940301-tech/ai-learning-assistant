/**
 * Explain Executor
 * Generates detailed step-by-step solution for a question
 */

import { NextRequest, NextResponse } from 'next/server'
import { chatCompletionJSON } from '@/lib/openai'
import { ExplainResultSchema, type ExplainResult } from '@/lib/solve-types'
import { z } from 'zod'

const RequestSchema = z.object({
  questionText: z.string().min(1),
  subject: z.enum(['english', 'math', 'chinese', 'social', 'science', 'unknown']),
  showSteps: z.boolean().default(true),
  format: z.enum(['full', 'compact']).default('full'),
})

const EXPLAIN_SYSTEM_PROMPT = `You are an expert GSAT tutor helping high school students.
Generate a crisp explanation that fits a four-part mobile card.

Return STRICT JSON with this structure:
{
  "answer": "答案：[A/B/C/D or actual answer]",
  "focus": "考點關鍵詞（例如：關係子句）",
  "summary": "一句話解析，說明為何考這個點",
  "steps": [
    "步驟1：簡短說明",
    "步驟2：簡短說明",
    "步驟3：簡短說明"
  ],
  "details": [
    "詳解第 1 段（1-2 句）",
    "詳解第 2 段（可省略）",
    "詳解第 3 段（可省略）"
  ],
  "grammarTable": [
    {
      "category": "類別",
      "description": "說明",
      "example": "範例"
    }
  ],
  "encouragement": "學長姐風格的鼓勵話（可省略）"
}

Rules:
- focus: ONE short noun phrase only
- summary: exactly one sentence
- steps: 3-5 concise items, each under 50 chars
- details: 1-3 short paragraphs, no markdown, no bullet lists
- grammarTable: Only for English/Chinese subjects, max 3 rows; omit otherwise
- Do NOT mention延伸練習 or外部連結
- Keep tone warm but efficient`

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { questionText, subject, showSteps, format } = RequestSchema.parse(body)

    console.log('[exec/explain] question:', questionText.substring(0, 100), 'subject:', subject)

    // Build prompt
    let userPrompt = `Question: ${questionText}\nSubject: ${subject}\n\nGenerate explanation.`

    if (format === 'compact') {
      userPrompt += '\nUse compact format: shorter steps, no grammar table.'
    }

    if (!showSteps) {
      userPrompt += '\nReturn empty steps array (student wants answer only).'
    }

    // Call OpenAI
    const result = await chatCompletionJSON<ExplainResult>(
      [
        { role: 'system', content: EXPLAIN_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { model: 'gpt-4o', temperature: 0.3 }
    )

    // Validate
    const validated = ExplainResultSchema.parse(result)

    // Remove grammar table for non-language subjects
    if (subject !== 'english' && subject !== 'chinese') {
      validated.grammarTable = undefined
    }

    const latency = Date.now() - startTime
    console.log('[exec/explain] generated in', latency, 'ms')

    return NextResponse.json({
      result: validated,
      _meta: { latency_ms: latency },
    })
  } catch (error) {
    console.error('[exec/explain] error:', error)
    const latency = Date.now() - startTime

    // Fallback safe answer (per spec: >12s timeout → safe minimal answer)
    if (latency > 12000) {
      const fallback: ExplainResult = {
        answer: '答案：請參考解析',
        focus: '核心概念',
        summary: '這題考察基礎概念的理解與應用',
        steps: ['仔細閱讀題幹', '識別關鍵字詞', '運用相關概念解題'],
        details: ['伺服器忙碌時提供安全回覆：先確認題幹、鎖定考點，再以基本概念檢查選項。'],
        encouragement: '慢慢來，多練習就會進步！',
      }
      return NextResponse.json({
        result: fallback,
        _meta: { latency_ms: latency, fallback: true },
      })
    }

    return NextResponse.json(
      {
        error: 'explain_executor_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        _meta: { latency_ms: latency },
      },
      { status: 500 }
    )
  }
}
