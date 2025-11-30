import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { Api } from '@/lib/api/response'
import { ApiErrorCode } from '@/lib/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/question-sets
 * Get user's downloaded question sets
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return Api.unauthorized()
        }

        const { searchParams } = new URL(req.url)
        const subject = searchParams.get('subject')

        // Build query
        let query = supabase
            .from('user_question_sets')
            .select(`
                id,
                downloaded_at,
                last_practiced_at,
                progress_data,
                practice_count,
                is_favorite,
                question_sets (
                    id,
                    title,
                    description,
                    subject,
                    difficulty_level,
                    rating,
                    downloads,
                    total_questions,
                    tags
                )
            `)
            .eq('user_id', user.id)
            .order('last_practiced_at', { ascending: false, nullsFirst: false })
            .order('downloaded_at', { ascending: false })

        const { data: userSets, error } = await query

        if (error) {
            console.error('[User Question Sets API] Error:', error)
            return Api.customError(ApiErrorCode.DATABASE_ERROR, error.message)
        }

        // Filter by subject if provided
        let filteredSets = userSets || []
        if (subject && subject !== 'all') {
            filteredSets = filteredSets.filter(
                (us: any) => us.question_sets?.subject === subject
            )
        }

        // Flatten the structure for easier consumption
        const sets = filteredSets.map((us: any) => ({
            ...us.question_sets,
            user_download_id: us.id,
            downloaded_at: us.downloaded_at,
            last_practiced_at: us.last_practiced_at,
            progress_data: us.progress_data,
            practice_count: us.practice_count,
            is_favorite: us.is_favorite,
            is_downloaded: true
        }))

        return Api.success({
            sets,
            total: sets.length
        })

    } catch (error) {
        console.error('[User Question Sets API] Unexpected error:', error)
        return Api.serverError(
            error instanceof Error ? error.message : undefined
        )
    }
}
