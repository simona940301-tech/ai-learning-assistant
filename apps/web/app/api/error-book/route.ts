import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { tagQuestion } from '@/lib/concept-tagger'

export const dynamic = 'force-dynamic'

// 創建一個 admin client 用於處理 RLS 限制的表格 (packs, pack_questions)
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Error Book] Missing Supabase URL or Service Role Key')
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}


async function resolvePackQuestionId(supabase: any, questionId: string) {
  // 對於讀取操作，我們可以嘗試使用傳入的 client (user context)
  // 但對於寫入 (創建 pack/question)，必須使用 admin client
  const adminClient = getAdminClient() || supabase

  // PVE battles use seed_questions, we need to sync them to pack_questions for error_book
  // We use adminClient for seed_questions query just in case, but usually public read is simple
  const seedQuestion = await adminClient
    .from('seed_questions')
    .select('id, stem, choices, answer, explanation, difficulty, subject, department_id')
    .eq('id', questionId)
    .maybeSingle()

  if (seedQuestion.data) {
    // 🎯 Use adminClient because pack_questions might have restrictive RLS
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[Error Book] No Service Role Key available, pack creation might fail due to RLS')
    }

    // 🎯 SOTA FIX: Create separate PVE packs for each subject
    // This ensures questions appear in the correct folder in Backpack > Error Book
    const subjectRaw = seedQuestion.data.subject || 'general'
    // Normalize subject if needed (e.g. ensure it matches 'chinese', 'english', etc.)
    const subject = subjectRaw.toLowerCase()

    const pvePackName = `PVE Training Pack - ${subject}` // e.g. "PVE Training Pack - english"

    let pvePack = await adminClient
      .from('packs')
      .select('id')
      .eq('name', pvePackName)
      .maybeSingle()

    if (!pvePack.data) {
      // 創建 PVE pack for this subject
      const { data: newPack, error: packError } = await adminClient
        .from('packs')
        .insert({
          name: pvePackName,
          subject: subject, // Use the specific subject
          skill: 'mixed',
          difficulty: 3,
          description: `Auto-generated pack for PVE ${subject} questions`,
          is_public: false,
          source: 'system', // Mark as system to match our RLS policy
        })
        .select('id')
        .single()

      if (packError) {
        console.error('[Error Book] Failed to create PVE pack:', packError)
        return null
      }
      pvePack = { data: newPack }
    }

    if (!pvePack?.data) {
      console.error('[Error Book] Failed to create/find PVE pack')
      return null
    }

    // 🎯 Check if pack_question ALREADY EXISTS IN THIS SPECIFIC PACK
    const existing = await adminClient
      .from('pack_questions')
      .select('id')
      .eq('question_id', seedQuestion.data.id)
      .eq('pack_id', pvePack.data.id)
      .maybeSingle()

    if (existing.data) {
      return existing.data.id
    }

    // 創建 pack_question within the corect pack
    const { data: newPackQuestion, error: insertError } = await adminClient
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

  // 原有的 fallback 邏輯 (如果不是 seed_question)
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

    // Build query with standard client (RLS policies now allow this)
    // Use admin client to bypass RLS on pack_questions/packs (which might be private system packs)
    const adminClient = getAdminClient() || supabase
    let query = adminClient
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

    // Normalize and flatten data
    const normalizedData = (data || []).map((item: any) => {
      let itemSubject = item.pack_questions?.packs?.subject
      // Fallback for legacy mixed pack items
      if (itemSubject === 'mixed' || !itemSubject) {
        itemSubject = 'english' // Default to English for legacy items
      }
      return {
        ...item,
        subject: itemSubject
      }
    })

    // Filter by subject if provided
    let filteredData = normalizedData
    if (subject) {
      filteredData = normalizedData.filter((item: any) => item.subject === subject)
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
