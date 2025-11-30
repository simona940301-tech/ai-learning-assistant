export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseClient, getApiUser } from '@/lib/api/auth'
import { SolveService } from '@/lib/services/solve-service'
import { KeypointRepo } from '@/lib/dal/keypoint-repo'
import { QuestionRepo } from '@/lib/dal/question-repo'
import { SessionRepo } from '@/lib/dal/session-repo'
import { Api } from '@/lib/api/response'
import { ApiErrorCode } from '@/lib/types/api'

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

    // Step 0: Authentication check - required for all AI endpoints
    const { user, errorType } = await getApiUser(request)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
            ? 'Authentication required'
            : 'Authentication error occurred'

      return Api.unauthorized(message)
    }

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
    const db = getSupabaseClient(request)
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
    return Api.success(result)
  } catch (error) {
    console.error('[solve][stage=fatal]', error)

    // 驗證錯誤處理
    if (error instanceof z.ZodError) {
      return Api.badRequest('Invalid request', error.errors)
    }

    // 業務錯誤映射
    const errorMessage = error instanceof Error ? error.message : 'internal_error'

    // Map legacy error codes to ApiErrorCode
    if (errorMessage === 'SESSION_NOT_FOUND' || errorMessage === 'SUBJECT_NOT_FOUND') {
      return Api.notFound(errorMessage)
    }

    if (errorMessage === 'SUBJECT_REQUIRED' || errorMessage === 'KEYPOINTS_NOT_READY') {
      return Api.badRequest(errorMessage)
    }

    return Api.serverError(errorMessage)
  }
}
