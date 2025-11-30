import { geminiCompletion, geminiCompletionJSON } from '@/lib/gemini'
import type { AILabel } from '@plms/shared/types'
import crypto from 'crypto'

/**
 * Gemini Service - Unified AI Operations
 * 
 * Provides embeddings, labeling, and tag extraction using Gemini API
 */
export class GeminiService {
    /**
     * Generate embeddings for text (semantic hash)
     * 
     * Note: Gemini doesn't have a direct embeddings API like OpenAI
     * We use a semantic hash approach for now
     */
    async generateEmbeddings(text: string): Promise<number[]> {
        // Normalize text
        const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ')

        // Generate hash
        const hash = crypto.createHash('sha256').update(normalized).digest()

        // Convert to pseudo-embedding (1536 dimensions like OpenAI)
        const embedding: number[] = []
        for (let i = 0; i < 1536; i++) {
            const byteIndex = i % hash.length
            embedding.push((hash[byteIndex] / 255) * 2 - 1) // Normalize to [-1, 1]
        }

        return embedding
    }

    /**
     * Generate semantic hash from embeddings
     */
    async generateSemanticHash(text: string): Promise<string> {
        const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ')
        return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16)
    }

    /**
     * Label question with AI
     */
    async labelQuestion(questionContent: string): Promise<AILabel> {
        try {
            const response = await geminiCompletionJSON<{
                topic: string
                skill: string
                difficulty: 'easy' | 'medium' | 'hard' | 'expert'
                errorTypes: string[]
                grade: string
                confidence: number
            }>(
                [
                    {
                        role: 'system',
                        content: `You are an educational AI that labels questions. Analyze the question and return a JSON object with:
- topic: main subject (e.g., "algebra", "geometry", "reading_comprehension")
- skill: required skill (e.g., "problem_solving", "critical_thinking", "calculation")
- difficulty: one of "easy", "medium", "hard", "expert"
- errorTypes: array of common error types (e.g., ["calculation", "concept", "reading"])
- grade: target grade level (e.g., "junior_high_1", "senior_high_2")
- confidence: your confidence score (0.0 to 1.0)`,
                    },
                    {
                        role: 'user',
                        content: `Label this question:\n\n${questionContent}`,
                    },
                ],
                {
                    temperature: 0.3,
                    maxOutputTokens: 500,
                }
            )

            return {
                ...response,
                labeledAt: new Date().toISOString(),
                version: '1.0.0',
            }
        } catch (error) {
            console.error('[GeminiService] Labeling failed:', error)

            // Fallback to heuristic-based labeling
            return this.fallbackLabel(questionContent)
        }
    }

    /**
     * Extract tags from question text
     */
    async extractTags(questionText: string): Promise<string[]> {
        try {
            const response = await geminiCompletionJSON<{ tags: string[] }>(
                [
                    {
                        role: 'system',
                        content: `Extract 3-5 relevant tags from the question. Tags should be:
- Specific topics or concepts
- Skills being tested
- Question types
Return JSON: { "tags": ["tag1", "tag2", ...] }`,
                    },
                    {
                        role: 'user',
                        content: questionText,
                    },
                ],
                {
                    temperature: 0.2,
                    maxOutputTokens: 200,
                }
            )

            return response.tags.slice(0, 5) // Limit to 5 tags
        } catch (error) {
            console.error('[GeminiService] Tag extraction failed:', error)

            // Fallback to simple keyword extraction
            return this.extractKeywords(questionText)
        }
    }

    /**
     * Fallback labeling using heuristics
     */
    private fallbackLabel(content: string): AILabel {
        const difficulty = this.estimateDifficulty(content)
        const topic = this.extractTopic(content)

        return {
            topic,
            skill: 'problem_solving',
            difficulty,
            errorTypes: ['calculation', 'concept'],
            grade: 'junior_high_1',
            confidence: 0.5, // Lower confidence for fallback
            labeledAt: new Date().toISOString(),
            version: '1.0.0',
        }
    }

    private estimateDifficulty(content: string): 'easy' | 'medium' | 'hard' | 'expert' {
        const length = content.length
        const hasComplexTerms = /integral|derivative|probability|quantum|polynomial/i.test(content)

        if (hasComplexTerms || length > 500) return 'expert'
        if (length > 300) return 'hard'
        if (length > 150) return 'medium'
        return 'easy'
    }

    private extractTopic(content: string): string {
        const lowerContent = content.toLowerCase()

        if (/algebra|equation|polynomial/.test(lowerContent)) return 'algebra'
        if (/geometry|triangle|circle/.test(lowerContent)) return 'geometry'
        if (/calculus|limit|derivative/.test(lowerContent)) return 'calculus'
        if (/probability|statistics/.test(lowerContent)) return 'statistics'
        if (/reading|comprehension|passage/.test(lowerContent)) return 'reading_comprehension'
        if (/grammar|sentence|clause/.test(lowerContent)) return 'grammar'
        if (/vocabulary|word|meaning/.test(lowerContent)) return 'vocabulary'

        return 'general'
    }

    private extractKeywords(text: string): string[] {
        // Simple keyword extraction
        const words = text
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3)
            .filter(w => !['what', 'which', 'that', 'this', 'these', 'those'].includes(w))

        // Get unique words
        const unique = Array.from(new Set(words))

        // Return top 5
        return unique.slice(0, 5)
    }
}

// Singleton instance
let geminiServiceInstance: GeminiService | null = null

export function getGeminiService(): GeminiService {
    if (!geminiServiceInstance) {
        geminiServiceInstance = new GeminiService()
    }
    return geminiServiceInstance
}
