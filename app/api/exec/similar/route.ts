/**
 * Similar Questions Executor
 * Fetches similar/past-paper questions from allowed sources
 */

import { NextRequest, NextResponse } from 'next/server'
import { SimilarResultSchema, SimilarQuestionSchema, type SimilarResult } from '@/lib/solve-types'
import { z } from 'zod'

const RequestSchema = z.object({
  originalQuestion: z.string(),
  subject: z.enum(['english', 'math', 'chinese', 'social', 'science', 'unknown']),
  difficulty: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'mixed']),
  count: z.number().int().min(1).max(20),
  skillTags: z.array(z.string()).default([]),
  sources: z.array(z.enum(['backpack', 'past_papers'])),
  userContext: z
    .object({
      userId: z.string().optional(),
      skills: z.array(z.string()).optional(),
      notes: z.array(z.string()).optional(),
    })
    .optional(),
})

type LabelingServiceResponse = {
  items: Array<{
    id: string
    stem: string
    options?: string[]
    source: string
    difficulty?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'mixed'
    tags?: string[]
  }>
  total: number
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { originalQuestion, subject, difficulty, count, skillTags, sources, userContext } =
      RequestSchema.parse(body)

    const baseQuery = originalQuestion.replace(/\s+/g, ' ').trim().slice(0, 160)
    const tagQuery = skillTags.length ? skillTags.join(',') : 'general'
    const searchQuery = `${baseQuery || 'question'} | tags:${tagQuery}`

    console.log('[exec/similar] subject:', subject, 'difficulty:', difficulty, 'count:', count)
    console.log('[exec/similar] query:', searchQuery)

    let payload: SimilarResult | null = null
    const labelingUrl = process.env.LABELING_SERVICE_URL

    if (labelingUrl) {
      try {
        const response = await fetch(`${labelingUrl.replace(/\/$/, '')}/similar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: baseQuery,
            subject,
            tags: skillTags,
            difficulty,
            limit: count,
            sources,
            userContext,
          }),
        })

        if (response.ok) {
          const json = (await response.json()) as LabelingServiceResponse
          payload = {
            questions: json.items.slice(0, count).map((item) => ({
              id: item.id,
              stem: item.stem,
              options: item.options,
              source: item.source,
              difficulty: item.difficulty || difficulty,
              tags: item.tags || skillTags,
            })),
            totalFound: json.total,
            searchQuery,
          }
        } else {
          console.warn('[exec/similar] labeling service returned status', response.status)
        }
      } catch (serviceError) {
        console.warn('[exec/similar] labeling service error:', serviceError)
      }
    }

    if (!payload) {
      const shouldReturnZero = baseQuery.length < 12
      const mocked = shouldReturnZero
        ? []
        : [
            {
              id: 'q001',
              stem: '下列何者最符合「關係子句—非限定用法」的正確用法？',
              options: [
                '(A) The book which I bought is on the table.',
                '(B) The book, which I bought, is on the table.',
                '(C) The book who I bought is on the table.',
                '(D) The book that I bought is on the table.',
              ],
              source: '109年學測 | 第12題',
              difficulty: 'B1',
              tags: ['關係子句', '非限定用法', '文法'],
            },
            {
              id: 'q002',
              stem: 'My friend, _____ works as a doctor, gave me some advice.',
              options: ['(A) who', '(B) which', '(C) whom', '(D) that'],
              source: '108年指考 | 第8題',
              difficulty: 'A2',
              tags: ['關係代名詞', '先行詞', '人'],
            },
            {
              id: 'q003',
              stem: 'The car _____ I just bought needs some repairs.',
              options: ['(A) which', '(B) who', '(C) where', '(D) when'],
              source: 'Backpack: 文法精選 | Q47',
              difficulty: 'A1',
              tags: ['關係子句', '限定用法'],
            },
          ]

      payload = {
        questions: mocked.slice(0, count),
        totalFound: shouldReturnZero ? 0 : 127,
        searchQuery,
      }
    }

    const latency = Date.now() - startTime
    console.log('[exec/similar] found', mockQuestions.questions.length, 'questions in', latency, 'ms')

    // Validate
    const validated = SimilarResultSchema.parse(mockQuestions)

    return NextResponse.json({
      result: validated,
      _meta: { latency_ms: latency, mock: true },
    })
  } catch (error) {
    console.error('[exec/similar] error:', error)
    const latency = Date.now() - startTime

    return NextResponse.json(
      {
        error: 'similar_executor_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        _meta: { latency_ms: latency },
      },
      { status: 500 }
    )
  }
}
