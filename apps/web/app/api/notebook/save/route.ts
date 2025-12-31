import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notebook/save
 * 
 * 儲存內容到筆記本
 * 
 * Request Body:
 * {
 *   title: string,
 *   content_md: string,
 *   source_type: 'summary' | 'qa' | 'manual',
 *   document_id?: string,
 *   tags?: string[]
 * }
 */
export async function POST(req: NextRequest) {
    try {
        // 1. 驗證用戶身份
        const { supabase, user, errorType } = await getApiUser(req)

        if (!user) {
            return NextResponse.json(
                {
                    error: 'UNAUTHORIZED',
                    message: errorType === 'invalid-jwt'
                        ? '登入狀態失效，請重新登入'
                        : '需要登入',
                },
                { status: 401 }
            )
        }

        // 2. 解析請求
        const body = await req.json()
        const { title, content_md, source_type = 'manual', document_id, tags = [] } = body

        // 3. 驗證必填欄位
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: '標題為必填且不能為空' },
                { status: 400 }
            )
        }

        if (!content_md || typeof content_md !== 'string' || content_md.trim().length === 0) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: '內容為必填且不能為空' },
                { status: 400 }
            )
        }

        // 3.1 驗證長度限制
        const trimmedTitle = title.trim()
        if (trimmedTitle.length > 200) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: '標題長度不能超過 200 字元' },
                { status: 400 }
            )
        }

        if (content_md.length > 100000) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: '內容長度不能超過 100,000 字元' },
                { status: 400 }
            )
        }

        // 3.2 驗證標籤
        if (!Array.isArray(tags)) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: '標籤必須是陣列' },
                { status: 400 }
            )
        }

        if (tags.length > 20) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: '標籤數量不能超過 20 個' },
                { status: 400 }
            )
        }

        // 清理和驗證標籤
        const cleanedTags = tags
            .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
            .map((tag: string) => tag.trim().substring(0, 50)) // 每個標籤最多 50 字元
            .filter((tag: string, index: number, self: string[]) => self.indexOf(tag) === index) // 去重

        // 4. 驗證 source_type（支持 qa, summary, manual）
        const validSourceTypes = ['summary', 'qa', 'manual']
        if (!validSourceTypes.includes(source_type)) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: `無效的來源類型，必須是 ${validSourceTypes.join(', ')} 之一` },
                { status: 400 }
            )
        }

        // 5. 儲存到資料庫
        const { data, error } = await supabase
            .from('notebook_entries')
            .insert({
                user_id: user.id,
                title: trimmedTitle,
                content_md: content_md.trim(),
                source_type,
                document_id: document_id || null,
                tags: cleanedTags,
            })
            .select()
            .single()

        if (error) {
            console.error('[Notebook Save] Database error:', error)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: '儲存失敗' },
                { status: 500 }
            )
        }

        // 6. 返回成功結果
        return NextResponse.json({
            success: true,
            entry: data,
            message: '已存到筆記本',
        })
    } catch (error) {
        console.error('[Notebook Save] Unexpected error:', error)
        return NextResponse.json(
            {
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : '未知錯誤',
            },
            { status: 500 }
        )
    }
}

/**
 * GET /api/notebook/save
 * 
 * 獲取用戶的所有筆記本條目
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: '需要登入' },
                { status: 401 }
            )
        }

        // 解析查詢參數
        const { searchParams } = new URL(req.url)
        const sourceType = searchParams.get('source_type')
        const tag = searchParams.get('tag')

        // 構建查詢
        let query = supabase
            .from('notebook_entries')
            .select('*')
            .eq('user_id', user.id)

        if (sourceType) {
            query = query.eq('source_type', sourceType)
        }

        if (tag) {
            query = query.contains('tags', [tag])
        }

        query = query.order('created_at', { ascending: false })

        const { data, error } = await query

        if (error) {
            console.error('[Notebook Get] Database error:', error)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: '查詢失敗' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            entries: data,
        })
    } catch (error) {
        console.error('[Notebook Get] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: '未知錯誤' },
            { status: 500 }
        )
    }
}
