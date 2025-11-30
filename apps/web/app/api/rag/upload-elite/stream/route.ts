// SSE endpoint for real-time RAG analysis updates
// Path: /apps/web/app/api/rag/upload-elite/stream/route.ts

import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/rag/upload-elite/stream?analysisId=xxx
 * Returns Server-Sent Events that push analysis updates as they happen.
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)
        if (!user) {
            return new Response('Unauthorized', { status: 401 })
        }
        const { searchParams } = new URL(req.url)
        const analysisId = searchParams.get('analysisId')
        if (!analysisId) {
            return new Response('Missing analysisId', { status: 400 })
        }
        // Verify that the analysis belongs to the user
        const { data: analysis } = await supabase
            .from('file_analysis')
            .select('id')
            .eq('id', analysisId)
            .eq('user_id', user.id)
            .single()
        if (!analysis) {
            return new Response('Not found', { status: 404 })
        }

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
            async start(controller) {
                // Send initial state
                const { data: initial } = await supabase
                    .from('file_analysis')
                    .select('*')
                    .eq('id', analysisId)
                    .single()
                if (initial) {
                    const initData = `data: ${JSON.stringify(initial)}\n\n`
                    controller.enqueue(encoder.encode(initData))
                }
                // Subscribe to realtime updates for this analysis row
                const channel = supabase
                    .channel(`analysis:${analysisId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'file_analysis',
                            filter: `id=eq.${analysisId}`
                        },
                        (payload) => {
                            const data = `data: ${JSON.stringify(payload.new)}\n\n`
                            controller.enqueue(encoder.encode(data))
                            if (
                                payload.new.status === 'prediction_ready' ||
                                payload.new.status === 'failed'
                            ) {
                                controller.close()
                            }
                        }
                    )
                    .subscribe()
                // Cleanup when client disconnects
                req.signal.addEventListener('abort', () => {
                    channel.unsubscribe()
                    controller.close()
                })
            }
        })
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            }
        })
    } catch (error) {
        console.error('[SSE] Error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
