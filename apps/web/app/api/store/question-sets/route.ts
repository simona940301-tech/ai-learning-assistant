import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import type { StoreQuestionSetsResponse } from '@/lib/types/question-sets'

export const dynamic = 'force-dynamic'

/**
 * GET /api/store/question-sets
 * 瀏覽題本商店
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        // 題本商店公開訪問，不需要登入
        // 但如果已登入，可以標記已下載的題本

        const { searchParams } = new URL(req.url)

        // 查詢參數
        const subject = searchParams.get('subject')
        const difficulty = searchParams.get('difficulty')
        const sort = searchParams.get('sort') || 'popular'
        const search = searchParams.get('search')
        const tags = searchParams.get('tags')?.split(',').filter(Boolean)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = (page - 1) * limit

        // 構建查詢
        let query = supabase
            .from('question_sets')
            .select('*', { count: 'exact' })
            .eq('is_public', true)
            .eq('status', 'PUBLISHED')

        // 科目過濾
        if (subject && subject !== 'all') {
            query = query.eq('subject', subject)
        }

        // 難度過濾
        if (difficulty) {
            query = query.eq('difficulty_level', parseInt(difficulty))
        }

        // 標籤過濾
        if (tags && tags.length > 0) {
            query = query.contains('tags', tags)
        }

        // 搜尋
        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
        }

        // 排序
        switch (sort) {
            case 'newest':
                query = query.order('published_at', { ascending: false })
                break
            case 'rating':
                query = query.order('rating', { ascending: false })
                break
            case 'popular':
            case 'downloads':
            default:
                query = query.order('downloads', { ascending: false })
                break
        }

        // 分頁
        query = query.range(offset, offset + limit - 1)

        const { data: sets, error, count } = await query

        if (error) {
            console.error('[Store API] Error fetching question sets:', error)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: error.message },
                { status: 500 }
            )
        }

        // 如果用戶已登入，標記已下載的題本
        let downloadedSetIds: string[] = []
        if (user) {
            const { data: downloads } = await supabase
                .from('user_question_sets')
                .select('set_id')
                .eq('user_id', user.id)

            downloadedSetIds = downloads?.map(d => d.set_id) || []
        }

        // 添加 is_downloaded 標記
        const setsWithDownloadStatus = sets?.map(set => ({
            ...set,
            is_downloaded: downloadedSetIds.includes(set.id)
        }))

        return NextResponse.json({
            sets: setsWithDownloadStatus || [],
            total: count || 0,
            page,
            pages: Math.ceil((count || 0) / limit),
            limit
        })

    } catch (error) {
        console.error('[Store API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
