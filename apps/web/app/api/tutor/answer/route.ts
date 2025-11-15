export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { AnswerService } from '@/lib/services/answer-service'
import { OptionRepo } from '@/lib/dal/option-repo'
import { QuestionRepo } from '@/lib/dal/question-repo'
import { ConceptRepo } from '@/lib/dal/concept-repo'
import { ok, fail, ERROR_CODES } from '@/lib/utils/api-response-builder'
import {
  TutorAnswerRequestSchema,
  type TutorAnswerRequest,
} from '@/src/schemas/answer'

/**
 * POST /api/tutor/answer
 * 
 * 答案 API - 控制器層（樣板）
 * 職責：接收請求 → 調用服務層 → 處理響應
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[tutor/answer][stage=parse] Starting request')

    // Step 1: 解析和驗證請求
    const body = await request.json()
    const input = TutorAnswerRequestSchema.parse(body)
    console.log('[tutor/answer][stage=parse] Validated:', {
      questionId: input.questionId,
      option_id: input.option_id,
      session_id: input.session_id,
    })

    // Step 2: 創建依賴（依賴注入）
    const db = createClient()
    const optionRepo = new OptionRepo(db)
    const questionRepo = new QuestionRepo(db)
    const conceptRepo = new ConceptRepo(db)

    // Step 3: 創建服務實例
    const service = new AnswerService(optionRepo, questionRepo, conceptRepo)

    // Step 4: 調用服務層執行業務邏輯
    const result = await service.processAnswer(input)

    console.log('[tutor/answer][stage=response] Success:', {
      correct: result.correct,
      concept_id: result.concept_id,
    })

    // Step 5: 返回成功響應
    return NextResponse.json(ok(result))
  } catch (error) {
    console.error('[tutor/answer][stage=fatal]', error)

    // 驗證錯誤處理
    if (error instanceof ZodError) {
      return NextResponse.json(
        fail(ERROR_CODES.VALIDATION_ERROR, 'Invalid payload for /api/tutor/answer'),
        { status: 400 }
      )
    }

    // 系統錯誤
    const errorMessage = error instanceof Error ? error.message : 'internal_error'
    return NextResponse.json(fail(ERROR_CODES.INTERNAL_ERROR, errorMessage), { status: 500 })
  }
}

