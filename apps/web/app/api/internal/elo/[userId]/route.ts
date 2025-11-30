import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProfileRepo } from '@/lib/dal/profile-repo'
import { ProfileService } from '@/lib/services/profile-service'

/**
 * GET /api/internal/elo/[userId]
 * 
 * Internal API to get user's Elo rank
 * Used by battle-ws service for matchmaking
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = params

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'USER_ID_REQUIRED' },
                { status: 400 }
            )
        }

        const db = createClient()
        const repo = new ProfileRepo(db)
        const service = new ProfileService(repo, db.storage)

        const elo = await service.getUserElo(userId)

        return NextResponse.json({
            success: true,
            data: { userId, elo },
        })
    } catch (error) {
        console.error('[GET /api/internal/elo] Error:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
