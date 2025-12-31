import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/backpack/question-sets
 * 獲取用戶已下載的題本
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user, errorType } = await getApiUser(req)

        if (!user) {
            const message =
                errorType === 'invalid-jwt'
                    ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
                    : '請先登入以查看已下載的題本'

            return NextResponse.json(
                { error: 'UNAUTHORIZED', message, errorType },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(req.url)
        const subject = searchParams.get('subject')
        const isFavorite = searchParams.get('favorite') === 'true'

        // 查詢用戶下載的題本
        let query = supabase
            .from('user_question_sets')
            .select(`
                id,
                downloaded_at,
                last_practiced_at,
                progress_data,
                practice_count,
                is_favorite,
                custom_tags,
                notes,
                question_sets (
                    id,
                    title,
                    description,
                    cover_image_url,
                    subject,
                    difficulty_level,
                    total_questions,
                    tags,
                    rating
                )
            `)
            .eq('user_id', user.id)

        // 過濾收藏
        if (isFavorite) {
            query = query.eq('is_favorite', true)
        }

        // 排序：最近練習的在前
        query = query.order('last_practiced_at', { ascending: false, nullsFirst: false })

        const { data: userSets, error } = await query

        if (error) {
            console.error('[Backpack API] Error fetching user question sets:', error)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: error.message },
                { status: 500 }
            )
        }

        // 格式化返回數據
        const formattedSets = userSets?.map(userSet => {
            const qSet = Array.isArray(userSet.question_sets) ? userSet.question_sets[0] : userSet.question_sets
            return {
            id: userSet.id,
            set_id: qSet?.id,
            title: qSet?.title,
            description: qSet?.description,
            cover_image_url: qSet?.cover_image_url,
            subject: qSet?.subject,
            difficulty_level: qSet?.difficulty_level,
            total_questions: qSet?.total_questions,
            tags: qSet?.tags,
            rating: qSet?.rating,
            downloaded_at: userSet.downloaded_at,
            last_practiced_at: userSet.last_practiced_at,
            progress_data: userSet.progress_data,
            practice_count: userSet.practice_count,
            is_favorite: userSet.is_favorite,
            custom_tags: userSet.custom_tags,
            notes: userSet.notes
        }})

        // 科目過濾（前端過濾，避免複雜 JOIN）
        let filteredSets = formattedSets || []
        if (subject && subject !== 'all') {
            filteredSets = filteredSets.filter(set => set.subject === subject)
        }

        return NextResponse.json({
            success: true,
            sets: filteredSets,
            count: filteredSets.length
        })

    } catch (error) {
        console.error('[Backpack API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/backpack/question-sets?setId=xxx
 * 刪除已下載的題本
 */
export async function DELETE(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const setId = searchParams.get('setId')

        if (!setId) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: 'setId is required' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('user_question_sets')
            .delete()
            .eq('user_id', user.id)
            .eq('set_id', setId)

        if (error) {
            console.error('[Backpack API] Error deleting user question set:', error)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: '已成功刪除題本'
        })

    } catch (error) {
        console.error('[Backpack API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

/**
 * PATCH /api/backpack/question-sets
 * 更新題本設定（收藏、筆記等）
 */
export async function PATCH(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        }

        const body = await req.json()
        const { setId, isFavorite, customTags, notes } = body

        if (!setId) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: 'setId is required' },
                { status: 400 }
            )
        }

        const updates: any = {}
        if (typeof isFavorite === 'boolean') updates.is_favorite = isFavorite
        if (customTags !== undefined) updates.custom_tags = customTags
        if (notes !== undefined) updates.notes = notes

        const { data, error } = await supabase
            .from('user_question_sets')
            .update(updates)
            .eq('user_id', user.id)
            .eq('set_id', setId)
            .select()
            .single()

        if (error) {
            console.error('[Backpack API] Error updating user question set:', error)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            set: data
        })

    } catch (error) {
        console.error('[Backpack API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
