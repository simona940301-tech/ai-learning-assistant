export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { SolveService } from '@/lib/services/solve-service'
import { KeypointRepo } from '@/lib/dal/keypoint-repo'
import { QuestionRepo } from '@/lib/dal/question-repo'
import { SessionRepo } from '@/lib/dal/session-repo'
import { ok, fail, ERROR_CODES } from '@/lib/utils/api-response-builder'

const SolveRequestSchema = z
  .object({
    session_id: z.string().uuid().optional(),
    question_id: z.string().uuid().optional(),
    prompt: z.string().min(1).optional(),
    subject: z.string().optional(),
    keypoint_code: z.string().optional(),
    mode: z.enum(['step', 'fast']).default('step'),
  })
  .refine(
    (data) => data.session_id || data.question_id || data.prompt,
    'Either session_id, question_id, or prompt must be provided'
  )

/**
 * POST /api/solve
 * 
 * 解題 API - 控制器層（樣板）
 * 職責：接收請求 → 調用服務層 → 處理響應
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[solve][stage=parse] Starting request')

    // Step 1: 解析和驗證請求
    const body = await request.json()
    const validated = SolveRequestSchema.parse(body)
    console.log('[solve][stage=parse] Validated:', {
      session_id: validated.session_id,
      question_id: validated.question_id,
      subject: validated.subject,
      keypoint_code: validated.keypoint_code,
      mode: validated.mode,
    })

    // Step 2: 創建依賴（依賴注入）
    const db = createClient()
    const keypointRepo = new KeypointRepo(db)
    const questionRepo = new QuestionRepo(db)
    const sessionRepo = new SessionRepo(db)

    // Step 3: 創建服務實例
    const service = new SolveService(keypointRepo, questionRepo, sessionRepo)

    // Step 4: 調用服務層執行業務邏輯
    const result = await service.solve(validated)

    console.log('[solve][stage=response] Success:', {
      subject: result.subject,
      keypoint: result.detected_keypoint,
    })

    // Step 5: 返回成功響應
    return NextResponse.json(ok(result))
  } catch (error) {
    console.error('[solve][stage=fatal]', error)

    // 驗證錯誤處理
    if (error instanceof z.ZodError) {
      return NextResponse.json(fail(ERROR_CODES.VALIDATION_ERROR, 'Invalid request'), {
        status: 400,
      })
    }

    // 業務錯誤映射
    const errorMessage = error instanceof Error ? error.message : 'internal_error'
    const statusMap: Record<string, number> = {
      SESSION_NOT_FOUND: 404,
      SUBJECT_REQUIRED: 400,
      SUBJECT_NOT_FOUND: 404,
      KEYPOINTS_NOT_READY: 400,
    }

    const status = statusMap[errorMessage] || 500
    const displayMessage = status === 500 ? 'Internal server error' : errorMessage

    return NextResponse.json(fail(errorMessage, displayMessage), { status })
  }
}
