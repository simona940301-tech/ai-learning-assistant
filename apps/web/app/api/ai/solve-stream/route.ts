import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ⚡ Edge Runtime for 50-80% faster cold starts
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

interface SolveRequestBody {
    question: string
    judge: {
        canonical_skill: string
        answer: string
        steps: string[]
        mistakes: string[]
    }
}

/**
 * POST /api/ai/solve-stream
 * 
 * ⚡ SSE Streaming Version of Solve API
 * 
 * Streams the solution note generation in real-time for instant feedback.
 * 
 * SSE Event Types:
 * - 'token': Streaming content chunk
 * - 'complete': Generation complete with full result
 * - 'error': Error occurred
 */
export async function POST(request: NextRequest) {
    try {
        // ⚡ Edge-compatible authentication
        const authHeader = request.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(
                JSON.stringify({ error: 'UNAUTHORIZED', message: 'Authentication required' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const token = authHeader.substring(7)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'UNAUTHORIZED', message: 'Authentication failed' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const { question, judge }: SolveRequestBody = await request.json()
        if (!question?.trim()) {
            return new Response(
                JSON.stringify({ error: 'VALIDATION_ERROR', message: 'question is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }
        if (!judge) {
            return new Response(
                JSON.stringify({ error: 'VALIDATION_ERROR', message: 'judge result is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // ⚡ Create SSE stream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()

                // Helper to send SSE events
                const send = (type: string, data: any) => {
                    const message = `data: ${JSON.stringify({ type, ...data })}\n\n`
                    controller.enqueue(encoder.encode(message))
                }

                try {
                    const prompt = [
                        `Question:\n${question.trim()}`,
                        `Canonical Skill: ${judge.canonical_skill}`,
                        `Answer: ${judge.answer}`,
                        `Solution Steps: ${judge.steps.join(' / ')}`,
                        `Common Mistakes: ${judge.mistakes.join(' / ')}`,
                        'Create a concise Markdown table summarizing the concept, evidence, common traps, and practice advice. Provide 2-4 summary bullets highlighting takeaways.',
                        'Format: Start with ## 解題筆記, then a table, then ### 重點提示 with bullets.',
                    ].join('\n\n')

                    let fullContent = ''
                    const startTime = Date.now()

                    // ⚡ Use fetch-based Gemini API for Edge compatibility
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{
                                        text: `You are a GSAT English tutor generating structured study notes. Keep a calm professional tone.\n\n${prompt}`
                                    }]
                                }],
                                generationConfig: {
                                    temperature: 0.25,
                                    maxOutputTokens: 2048,
                                }
                            }),
                        }
                    )

                    if (!response.ok) {
                        throw new Error(`Gemini API error: ${response.status}`)
                    }

                    if (!response.body) {
                        throw new Error('No response body')
                    }

                    const reader = response.body.getReader()
                    const decoder = new TextDecoder()

                    // ⚡ Parse SSE stream from Gemini
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        const chunk = decoder.decode(value)
                        const lines = chunk.split('\n')

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.substring(6))
                                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

                                    if (text) {
                                        fullContent += text
                                        send('token', { content: text })
                                    }
                                } catch (parseError) {
                                    // Skip invalid JSON lines
                                }
                            }
                        }
                    }

                    // Parse summary bullets from the generated content
                    const summaryBullets: string[] = []
                    const bulletMatches = fullContent.match(/^[•\-*]\s+(.+)$/gm)
                    if (bulletMatches) {
                        summaryBullets.push(...bulletMatches.slice(0, 4).map(b => b.replace(/^[•\-*]\s+/, '')))
                    }

                    // Send completion event
                    send('complete', {
                        kind: 'SolveNoteLite',
                        md: fullContent,
                        summary_bullets: summaryBullets,
                        elapsed: Date.now() - startTime,
                    })

                    console.log(`[Solve Stream] ✅ Complete in ${Date.now() - startTime}ms`)

                } catch (error) {
                    console.error('[Solve Stream] Error:', error)
                    send('error', {
                        error: 'GENERATION_ERROR',
                        message: error instanceof Error ? error.message : '生成失敗',
                    })
                } finally {
                    controller.close()
                }
            },
        })

        // Return SSE stream
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })

    } catch (error) {
        console.error('[Solve Stream] Unexpected error:', error)
        return new Response(
            JSON.stringify({
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : '未知錯誤',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
