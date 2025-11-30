import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export async function GET() {
    try {
        const { supabase, user, errorType } = await getApiUser()

        if (!user) {
            return NextResponse.json({
                error: 'NO_USER',
                errorType,
                message: 'User not authenticated'
            }, { status: 401 })
        }

        return NextResponse.json({
            success: true,
            userId: user.id,
            email: user.email
        })
    } catch (err) {
        return NextResponse.json({
            error: 'EXCEPTION',
            message: err instanceof Error ? err.message : String(err)
        }, { status: 500 })
    }
}
