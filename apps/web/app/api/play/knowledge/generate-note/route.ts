import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ErrorBookRepo } from '@/lib/dal/error-book-repo'
import { ErrorBookService } from '@/lib/services/error-book-service'

/**
 * POST /api/play/knowledge/generate-note
 * 
 * 為指定的知識點生成學習筆記並加入錯題本
 * 
 * Architecture: Route -> Service -> Repo
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { skillId, skillName, masteryLevel, questionContext } = body

    // Validation
    if (!skillId || !skillName) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'skillId and skillName are required'
        },
        { status: 400 }
      )
    }

    // Validate masteryLevel if provided
    if (masteryLevel !== undefined && (masteryLevel < 0 || masteryLevel > 1)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'masteryLevel must be between 0 and 1',
        },
        { status: 400 }
      )
    }

    // Initialize service layer
    const repo = new ErrorBookRepo(supabase)
    const service = new ErrorBookService(repo)

    // Generate note and create/update error book entry
    const result = await service.createOrUpdateEntry(user.id, {
      skillId,
      skillName,
      masteryLevel,
      questionContext,
    })

    return NextResponse.json({
      success: true,
      data: {
        entry: {
          id: result.entry.id,
          skillId: result.entry.skillId,
          skillName: result.entry.skillName,
          masteryLevel: result.entry.masteryLevel,
          createdAt: result.entry.createdAt,
          updatedAt: result.entry.updatedAt,
        },
        note: {
          content: result.note.content,
          sections: result.note.sections,
        },
        isNew: result.isNew,
      },
      message: result.isNew ? '筆記已生成並加入錯題本' : '筆記已更新',
    })
  } catch (error) {
    console.error('[Generate Note API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate note',
      },
      { status: 500 }
    )
  }
}
