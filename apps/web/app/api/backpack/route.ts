import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, isMockModeEnabled, getApiUser } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/backpack
 *
 * Get user's backpack items
 * Requires authentication
 */
export async function GET(req: NextRequest) {
  try {
    const mockMode = isMockModeEnabled()
    // 🎯 修復：使用 getApiUser 替代 getCurrentUser，確保認證檢查一致
    const { supabase, user, errorType } = await getApiUser(req)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : 'Authentication required'
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message,
          errorType,
        },
        { status: 401 }
      )
    }

    // supabase 已經從 getApiUser 獲取

    const { searchParams } = new URL(req.url)
    const subject = searchParams.get('subject')
    const type = searchParams.get('type')

    // Fetch backpack_items
    let backpackQuery = supabase
      .from('backpack_items')
      .select('*')
      .eq('user_id', user.id)

    if (subject) {
      backpackQuery = backpackQuery.eq('subject', subject)
    }
    if (type) {
      backpackQuery = backpackQuery.eq('type', type)
    }

    // Fetch notebook_entries
    let notebookQuery = supabase
      .from('notebook_entries')
      .select('*')
      .eq('user_id', user.id)

    let backpackData = []
    let notebookData = []
    let backpackError = null
    let notebookError = null

    // Always try to fetch from DB, even in mock mode (since we seed the mock user)
    const backpackResult = await backpackQuery
    backpackData = backpackResult.data || []
    backpackError = backpackResult.error

    const notebookResult = await notebookQuery
    notebookData = notebookResult.data || []
    notebookError = notebookResult.error

    if (backpackError) {
      console.error('[Backpack API] Error fetching backpack items:', backpackError)
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: backpackError.message,
        },
        { status: 500 }
      )
    }

    if (notebookError) {
      console.warn('[Backpack API] Error fetching notebook entries:', notebookError)
      // Don't fail the entire request if notebook fetch fails
    }

    // Transform notebook entries to BackpackFile format
    const transformedNotebookEntries = notebookData.map((entry: any) => {
      // Extract subject from tags (first tag that matches a subject)
      const subjectMap: Record<string, string> = {
        '英文': 'english',
        '數學': 'math',
        '國文': 'chinese',
        '社會': 'social',
        '自然': 'science',
      }

      let entrySubject = 'math' // default
      if (Array.isArray(entry.tags)) {
        for (const tag of entry.tags) {
          if (subjectMap[tag]) {
            entrySubject = subjectMap[tag]
            break
          }
        }
      }

      // Filter by subject if specified
      if (subject && entrySubject !== subject) {
        return null
      }

      return {
        id: entry.id,
        user_id: entry.user_id,
        subject: entrySubject,
        type: 'text' as const,
        title: entry.title,
        content: entry.content_md,
        file_url: null,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        // Additional fields to identify notebook entries
        source_type: entry.source_type,
        tags: entry.tags,
        is_notebook_entry: true,
      }
    }).filter(Boolean) // Remove null entries (filtered by subject)

    // Merge and sort by updated_at
    const allItems = [...backpackData, ...transformedNotebookEntries].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )

    const mockModeHint =
      mockMode && allItems.length === 0
        ? 'Mock user has no backpack data yet. Run "pnpm --filter web seed:mock-user" to seed fixtures.'
        : undefined

    return NextResponse.json({
      success: true,
      items: allItems,
      count: allItems.length,
      mockHint: mockModeHint,
    })
  } catch (error) {
    console.error('[Backpack API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/backpack
 *
 * Delete backpack items (notes or files)
 * Requires authentication
 */
export async function DELETE(req: NextRequest) {
  try {
    // 🎯 修復：使用 getApiUser 替代 getCurrentUser
    const { supabase, user, errorType } = await getApiUser(req)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : 'Authentication required'
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message,
          errorType,
        },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          error: 'INVALID_INPUT',
          message: '請提供要刪除的項目 ID 列表',
        },
        { status: 400 }
      )
    }

    // supabase 已經從 getApiUser 獲取

    // 刪除 backpack_items
    const { error: backpackError } = await supabase
      .from('backpack_items')
      .delete()
      .eq('user_id', user.id)
      .in('id', ids)

    // 刪除 notebook_entries
    const { error: notebookError } = await supabase
      .from('notebook_entries')
      .delete()
      .eq('user_id', user.id)
      .in('id', ids)

    if (backpackError && notebookError) {
      console.error('[Backpack Delete] Errors:', { backpackError, notebookError })
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: '刪除失敗',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `已刪除 ${ids.length} 項`,
      deletedCount: ids.length,
    })
  } catch (error) {
    console.error('[Backpack Delete] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

