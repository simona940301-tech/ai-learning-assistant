import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QuestionRepo } from '@/lib/dal/question-repo'
import { QuestionService } from '@/lib/services/question-service'
import { AuthorizationService } from '@/lib/services/authorization-service'

/**
 * PATCH /api/internal/questions/[id]/override
 * 
 * 管理員強制覆寫題目內容
 * 
 * Body:
 * {
 *   stem?: string
 *   answer?: string
 *   options?: string[]
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()

    // 1. 權限檢查 (Admin Only)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // 檢查管理員角色
    const authService = new AuthorizationService(supabase)
    const isAdmin = await authService.checkRole(user.id, 'admin')

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 }
      )
    }

    const id = params.id
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Question ID is required' },
        { status: 400 }
      )
    }

    const body = await req.json()

    // 2. 初始化 Services
    const questionRepo = new QuestionRepo(supabase)
    const questionService = new QuestionService(questionRepo)

    // 3. 執行覆寫
    await questionService.overrideQuestion(id, {
      stem: body.stem,
      answer: body.answer,
      options: body.options
    })

    return NextResponse.json({
      success: true,
      message: 'Question overridden successfully',
      data: { id, ...body }
    })

  } catch (error) {
    console.error('[Override Question API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
