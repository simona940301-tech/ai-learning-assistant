// SSE endpoint for real-time RAG analysis updates
// Path: /apps/web/app/api/rag/upload-elite/stream/route.ts

import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { createClient } from '@supabase/supabase-js'
import { createOptionsHandler } from '@/lib/api/cors'

export const OPTIONS = createOptionsHandler()

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/rag/upload-elite/stream?analysisId=xxx
 * Returns Server-Sent Events that push analysis updates as they happen.
 */
export async function GET(req: NextRequest) {
    try {
        // ⭐ Use getApiUser for consistent authentication (handles cookies automatically)
        const { supabase, user, errorType } = await getApiUser(req)

        if (!user) {
            const message = errorType === 'invalid-jwt'
                ? '登入狀態失效，請重新登入'
                : errorType === 'unauthenticated'
                    ? '需要登入'
                    : '認證失敗'

            return new Response(
                JSON.stringify({ error: 'UNAUTHORIZED', message }),
                {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        const { searchParams } = new URL(req.url)
        const analysisId = searchParams.get('analysisId')

        if (!analysisId) {
            return new Response(
                JSON.stringify({ error: 'VALIDATION_ERROR', message: '缺少 analysisId 參數' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        // Verify that the analysis belongs to the user
        const { data: analysis, error: analysisError } = await supabase
            .from('file_analysis')
            .select('id')
            .eq('id', analysisId)
            .eq('user_id', user.id)
            .single()

        if (analysisError || !analysis) {
            console.error('[SSE] Analysis not found or access denied:', analysisError)
            return new Response(
                JSON.stringify({ error: 'NOT_FOUND', message: '找不到分析記錄或無權限訪問' }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
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
                    console.log('[SSE] Client disconnected, cleaning up')
                    channel.unsubscribe()
                    controller.close()
                })
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // Disable nginx buffering
            }
        })
    } catch (error) {
        console.error('[SSE] Unexpected error:', error)
        return new Response(
            JSON.stringify({
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : '伺服器錯誤'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
}
