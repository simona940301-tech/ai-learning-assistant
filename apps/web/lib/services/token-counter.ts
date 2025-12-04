import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

/**
 * Service for counting tokens in text
 * 
 * Used to determine routing strategy (Context Cache vs File Search)
 */
export class TokenCounterService {
    /**
     * Counts tokens in the given text using Gemini's token counting API
     * 
     * @param text - The text to count tokens for
     * @returns The number of tokens
     */
    static async countTokens(text: string): Promise<number> {
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

            const result = await model.countTokens(text)

            console.log(`[TokenCounter] Counted ${result.totalTokens} tokens`)
            return result.totalTokens
        } catch (error) {
            console.error('[TokenCounter] Failed to count tokens:', error)

            // Fallback: rough estimation (1 token ≈ 4 characters for English)
            const estimatedTokens = Math.ceil(text.length / 4)
            console.warn(`[TokenCounter] Using fallback estimation: ${estimatedTokens} tokens`)
            return estimatedTokens
        }
    }

    /**
     * Token threshold for routing decision
     * Files with tokens <= this threshold use Context Cache
     * Files with tokens > this threshold use File Search
     */
    static readonly THRESHOLD = 500_000
}
