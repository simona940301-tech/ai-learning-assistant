import { chatCompletion } from '@/lib/gemini'
import { safeText } from '@/lib/safe-text'

export interface ErrorAnalysisResult {
    analysis: string
    key_concept: string
    misconception: string
}

export async function analyzeError(
    questionText: string,
    userAnswer: string,
    correctAnswer: string,
    tags: string[] = []
): Promise<ErrorAnalysisResult> {
    const prompt = `
You are a personalized tutor. The user answered a question incorrectly.
Analyze their mistake and explain the core misconception.

Question:
${safeText(questionText, '')}

User Answer: ${userAnswer}
Correct Answer: ${correctAnswer}
Tags: ${tags.join(', ')}

Please provide a JSON response with the following fields:
1. "analysis": A concise explanation (2-3 sentences) in Traditional Chinese of why the user likely chose the wrong answer and why it is incorrect. Focus on the trap or confusion.
2. "key_concept": The specific concept they missed (e.g., "Subject-Verb Agreement").
3. "misconception": A 1-sentence summary of their likely error (e.g., "Confused 'lay' and 'lie'").

Output JSON only.
`

    try {
        const result = await chatCompletion(
            [{ role: 'user', content: prompt }],
            {
                model: 'gemini-2.0-flash-exp',
                temperature: 0.3,
                jsonMode: true
            }
        )

        const parsed = JSON.parse(result)
        return {
            analysis: parsed.analysis || '無法分析錯誤',
            key_concept: parsed.key_concept || '未知概念',
            misconception: parsed.misconception || '未知錯誤'
        }
    } catch (error) {
        console.error('Error analysis failed:', error)
        return {
            analysis: '暫時無法分析您的錯誤，請稍後再試。',
            key_concept: 'N/A',
            misconception: 'N/A'
        }
    }
}
