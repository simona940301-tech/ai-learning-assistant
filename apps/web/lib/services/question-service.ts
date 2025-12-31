import { QuestionRepo } from '@/lib/dal/question-repo'
import { getGeminiService, GeminiService } from '@/lib/services/gemini-service'
import { detectDuplicates } from '@/lib/ai-labeling'
import type { AILabel } from '@plms/shared/types'

/**
 * 原始題目輸入
 */
export interface RawQuestionInput {
    stem: string
    answer: string
    options?: string[]
    subject?: string
    tags?: string[]
}

/**
 * 上傳結果
 */
export interface UploadResult {
    questionId: string
    isDuplicate: boolean
    duplicateOf?: string
    label?: AILabel
}

/**
 * 重複檢測結果
 */
export interface DuplicateCheckResult {
    isDuplicate: boolean
    duplicateOf?: string
    similarity: number
    method: 'semantic' | 'lexical'
}

/**
 * Question Service - 題目處理業務邏輯
 * 
 * 職責：
 * - 題目上傳與儲存
 * - 重複檢測
 * - AI 標籤生成
 * - 題目處理流程編排
 */
export class QuestionService {
    constructor(
        private questionRepo: QuestionRepo,
        private geminiService: GeminiService = getGeminiService()
    ) { }

    /**
     * 上傳題目（完整流程）
     */
    async uploadQuestion(data: RawQuestionInput): Promise<UploadResult> {
        // 1. 生成語義雜湊
        const semanticHash = await this.geminiService.generateSemanticHash(data.stem)

        // 2. 檢測重複
        const existingQuestions = await this.questionRepo.findDuplicates(data.stem)
        const duplicateCheck = await detectDuplicates(
            '', // questionId (新題目還沒有 ID)
            data.stem,
            existingQuestions.map(q => ({
                id: q.id,
                stem: q.prompt,
                semanticHash: q.semanticHash,
            }))
        )

        // 3. 如果是重複題目，返回重複資訊
        if (duplicateCheck.isDuplicate && duplicateCheck.duplicateOf) {
            return {
                questionId: duplicateCheck.duplicateOf,
                isDuplicate: true,
                duplicateOf: duplicateCheck.duplicateOf,
            }
        }

        // 4. 儲存題目
        const questionId = await this.questionRepo.saveRawQuestion({
            ...data,
            semanticHash,
        })

        // 5. 生成 AI 標籤（非同步，不阻塞）
        let label: AILabel | undefined
        try {
            label = await this.geminiService.labelQuestion(data.stem)

            // 更新題目標籤
            if (label) {
                await this.questionRepo.updateQuestion(questionId, {
                    tags: [label.topic, label.skill, label.difficulty],
                })
            }
        } catch (error) {
            console.error('[QuestionService] Failed to generate label:', error)
            // 標籤生成失敗不影響題目上傳
        }

        return {
            questionId,
            isDuplicate: false,
            label,
        }
    }

    /**
     * 檢測重複題目
     */
    async detectDuplicates(questionText: string): Promise<DuplicateCheckResult> {
        const existingQuestions = await this.questionRepo.findDuplicates(questionText)

        const result = await detectDuplicates(
            '',
            questionText,
            existingQuestions.map(q => ({
                id: q.id,
                stem: q.prompt,
                semanticHash: q.semanticHash,
            }))
        )

        return {
            isDuplicate: result.isDuplicate,
            duplicateOf: result.duplicateOf,
            similarity: result.similarity,
            method: result.method,
        }
    }

    /**
     * 批次上傳題目
     */
    async uploadBatch(questions: RawQuestionInput[]): Promise<{
        successful: UploadResult[]
        failed: Array<{ question: RawQuestionInput; error: string }>
        duplicates: number
    }> {
        const successful: UploadResult[] = []
        const failed: Array<{ question: RawQuestionInput; error: string }> = []
        let duplicates = 0

        for (const question of questions) {
            try {
                const result = await this.uploadQuestion(question)
                successful.push(result)

                if (result.isDuplicate) {
                    duplicates++
                }
            } catch (error) {
                failed.push({
                    question,
                    error: error instanceof Error ? error.message : 'Unknown error',
                })
            }
        }

        return {
            successful,
            failed,
            duplicates,
        }
    }

    /**
     * 覆寫題目（管理員功能）
     */
    async overrideQuestion(
        id: string,
        data: Partial<{
            stem: string
            answer: string
            options: string[]
        }>
    ): Promise<void> {
        const updateData: any = {}

        if (data.stem) updateData.prompt = data.stem
        if (data.answer) updateData.answer = data.answer
        if (data.options) updateData.options = data.options

        await this.questionRepo.updateQuestion(id, updateData)
    }

    /**
     * 提取題目標籤
     */
    async extractTags(questionText: string): Promise<string[]> {
        return this.geminiService.extractTags(questionText)
    }
}
