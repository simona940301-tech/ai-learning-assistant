import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateLearningDNA } from '@/lib/personalization/dna'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient()

        // Check auth
        const { data: { user } } = await supabase.auth.getUser()

        // Allow internal API key for cron jobs
        const authHeader = req.headers.get('authorization')
        const isInternal = authHeader === `Bearer ${process.env.INTERNAL_API_KEY}`

        let targetUserId = user?.id

        if (isInternal) {
            const body = await req.json()
            targetUserId = body.userId
        }

        if (!targetUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Calculate DNA
        const dna = await calculateLearningDNA(supabase, targetUserId)

        // Update Profile
        const { error } = await supabase.rpc('update_learning_dna', {
            p_user_id: targetUserId,
            p_dna: dna
        })

        if (error) {
            console.error('Failed to update DNA:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, dna })
    } catch (error) {
        console.error('Internal error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
