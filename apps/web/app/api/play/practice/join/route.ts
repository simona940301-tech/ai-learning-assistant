import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/play/practice/join
 * Join an existing practice room
 */
export async function POST(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        }

        const { roomCode } = await req.json()

        if (!roomCode) {
            return NextResponse.json({ error: 'MISSING_CODE' }, { status: 400 })
        }

        // Find room
        const { data: room, error: findError } = await supabase
            .from('practice_rooms')
            .select('*')
            .eq('room_code', roomCode.toUpperCase())
            .eq('status', 'ACTIVE')
            .single()

        if (findError || !room) {
            return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
        }

        // Check if already joined
        const { data: existingParticipant } = await supabase
            .from('practice_participants')
            .select('*')
            .eq('room_id', room.id)
            .eq('user_id', user.id)
            .single()

        if (!existingParticipant) {
            // Join room
            const { error: joinError } = await supabase
                .from('practice_participants')
                .insert({
                    room_id: room.id,
                    user_id: user.id,
                    current_question_index: 0
                })

            if (joinError) {
                return NextResponse.json({ error: 'JOIN_FAILED' }, { status: 500 })
            }
        }

        return NextResponse.json({ success: true, room })
    } catch (error) {
        console.error('Join practice room error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
