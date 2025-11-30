import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QuestionRepo } from '@/lib/dal/question-repo'
import { QuestionService } from '@/lib/services/question-service'
import { GeminiService } from '@/lib/services/gemini-service'
import { QuestionProcessingService } from '@/lib/services/question-processing-service'
import { AuthorizationService } from '@/lib/services/authorization-service'

/**
 * POST /api/internal/questions/process/batch
 * 
 * 批次處理待處理的原始題目 (Cron Job Friendly)
 * 
 * Query Params:
 * - limit: 每次處理的數量 (default: 5)
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = createClient()

        // 1. 權限檢查 (Admin Only or Cron Secret)
        // 檢查 Authorization header 是否包含 CRON_SECRET
        const authHeader = req.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET
        const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

        if (!isCron) {
            // 如果不是 Cron，則檢查使用者權限
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
        }

        const searchParams = req.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '5', 10)

        // 2. 初始化 Services
        const questionRepo = new QuestionRepo(supabase)
        const geminiService = new GeminiService()
        const questionService = new QuestionService(questionRepo, geminiService)
        const processingService = new QuestionProcessingService(questionRepo, questionService, geminiService)

        // 3. 執行批次處理
        const result = await processingService.processPendingQuestions(limit)

        return NextResponse.json({
            success: true,
            data: result,
            message: `Processed ${result.processed} questions, ${result.failed} failed`
        })

    } catch (error) {
        console.error('[Batch Process API] Error:', error)
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
