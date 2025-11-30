import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API
// Note: In a real app, ensure GEMINI_API_KEY is set in environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface ConceptTag {
    tag_name: string
    category?: string
}

/**
 * Tag a question with concepts using Gemini AI
 */
export async function tagQuestion(
    questionText: string,
    subject: 'english' | 'math',
    availableTags?: string[]
): Promise<string[]> {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.warn('[Concept Tagger] Missing GEMINI_API_KEY, returning empty tags')
            return []
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

        let prompt = `
你是高中${subject === 'english' ? '英文' : '數學'}題目分析專家。請分析以下題目，提取最相關的 1-3 個核心概念標籤。

題目內容:
${questionText.substring(0, 1000)}
`

        if (availableTags && availableTags.length > 0) {
            prompt += `
請從以下預定義標籤中選擇 (不要創造新標籤，除非題目概念完全不在列表中):
${availableTags.join(', ')}
`
        } else {
            prompt += `
請輸出標準的學測/指考考點概念 (例如: "虛擬語氣", "一元二次方程式", "三角函數", "閱讀理解", "詞彙測驗")
`
        }

        prompt += `
請以 JSON 格式回傳，格式如下:
{
  "tags": ["標籤1", "標籤2"]
}
`

        const result = await model.generateContent(prompt)
        const response = result.response
        const text = response.text()

        // Extract JSON from response (handle potential markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            console.error('[Concept Tagger] Failed to parse JSON from AI response:', text)
            return []
        }

        const parsed = JSON.parse(jsonMatch[0])
        return parsed.tags || []

    } catch (error) {
        console.error('[Concept Tagger] Error tagging question:', error)
        return []
    }
}

/**
 * Batch tag questions
 */
export async function batchTagQuestions(
    questions: Array<{ id: string, text: string, subject: 'english' | 'math' }>
): Promise<Record<string, string[]>> {
    const results: Record<string, string[]> = {}

    // Process in sequence to avoid rate limits
    for (const q of questions) {
        results[q.id] = await tagQuestion(q.text, q.subject)
        // Small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 500))
    }

    return results
}
