import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { tagQuestion } from '@/lib/concept-tagger'

export const dynamic = 'force-dynamic'

async function resolvePackQuestionId(supabase: any, questionId: string) {
  // 直接匹配 pack_questions.id
  const direct = await supabase
    .from('pack_questions')
    .select('id')
    .eq('id', questionId)
    .maybeSingle()

  if (direct.data?.id) {
    return direct.data.id
  }

  // 嘗試透過原始 seed_question_id 映射
  const bySeed = await supabase
    .from('pack_questions')
    .select('id')
    .eq('question_id', questionId)
    .maybeSingle()

  if (bySeed.data?.id) {
    return bySeed.data.id
  }

  // 🎯 新增：檢查是否為 seed_questions (PVE 戰鬥使用的題目)
  // PVE battles use seed_questions, we need to sync them to pack_questions for error_book
  const seedQuestion = await supabase
    .from('seed_questions')
    .select('id, stem, choices, answer, explanation, difficulty, subject, department_id')
    .eq('id', questionId)
    .maybeSingle()

  if (seedQuestion.data) {
    // 檢查是否已經有對應的 pack_question
    const existing = await supabase
      .from('pack_questions')
      .select('id')
      .eq('question_id', seedQuestion.data.id)
      .maybeSingle()

    if (existing.data) {
      return existing.data.id
    }

    // 如果沒有，需要創建一個 pack_question (使用系統 PVE pack)
    // 首先查找或創建 PVE 系統 pack
    const pvePackName = 'PVE Training Pack'
    let pvePack = await supabase
      .from('packs')
      .select('id')
      .eq('name', pvePackName)
      .maybeSingle()

    if (!pvePack.data) {
      // 創建 PVE pack
      const { data: newPack } = await supabase
        .from('packs')
        .insert({
          name: pvePackName,
          subject: seedQuestion.data.subject || 'general',
          skill: 'mixed',
          difficulty: 3,
          description: 'Auto-generated pack for PVE training questions',
          is_public: false,
        })
        .select('id')
        .single()

      pvePack = newPack
    }

    if (!pvePack?.data) {
      console.error('[Error Book] Failed to create/find PVE pack')
      return null
    }

    // 創建 pack_question
    const { data: newPackQuestion, error: insertError } = await supabase
      .from('pack_questions')
      .insert({
        pack_id: pvePack.data.id,
        question_id: seedQuestion.data.id,
        stem: seedQuestion.data.stem,
        choices: seedQuestion.data.choices,
        answer: seedQuestion.data.answer,
        explanation: seedQuestion.data.explanation,
        difficulty: seedQuestion.data.difficulty || 3,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[Error Book] Failed to create pack_question:', insertError)
      return null
    }

    return newPackQuestion.id
  }

  return null
}

/**
 * GET /api/error-book
 *
 * Get user's error book items
 * Requires authentication
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication with proper JWT error handling
    const { supabase, user, errorType } = await getApiUser(req)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
            ? 'Authentication required'
            : 'Authentication error occurred'

      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message,
          errorType,
        },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const subject = searchParams.get('subject')
    const status = searchParams.get('status') || 'active' // active, mastered, all

    // Build query
    let query = supabase
      .from('error_book')
      .select(`
        id,
        question_id,
        user_id,
        status,
        last_attempted_at,
        created_at,
        knowledge_tags,
        pack_questions (
          id,
          stem,
          choices,
          answer,
          explanation,
          difficulty,
          packs (
            id,
            subject,
            skill
          )
        )
      `)
      .eq('user_id', user.id)

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Order by last attempted (oldest first for spaced repetition)
    query = query.order('last_attempted_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('[Error Book API] Error fetching items:', error)
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Filter by subject if provided
    let filteredData = data || []
    if (subject && data) {
      filteredData = data.filter((item: any) => item.packs?.subject === subject)
    }

    return NextResponse.json({
      success: true,
      items: filteredData,
      count: filteredData.length,
    })
  } catch (error) {
    console.error('[Error Book API] Unexpected error:', error)
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
 * POST /api/error-book
 *
 * Add error to error book (battle / practice only)
 * Requires authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication with proper JWT error handling
    const { supabase, user, errorType } = await getApiUser(req)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
            ? 'Authentication required'
            : 'Authentication error occurred'

      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message,
          errorType,
        },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { questionId, source } = body

    const allowedSources = ['battle', 'practice']
    if (!allowedSources.includes(source)) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: '錯題本僅接受對戰與練習流程寫入',
        },
        { status: 403 }
      )
    }

    if (!questionId) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'questionId is required',
        },
        { status: 400 }
      )
    }

    // Check if error already exists
    const resolvedQuestionId = await resolvePackQuestionId(supabase, questionId)
    if (!resolvedQuestionId) {
      return NextResponse.json(
        {
          error: 'QUESTION_NOT_FOUND',
          message: '題目暫時無法同步到錯題本，請稍後再試',
        },
        { status: 404 }
      )
    }

    const { data: existing } = await supabase
      .from('error_book')
      .select('id')
      .eq('user_id', user.id)
      .eq('question_id', resolvedQuestionId)
      .eq('status', 'active')
      .single()

    if (existing) {
      // Update last_attempted_at
      const { error: updateError } = await supabase
        .from('error_book')
        .update({ last_attempted_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        item: { id: existing.id, questionId },
        message: 'Error book entry updated',
      })
    }

    // Get question details for concept tagging
    const { data: questionData } = await supabase
      .from('pack_questions')
      .select('stem, packs(subject)')
      .eq('id', resolvedQuestionId)
      .single()

    // Auto-tag concepts using AI
    let knowledgeTags: string[] = []
    if (questionData?.stem) {
      try {
        // packs is an array from the join, get the first element
        const packsArray = questionData.packs as any
        const subject = Array.isArray(packsArray) && packsArray[0]?.subject === 'math' ? 'math' : 'english'
        knowledgeTags = await tagQuestion(questionData.stem, subject)
        console.log(`[Error Book] Tagged question with concepts:`, knowledgeTags)
      } catch (error) {
        console.error('[Error Book] Failed to tag concepts:', error)
        // Continue without tags if tagging fails
      }
    }

    // Create new error book entry with tags
    const { data, error } = await supabase
      .from('error_book')
      .insert({
        user_id: user.id,
        question_id: resolvedQuestionId,
        status: 'active',
        last_attempted_at: new Date().toISOString(),
        knowledge_tags: knowledgeTags,
      })
      .select()
      .single()

    if (error) {
      console.error('[Error Book API] Error creating entry:', error)
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: data,
      message: 'Error added to error book',
    })
  } catch (error) {
    console.error('[Error Book API] Unexpected error:', error)
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
 * DELETE /api/error-book
 *
 * Delete error book items
 * Requires authentication
 */
export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user, errorType } = await getApiUser(req)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
            ? 'Authentication required'
            : 'Authentication error occurred'

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

    // 刪除 error_book 項目
    const { error: deleteError } = await supabase
      .from('error_book')
      .delete()
      .eq('user_id', user.id)
      .in('id', ids)

    if (deleteError) {
      console.error('[Error Book Delete] Error:', deleteError)
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
    console.error('[Error Book Delete] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
