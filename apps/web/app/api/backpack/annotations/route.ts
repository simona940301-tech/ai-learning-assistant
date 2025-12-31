import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/backpack/annotations
 * Get annotations for a file
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user, errorType } = await getApiUser(req)

        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', errorType },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(req.url)
        const fileId = searchParams.get('file_id')

        if (!fileId) {
            return NextResponse.json(
                { error: 'MISSING_FILE_ID' },
                { status: 400 }
            )
        }

        const { data: annotations, error } = await supabase
            .from('annotations')
            .select('*')
            .eq('file_id', fileId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('[Annotations API] Error fetching annotations:', error)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ annotations })
    } catch (error) {
        console.error('[Annotations API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/backpack/annotations
 * Create a new annotation
 */
export async function POST(req: NextRequest) {
    try {
        const { supabase, user, errorType } = await getApiUser(req)

        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', errorType },
                { status: 401 }
            )
        }

        const body = await req.json()
        const { file_id, page_number, annotation_type, data } = body

        if (!file_id || page_number === undefined || !annotation_type || !data) {
            return NextResponse.json(
                { error: 'INVALID_INPUT' },
                { status: 400 }
            )
        }

        const { data: annotation, error } = await supabase
            .from('annotations')
            .insert({
                user_id: user.id,
                file_id,
                page_number,
                annotation_type,
                data, // JSONB field, supports arbitrary data including block_id
            })
            .select()
            .single()

        if (error) {
            console.error('[Annotations API] Error creating annotation:', error)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ annotation })
    } catch (error) {
        console.error('[Annotations API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/backpack/annotations
 * Delete an annotation
 */
export async function DELETE(req: NextRequest) {
    try {
        const { supabase, user, errorType } = await getApiUser(req)

        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', errorType },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'MISSING_ID' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('annotations')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) {
            console.error('[Annotations API] Error deleting annotation:', error)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Annotations API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
