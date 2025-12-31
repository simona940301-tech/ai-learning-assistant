import { QuestionRepo, type RawQuestionRecord } from '@/lib/dal/question-repo'
import { GeminiService } from '@/lib/services/gemini-service'
import { QuestionService } from '@/lib/services/question-service'

/**
 * 題目處理結果
 */
interface ProcessingResult {
    success: boolean
    questionId?: string
    error?: string
}

/**
 * Question Processing Service - 題目處理流水線
 * 
 * 職責：
 * - 協調從 questions_raw 到 questions 的轉換
 * - 執行 AI 清理與標籤
 * - 狀態管理與錯誤處理
 */
export class QuestionProcessingService {
    constructor(
        private questionRepo: QuestionRepo,
        private questionService: QuestionService,
        private geminiService: GeminiService
    ) { }

    /**
     * 處理所有待處理的題目（批次）
     */
    async processPendingQuestions(batchSize: number = 5): Promise<{ processed: number; failed: number }> {
        const pendingQuestions = await this.questionRepo.getPendingRawQuestions(batchSize)
        let processed = 0
        let failed = 0

        console.log(`[QuestionProcessing] Found ${pendingQuestions.length} pending questions`)

        for (const rawQuestion of pendingQuestions) {
            try {
                await this.processSingleQuestion(rawQuestion)
                processed++
            } catch (error) {
                console.error(`[QuestionProcessing] Failed to process raw question ${rawQuestion.id}:`, error)
                failed++
            }
        }

        return { processed, failed }
    }

    /**
     * 處理單個原始題目
     */
    async processSingleQuestion(rawQuestion: RawQuestionRecord): Promise<ProcessingResult> {
        const { id, rawData, source } = rawQuestion

        try {
            // 1. 更新狀態為 Processing
            await this.questionRepo.updateRawQuestionStatus(id, 'processing')

            // 2. 格式標準化 (Raw -> Standard Input)
            const input = this.normalizeRawData(rawData, source)

            // 3. 透過 QuestionService 執行上傳流程 (包含去重、AI 標籤、寫入 DB)
            // 注意：這裡我們復用 QuestionService 的 uploadQuestion 邏輯，
            // 但需要確保它不會因為重複而拋出錯誤，而是優雅處理
            const result = await this.questionService.uploadQuestion({
                stem: input.stem,
                answer: input.answer,
                options: input.options,
                subject: input.subject,
                tags: input.tags, // 初始標籤，後續會由 AI 增強
            })

            // 4. 更新狀態為 Completed
            await this.questionRepo.updateRawQuestionStatus(id, 'completed', {
                processedQuestionId: result.questionId
            })

            return { success: true, questionId: result.questionId }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            // 更新狀態為 Failed
            await this.questionRepo.updateRawQuestionStatus(id, 'failed', {
                errorMessage
            })

            return { success: false, error: errorMessage }
        }
    }

    /**
     * 根據來源標準化原始數據
     */
    private normalizeRawData(rawData: any, source: string): {
        stem: string
        answer: string
        options?: string[]
        subject?: string
        tags?: string[]
    } {
        // 根據不同來源進行適配
        // 目前假設 rawData 已經是接近標準的 JSON 格式 (例如來自 CSV parser)

        if (!rawData.stem || !rawData.answer) {
            throw new Error('Missing required fields: stem or answer')
        }

        return {
            stem: String(rawData.stem).trim(),
            answer: String(rawData.answer).trim(),
            options: Array.isArray(rawData.options) ? rawData.options : undefined,
            subject: rawData.subject ? String(rawData.subject).trim() : undefined,
            tags: Array.isArray(rawData.tags) ? rawData.tags : undefined,
        }
    }
}
