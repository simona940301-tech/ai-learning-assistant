import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatCompletionStream } from '@/lib/gemini'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

/**
 * POST /api/backpack/explain
 * Explain selected text with concept breakdown and follow-up questions
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { file_id, selection } = await req.json()

    if (!file_id || !selection || !selection.quote) {
      return NextResponse.json(
        { error: 'Missing required fields: file_id, selection.quote' },
        { status: 400 }
      )
    }

    // Get file context
    const { data: file } = await supabase
      .from('files')
      .select('id, user_id')
      .eq('id', file_id)
      .eq('user_id', user.id)
      .single()

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get page text for context
    const { data: pageData } = await supabase
      .from('file_pages')
      .select('text')
      .eq('file_id', file_id)
      .eq('page_no', selection.page_index + 1)
      .single()

    const contextText = pageData?.text || selection.quote

    // Build explain prompt
    const systemPrompt = `You are an English learning assistant. Explain the selected text in a simple, easy-to-understand way.`

    const userPrompt = `Selected text from page ${selection.page_index + 1}:
"""
${selection.quote}
"""

Context (surrounding text):
"""
${contextText.substring(Math.max(0, selection.start - 200), Math.min(contextText.length, selection.end + 200))}
"""

Please provide:
1. **概念速解** (Concept Explanation): Explain the selected text in simple, plain language (2-3 sentences)
2. **出處** (Source): Page ${selection.page_index + 1}
3. **延伸提問** (Follow-up Questions): Provide 3 short, open-ended questions that encourage deeper thinking about this concept

Format your response as JSON:
{
  "explanation": "簡短的白話文解釋",
  "source": {
    "page": ${selection.page_index + 1},
    "text": "選取的文字"
  },
  "questions": [
    "問題 1",
    "問題 2",
    "問題 3"
  ]
}`

    // Stream response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (type: string, data: any) => {
          const message = `data: ${JSON.stringify({ type, data })}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        try {
          let fullResponse = ''
          for await (const chunk of chatCompletionStream(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            { model: 'gpt-4o-mini', temperature: 0.3, maxOutputTokens: 1024 }
          )) {
            fullResponse += chunk
            send('token', { chunk })
          }

          // Try to parse JSON response
          try {
            const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0])
              send('result', parsed)
            }
          } catch (e) {
            // If JSON parsing fails, send raw response
            send('result', {
              explanation: fullResponse,
              source: { page: selection.page_index + 1, text: selection.quote },
              questions: [],
            })
          }

          send('done', {})
        } catch (error) {
          console.error('[backpack/explain] Error:', error)
          send('error', {
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[backpack/explain] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

