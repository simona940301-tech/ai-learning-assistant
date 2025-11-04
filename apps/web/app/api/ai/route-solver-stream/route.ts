import { NextRequest } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { ExplainCardSchema } from '@/lib/contracts/explain'
import { generateE4TemplateStream } from '@/lib/english/templates-streaming'

const InputSchema = z.object({
  text: z.string().trim().optional(),
  questionText: z.string().trim().optional(),
  options: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
})

/**
 * Streaming API endpoint for explanation generation
 * Returns Server-Sent Events (SSE) stream
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = InputSchema.parse(body)
    const questionText = input.text || input.questionText || ''

    if (!questionText.trim()) {
      return new Response(JSON.stringify({ error: 'question_text_required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse options if provided
    const options = input.options || []

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (type: string, data: any) => {
          const message = `data: ${JSON.stringify({ type, data })}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        try {
          // Start streaming E4 generation
          send('status', { stage: 'starting', message: '開始生成詳解...' })

          const cardId = nanoid()
          let accumulatedText = ''
          let completedQuestions: any[] = []
          let finalPassage = ''
          let finalQuestions: any[] = []
          let finalGroupId = ''

          for await (const event of generateE4TemplateStream(questionText, options)) {
            if (event.type === 'status') {
              send('status', event.data)
            } else if (event.type === 'text') {
              accumulatedText += event.data.chunk
              send('text', { chunk: event.data.chunk, total: accumulatedText.length })
            } else if (event.type === 'question') {
              completedQuestions[event.data.index] = event.data.question
              send('question', {
                index: event.data.index,
                question: event.data.question,
                total: completedQuestions.filter(Boolean).length,
              })
            } else if (event.type === 'complete') {
              finalPassage = event.data.passage
              finalQuestions = event.data.questions
              finalGroupId = event.data.groupId
              completedQuestions = event.data.answers

              // Build final card
              const meta = {
                article: finalPassage,
                groupId: finalGroupId,
                hasMultipleQuestions: finalQuestions.length >= 2,
                questionCount: finalQuestions.length,
                questions: finalQuestions.map((q: any, idx: number) => {
                  const answerData = completedQuestions.find((a: any) => a.id === q.id || a.id === idx + 1) || completedQuestions[idx] || {}
                  const correctOption = (q.options || []).find((opt: any) => opt.key === q.answer) || q.options?.[0]

                  return {
                    id: q.id,
                    answer: answerData.answer || (q.answer ? `${q.answer} — ${correctOption?.text || ''}` : ''),
                    evidence: answerData.evidence || q.evidence || '',
                    reason: answerData.reason || q.reason || '',
                    reasoning: answerData.reasoning || '',
                    reasoningText: answerData.reasoning || '', // Add reasoningText for UI
                    counterpoints: answerData.counterpoints || {},
                    common_mistake: answerData.commonMistake || answerData.common_mistake || '',
                    strategy: answerData.strategy || '',
                    summary: answerData.summary || '',
                  }
                }),
              }

              const card: any = {
                id: cardId,
                question: questionText,
                kind: 'E4',
                translation: finalPassage,
                cues: [],
                options: [],
                steps: [],
                correct: undefined,
                vocab: [],
                meta,
                nextActions: [
                  { label: '換同型題', action: 'drill-similar' },
                  { label: '加入錯題本', action: 'save-error' },
                ],
              }

              // Validate card
              const validation = ExplainCardSchema.safeParse(card)
              if (validation.success) {
                send('complete', { card: validation.data })
              } else {
                console.error('[route-solver-stream] Card validation failed:', validation.error.issues)
                send('error', { message: 'Card validation failed', details: validation.error.issues })
              }
            } else if (event.type === 'error') {
              send('error', event.data)
            }
          }

          send('done', {})
        } catch (error) {
          send('error', { message: error instanceof Error ? error.message : 'Unknown error' })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
