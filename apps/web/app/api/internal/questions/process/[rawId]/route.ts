import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QuestionRepo } from '@/lib/dal/question-repo'
import { QuestionService } from '@/lib/services/question-service'
import { GeminiService } from '@/lib/services/gemini-service'
import { QuestionProcessingService } from '@/lib/services/question-processing-service'

/**
 * POST /api/internal/questions/process/[rawId]
 * 
 * 觸發單個原始題目的處理流程
 * 
 * Architecture: Route -> Service -> Repo
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { rawId: string } }
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

    // 檢查是否為管理員 (這裡假設 profiles 表有 role 欄位，或者使用簡單的 email 檢查)
    // 為了簡化，這裡先檢查是否登入，實際生產環境應檢查 role

    const rawId = params.rawId
    if (!rawId) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'rawId is required' },
        { status: 400 }
      )
    }

    // 2. 初始化 Services
    const questionRepo = new QuestionRepo(supabase)
    const geminiService = new GeminiService()
    const questionService = new QuestionService(questionRepo, geminiService)
    const processingService = new QuestionProcessingService(questionRepo, questionService, geminiService)

    // 3. 獲取原始題目記錄
    const { data: rawData, error: fetchError } = await supabase
      .from('questions_raw')
      .select('*')
      .eq('id', rawId)
      .single()

    if (fetchError || !rawData) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Raw question not found' },
        { status: 404 }
      )
    }

    const rawQuestionRecord = {
      id: rawData.id,
      source: rawData.source,
      rawData: rawData.raw_data,
      status: rawData.status,
      errorMessage: rawData.error_message,
      processedQuestionId: rawData.processed_question_id,
      createdAt: rawData.created_at,
      updatedAt: rawData.updated_at,
    }

    // 4. 執行處理
    const result = await processingService.processSingleQuestion(rawQuestionRecord)

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          rawId,
          processedQuestionId: result.questionId,
          status: 'completed'
        },
        message: 'Question processed successfully'
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'PROCESSING_FAILED',
          message: result.error
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[Process Question API] Error:', error)
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
