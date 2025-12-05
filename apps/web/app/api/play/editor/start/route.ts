import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GameTelemetryService } from '@/lib/services/game-telemetry-service'
import { z } from 'zod'

export const runtime = 'edge'

// ============================================
// Input Validation Schema
// ============================================

const startSessionSchema = z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    metadata: z.record(z.any()).optional(),
})

// ============================================
// POST /api/play/editor/start
// Start a new Editor Mode session
// ============================================

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Authenticate user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: '請先登入' },
                { status: 401 }
            )
        }

        // Parse and validate request body
        const body = await request.json()
        const validation = startSessionSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'INVALID_INPUT',
                    message: '輸入格式錯誤',
                    details: validation.error.errors,
                },
                { status: 400 }
            )
        }

        const { difficulty, metadata } = validation.data

        // Initialize service
        const telemetryService = new GameTelemetryService(supabase)

        // Start session
        const sessionId = await telemetryService.startSession({
            userId: user.id,
            gameType: 'editor_mode',
            difficulty,
            metadata,
        })

        if (!sessionId) {
            return NextResponse.json(
                { error: 'SESSION_CREATE_FAILED', message: '無法創建遊戲會話' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            sessionId,
            message: 'Editor Mode session started',
        })
    } catch (error) {
        console.error('[Editor Start] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
            { status: 500 }
        )
    }
}
