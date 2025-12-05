import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GameTelemetryService } from '@/lib/services/game-telemetry-service'
import { applyGameProgression } from '@/lib/progression/game-progression'
import { z } from 'zod'

export const runtime = 'edge'

// ============================================
// Input Validation Schema
// ============================================

const submitSessionSchema = z.object({
    sessionId: z.string().uuid(),
    score: z.number().int().min(0),
    totalPossible: z.number().int().min(1),
    timeSpentSeconds: z.number().int().min(0),
    telemetry: z.object({
        blanks: z.record(z.string()),
        blankAttempts: z.record(
            z.object({
                blankId: z.string(),
                timeToFirstAction: z.number(),
                totalTime: z.number(),
                attempts: z.number(),
                changedAnswer: z.boolean(),
                wrongOptions: z.array(z.string()),
                chipSequence: z.array(
                    z.object({
                        chipId: z.string(),
                        action: z.enum(['dragged', 'swiped_away', 'replaced']),
                        timestamp: z.number(),
                    })
                ),
            })
        ),
    }),
})

// ============================================
// POST /api/play/editor/submit
// Submit Editor Mode session results
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
        const validation = submitSessionSchema.safeParse(body)

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

        const { sessionId, score, totalPossible, timeSpentSeconds, telemetry } = validation.data

        // Initialize service
        const telemetryService = new GameTelemetryService(supabase)

        // Validate session ownership
        const isOwner = await telemetryService.validateSessionOwnership(sessionId, user.id)
        if (!isOwner) {
            return NextResponse.json(
                { error: 'FORBIDDEN', message: '無權限操作此會話' },
                { status: 403 }
            )
        }

        // Complete session
        const session = await telemetryService.completeSession({
            sessionId,
            score,
            totalPossible,
            telemetry,
            timeSpentSeconds,
        })

        if (!session) {
            return NextResponse.json(
                { error: 'SESSION_UPDATE_FAILED', message: '無法更新遊戲會話' },
                { status: 500 }
            )
        }

        // Apply progression (XP, rewards, achievements)
        const progressionResult = await applyGameProgression(supabase, {
            userId: user.id,
            sessionId: session.id,
            gameType: 'editor_mode',
            score,
            totalPossible,
            timeSpentSeconds,
            telemetry,
        })

        if (!progressionResult) {
            console.error('[Editor Submit] Progression failed, but session saved')
            // Don't fail the request - session is saved, progression can be retried
        }

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                score: session.score,
                totalPossible: session.total_possible,
                accuracy: session.accuracy,
                timeSpent: session.time_spent_seconds,
            },
            progression: progressionResult || null,
            message: '遊戲完成！',
        })
    } catch (error) {
        console.error('[Editor Submit] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: '伺服器錯誤' },
            { status: 500 }
        )
    }
}
