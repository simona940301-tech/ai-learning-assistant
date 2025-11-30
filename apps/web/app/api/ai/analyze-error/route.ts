import { NextRequest, NextResponse } from 'next/server'
import { analyzeError } from '@/lib/ai/error-analysis'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { questionText, userAnswer, correctAnswer, tags } = body

        if (!questionText || !userAnswer || !correctAnswer) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const result = await analyzeError(questionText, userAnswer, correctAnswer, tags)

        return NextResponse.json({ success: true, result })
    } catch (error) {
        console.error('Error analysis API failed:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
