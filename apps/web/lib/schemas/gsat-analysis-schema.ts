import { z } from 'zod'

const QuestionSchema = z.object({
    id: z.string().optional(),
    questionType: z.enum(['單選', '多選', '填充', '簡答', '作圖', '混合題']).describe('學測題型分類'),
    question: z.string(),
    options: z.union([
        z.array(z.string()),
        z.array(z.object({
            label: z.string(),
            text: z.string(),
            isCorrect: z.boolean().optional()
        }))
    ]).optional(),
    answer: z.string(),
    analysis: z.string().describe('詳解，包含觀念連結'),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).describe('難度分級'),
    curriculumCode: z.string().optional().describe('對應課綱單元代碼，如：數A-11-1、歷史(一)-Ch2'),
    sourceDocId: z.string().optional().describe('題目來源文件的ID（當有多個文件時使用）'),
})

const QuestionSetSchema = z.object({
    type: z.literal('question_set'),
    context: z.string().describe('題組情境引文（新聞報導、實驗紀錄、古文翻譯等）'),
    questions: z.array(QuestionSchema),
})

export const KeyConceptSchema = z.object({
    concept: z.string().describe('核心知識點'),
    explanation: z.string().describe('完整且詳盡的解釋，應整合多文件來源並深度解析'),
    importance: z.enum(['高', '中', '低']).describe('該概念在學測中的考頻和重要性'),
    curriculumCode: z.string().optional().describe('對應的課綱單元代碼，例如：數A-11-1 或 高中歷史(一)-Ch2'),
    sources: z.array(z.string()).optional().describe('該概念的來源文件列表，例如：["math_ch1.pdf", "math_ch2.pdf"]'),
})

export const GSATAnalysisSchema = z.object({
    analysisID: z.string().optional().describe('該分析的唯一ID'),
    subject: z.string().describe('科目，如國文、英文、數學A、數學B、物理、化學、生物、地科、歷史、地理、公民'),
    topics: z.array(z.string()).describe('涵蓋單元'),
    summary: z.string().describe('詳盡且全面的重點整理（Markdown格式），包含核心摘要、詳細的主題重點與深入的專有名詞解釋'),
    keyConcepts: z.array(KeyConceptSchema).describe('核心概念解析'),
    examPrediction: z.array(
        z.union([QuestionSchema, QuestionSetSchema])
    ).describe('符合學測命題原則的考題預測（必須包含至少一個題組）'),
    sources: z.array(z.string()).optional().describe('參考的文件來源列表'),
})

export type GSATAnalysis = z.infer<typeof GSATAnalysisSchema>
