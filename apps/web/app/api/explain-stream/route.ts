/**
 * /api/explain-stream - Streaming Explanation API (SSE)
 *
 * ✅ 階段三：流式響應 + 快速答案生成 + 緩存支持
 */

export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { universalExplainer } from '@/lib/ai/universal-explainer'
import { basicExtractor } from '@/lib/ai/basic-extractor'
import { minimalFallback } from '@/lib/ai/minimal-fallback'
import { getCachedExplanation, setCachedExplanation } from '@/lib/cache/explain-cache'
import { chatCompletionJSON } from '@/lib/gemini'
import { safeText } from '@/lib/safe-text'

const Schema = z.object({
  input: z.object({
    text: z.string().optional(),
  }),
  mode: z.enum(['fast', 'deep']).optional(),
})

/**
 * ✅ 階段三：快速生成答案（簡短 prompt）
 */
async function generateQuickAnswer(text: string): Promise<{ answer: string } | null> {
  try {
    const prompt = `題目：${text.substring(0, 500)}

請只提供答案（A/B/C/D），格式：{"answer": "B"}`

    const result = await Promise.race([
      chatCompletionJSON<{ answer: string }>(
        [{ role: 'user', content: prompt }],
        {
          model: 'gpt-4o-mini',
          temperature: 0.3,
          maxOutputTokens: 50,
        }
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)), // 2秒超時
    ])

    return result
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: any) => {
        const message = `data: ${JSON.stringify({ type, data })}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      try {
        const body = await request.json()
        const validated = Schema.parse(body)
        const text = safeText(validated.input.text, '')

        if (!text || text.trim().length === 0) {
          send('error', { message: 'Empty input' })
          controller.close()
          return
        }

        // ✅ 階段一：檢查緩存
        const cached = await getCachedExplanation(text)
        if (cached) {
          send('complete', cached)
          controller.close()
          return
        }

        send('status', { stage: 'analyzing', message: '正在分析題目...' })

        // ✅ 階段三：提前返回答案（快速生成）
        const quickAnswerPromise = generateQuickAnswer(text)
        
        // ✅ 階段三：並行生成完整詳解
        const fullExplanationPromise = universalExplainer(text).catch(() => null)

        // 等待快速答案（優先顯示）
        try {
          const quickAnswer = await quickAnswerPromise
          if (quickAnswer) {
            send('answer', quickAnswer) // ✅ 提前返回答案
          }
        } catch {
          // 忽略快速答案錯誤
        }

        send('status', { stage: 'generating', message: '正在生成詳解...' })

        // 等待完整詳解
        const fullResult = await fullExplanationPromise

        if (fullResult?.markdown) {
          // ✅ 流式發送 markdown（逐塊發送）
          const chunks = fullResult.markdown.split('\n\n')
          for (const chunk of chunks) {
            send('chunk', { content: chunk })
            await new Promise(resolve => setTimeout(resolve, 50)) // 50ms 延遲
          }

          const result = {
            markdown: fullResult.markdown,
            structured: fullResult.structured,
            questions: fullResult.questions,
            sharedPassage: fullResult.sharedPassage,
            status: fullResult.status,
            meta: fullResult.meta,
          }

          await setCachedExplanation(text, result)
          send('complete', result)
        } else {
          // Fallback 到 Basic
          const basic = await basicExtractor(text).catch(() => null)
          if (basic) {
            const markdown = `## 📝 題目\n\n${basic.question}\n\n## 🔡 選項\n\n${basic.options.map(opt => `(${opt.key}) ${opt.text}`).join('\n\n')}\n\n## ✅ 答案\n\n${basic.answer !== '-' ? `**${basic.answer}**` : '-'}\n\n## 🧠 詳解\n\n${basic.reason !== '-' ? basic.reason : '無法生成詳細解析'}`
            
            const chunks = markdown.split('\n\n')
            for (const chunk of chunks) {
              send('chunk', { content: chunk })
              await new Promise(resolve => setTimeout(resolve, 50))
            }

            const result = {
              markdown,
              status: basic.status,
              meta: basic.meta,
            }

            await setCachedExplanation(text, result)
            send('complete', result)
          } else {
            send('error', { message: 'Failed to generate explanation' })
          }
        }

        controller.close()
      } catch (error) {
        send('error', { 
          message: error instanceof Error ? error.message : 'Unknown error' 
        })
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
}

/**
 * GET: Health check
 */
export async function GET() {
  return new Response(JSON.stringify({
    ok: true,
    endpoint: '/api/explain-stream',
    timestamp: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
