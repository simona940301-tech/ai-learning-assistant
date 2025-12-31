import { ErrorBookRepo, type CreateErrorBookEntryInput, type ErrorBookEntry } from '@/lib/dal/error-book-repo'
import { geminiCompletion } from '@/lib/gemini'

/**
 * AI 筆記生成選項
 */
export interface GenerateNoteOptions {
    skillId: string
    skillName: string
    masteryLevel?: number
    questionContext?: string
}

/**
 * 筆記生成結果
 */
export interface GeneratedNote {
    content: string
    sections: {
        corePoints: string[]
        commonErrors: string[]
        solvingTips: string[]
        practiceAdvice: string[]
    }
}

/**
 * Error Book Service - 錯題本業務邏輯
 * 
 * 職責：
 * - AI 筆記生成
 * - 錯題本記錄管理
 * - 掌握度追蹤
 */
export class ErrorBookService {
    constructor(private errorBookRepo: ErrorBookRepo) { }

    /**
     * 使用 AI 生成學習筆記
     */
    async generateNote(options: GenerateNoteOptions): Promise<GeneratedNote> {
        const { skillName, masteryLevel = 0, questionContext } = options

        try {
            // 構建 AI 提示詞
            const prompt = this.buildNotePrompt(skillName, masteryLevel, questionContext)

            // 呼叫 Gemini API
            const aiResponse = await geminiCompletion(
                [
                    {
                        role: 'system',
                        content: '你是一位專業的教育顧問，擅長為學生生成清晰、實用的學習筆記。',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                {
                    temperature: 0.7,
                    maxOutputTokens: 1500,
                }
            )

            // 解析 AI 回應
            return this.parseAIResponse(aiResponse, skillName, masteryLevel)
        } catch (error) {
            console.error('[ErrorBookService] AI generation failed:', error)

            // Fallback 到模板生成
            return this.generateTemplateNote(skillName, masteryLevel)
        }
    }

    /**
     * 創建或更新錯題本記錄
     */
    async createOrUpdateEntry(
        userId: string,
        options: GenerateNoteOptions
    ): Promise<{
        entry: ErrorBookEntry
        note: GeneratedNote
        isNew: boolean
    }> {
        // 1. 生成筆記
        const note = await this.generateNote(options)

        // 2. 檢查是否已存在記錄
        const existing = await this.errorBookRepo.findByUserAndSkill(userId, options.skillId)

        if (existing) {
            // 更新現有記錄
            const updated = await this.errorBookRepo.update(existing.id, {
                noteContent: note.content,
                masteryLevel: options.masteryLevel ?? existing.masteryLevel,
            })

            return {
                entry: updated,
                note,
                isNew: false,
            }
        } else {
            // 創建新記錄
            const created = await this.errorBookRepo.create({
                userId,
                skillId: options.skillId,
                skillName: options.skillName,
                noteContent: note.content,
                masteryLevel: options.masteryLevel ?? 0,
            })

            return {
                entry: created,
                note,
                isNew: true,
            }
        }
    }

    /**
     * 獲取使用者的錯題本
     */
    async getUserErrorBook(userId: string): Promise<ErrorBookEntry[]> {
        return this.errorBookRepo.findByUser(userId)
    }

    /**
     * 構建 AI 提示詞
     */
    private buildNotePrompt(
        skillName: string,
        masteryLevel: number,
        questionContext?: string
    ): string {
        const masteryPercentage = Math.round(masteryLevel * 100)

        let prompt = `請為「${skillName}」這個知識點生成一份學習筆記。

當前掌握度：${masteryPercentage}%

請包含以下內容：
1. **核心概念**：用簡單的語言解釋核心概念（2-3 點）
2. **常見錯誤**：列出學生常犯的錯誤（2-3 點）
3. **解題技巧**：提供實用的解題技巧（2-3 點）
4. **練習建議**：給出具體的練習建議（1-2 點）

`

        if (questionContext) {
            prompt += `\n相關題目背景：\n${questionContext}\n`
        }

        prompt += `\n請用 Markdown 格式輸出，使用清晰的標題和列表。`

        return prompt
    }

    /**
     * 解析 AI 回應
     */
    private parseAIResponse(
        aiResponse: string,
        skillName: string,
        masteryLevel: number
    ): GeneratedNote {
        // 嘗試從 AI 回應中提取結構化內容
        const corePoints = this.extractSection(aiResponse, '核心概念')
        const commonErrors = this.extractSection(aiResponse, '常見錯誤')
        const solvingTips = this.extractSection(aiResponse, '解題技巧')
        const practiceAdvice = this.extractSection(aiResponse, '練習建議')

        // 構建完整筆記內容
        const content = `# ${skillName} 學習筆記

## 掌握度：${Math.round(masteryLevel * 100)}%

${aiResponse}

---
*筆記生成時間：${new Date().toLocaleString('zh-TW')}*
`

        return {
            content,
            sections: {
                corePoints,
                commonErrors,
                solvingTips,
                practiceAdvice,
            },
        }
    }

    /**
     * 從文本中提取特定章節
     */
    private extractSection(text: string, sectionName: string): string[] {
        const regex = new RegExp(`##?\\s*${sectionName}[：:]?\\s*([\\s\\S]*?)(?=##|$)`, 'i')
        const match = text.match(regex)

        if (!match) return []

        const sectionText = match[1]
        const items = sectionText
            .split('\n')
            .filter(line => line.trim().match(/^[-*•]\s+/))
            .map(line => line.replace(/^[-*•]\s+/, '').trim())
            .filter(Boolean)

        return items.slice(0, 3) // 限制最多 3 項
    }

    /**
     * 生成模板筆記（AI 失敗時的 fallback）
     */
    private generateTemplateNote(skillName: string, masteryLevel: number): GeneratedNote {
        const content = `# ${skillName} 學習筆記

## 掌握度：${Math.round(masteryLevel * 100)}%

### 核心概念
- 請補充核心概念
- 建議複習相關教材

### 常見錯誤
- 請記錄你遇到的錯誤
- 分析錯誤原因

### 解題技巧
- 請補充解題技巧
- 多練習相關題型

### 練習建議
- 建議多練習相關題目以提升掌握度
- 定期複習鞏固知識

---
*筆記生成時間：${new Date().toLocaleString('zh-TW')}*
`

        return {
            content,
            sections: {
                corePoints: ['請補充核心概念', '建議複習相關教材'],
                commonErrors: ['請記錄你遇到的錯誤', '分析錯誤原因'],
                solvingTips: ['請補充解題技巧', '多練習相關題型'],
                practiceAdvice: ['建議多練習相關題目以提升掌握度', '定期複習鞏固知識'],
            },
        }
    }
}
