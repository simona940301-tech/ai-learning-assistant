export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { QuizGenerationService } from '@/lib/services/quiz-generation-service'
import { KeypointRepo } from '@/lib/dal/keypoint-repo'
import { SessionRepo } from '@/lib/dal/session-repo'
import { ok, fail, ERROR_CODES } from '@/lib/utils/api-response-builder'

const KeypointMCQRequestSchema = z.object({
  prompt: z.string().min(1),
  subject: z.string().optional(),
  detected_keypoint: z.string().optional(),
})

/**
 * POST /api/warmup/keypoint-mcq
 * 
 * 關鍵點 MCQ 生成 API - 控制器層（樣板）
 * 職責：接收請求 → 調用服務層 → 處理響應
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[warmup/keypoint-mcq][stage=parse] Starting request')

    // Step 1: 解析和驗證請求
    const body = await request.json()
    const validated = KeypointMCQRequestSchema.parse(body)
    console.log('[warmup/keypoint-mcq][stage=parse] Validated:', {
      prompt: validated.prompt.substring(0, 50) + '...',
      subject: validated.subject,
      detected_keypoint: validated.detected_keypoint,
    })

    // Step 2: 創建依賴（依賴注入）
    const db = createClient()
    const keypointRepo = new KeypointRepo(db)
    const sessionRepo = new SessionRepo(db)

    // Step 3: 創建服務實例
    const service = new QuizGenerationService(keypointRepo, sessionRepo)

    // Step 4: 調用服務層執行業務邏輯
    const result = await service.generateKeypointMCQ(validated)

    if (!result.success) {
      const statusMap: Record<string, number> = {
        subject_required: 200, // 特殊情況：需要手動確認，返回 200
        subject_not_found: 404,
        insufficient_keypoints: 400,
        insufficient_distractors: 400,
        session_creation_failed: 500,
        options_creation_failed: 500,
      }

      // 特殊處理：subject_required 返回 200 和詳細信息
      if (result.error === 'subject_required') {
        return NextResponse.json(
          ok({
            phase: result.phase,
            subject: result.subject,
            confidence: result.confidence,
            message: result.message,
          }),
          { status: 200 }
        )
      }

      const status = statusMap[result.error || ''] || 400
      return NextResponse.json(fail(result.error || 'UNKNOWN_ERROR', result.message), { status })
    }

    console.log('[warmup/keypoint-mcq][stage=response] Success:', {
      subject: result.quiz?.subject,
      keypoint: result.quiz?.detected_keypoint,
    })

    // Step 5: 返回成功響應
    return NextResponse.json(ok(result.quiz))
  } catch (error) {
    console.error('[warmup/keypoint-mcq][stage=fatal]', error)

    // 驗證錯誤處理
    if (error instanceof z.ZodError) {
      return NextResponse.json(fail(ERROR_CODES.VALIDATION_ERROR, 'Invalid request'), {
        status: 400,
      })
    }

    // 系統錯誤
    const errorMessage = error instanceof Error ? error.message : 'internal_error'
    return NextResponse.json(fail(ERROR_CODES.INTERNAL_ERROR, errorMessage), { status: 500 })
  }
}
