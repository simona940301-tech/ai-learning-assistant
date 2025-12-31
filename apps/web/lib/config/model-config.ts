/**
 * Centralized Model Configuration for AI Endpoints
 * 
 * Purpose: Single source of truth for model selection across all AI use cases
 * Benefits:
 * - Easy model switching without code changes
 * - Clear documentation of model purposes
 * - Prepared for A/B testing and user tiers
 * - Cost optimization through targeted model selection
 */

export type ModelUseCase =
    | 'router-classify'      // Document classification (fast, low cost)
    | 'analysis-simple'      // Simple document analysis
    | 'analysis-complex'     // Complex/long document analysis
    | 'chat-simple'          // Simple Q&A
    | 'chat-complex'         // Multi-turn deep reasoning
    | 'exam-generation'      // Exam question generation

export interface ModelConfig {
    modelName: string
    temperature: number
    maxTokens?: number
    description: string
    costPer1MTokens: number  // For tracking and analytics
}

/**
 * Model Configuration Registry
 * 
 * Current Strategy: All use Gemini 2.5 Flash for cost efficiency
 * Future: Can upgrade specific use cases to Pro as needed
 */
const MODEL_CONFIGS: Record<ModelUseCase, ModelConfig> = {
    'router-classify': {
        modelName: 'gemini-2.0-flash-exp',
        temperature: 0.1,  // Low for consistent classification
        maxTokens: 500,    // Classification output is small
        description: 'Fast classification for document routing',
        costPer1MTokens: 0.075
    },
    'analysis-simple': {
        modelName: 'gemini-2.0-flash-exp',  // Use 2.0 Flash for analysis
        temperature: 0.3,  // Balanced for factual analysis
        description: 'Standard document analysis',
        costPer1MTokens: 0.075
    },
    'analysis-complex': {
        modelName: 'gemini-1.5-pro-latest',  // ⚡ UPGRADED: Pro for complex analysis
        temperature: 0.5,  // Higher for nuanced analysis
        description: 'Complex multi-document analysis',
        costPer1MTokens: 1.25  // Pro pricing
    },
    'chat-simple': {
        modelName: 'gemini-2.0-flash-exp',
        temperature: 0.7,  // Higher for conversational responses
        description: 'Quick Q&A responses',
        costPer1MTokens: 0.075
    },
    'chat-complex': {
        modelName: 'gemini-2.0-flash-exp',  // Can upgrade to 'gemini-1.5-pro-latest' later
        temperature: 0.8,  // Highest for creative reasoning
        description: 'Deep reasoning and explanations',
        costPer1MTokens: 0.075
    },
    'exam-generation': {
        modelName: 'gemini-1.5-pro-latest',  // ⚡ UPGRADED: Pro for high-quality exam questions
        temperature: 0.6,  // Balanced for creative yet accurate questions
        description: 'Creative exam question generation',
        costPer1MTokens: 1.25  // Pro pricing
    }
}

/**
 * Get model configuration for a specific use case
 */
export function getModelConfig(useCase: ModelUseCase): ModelConfig {
    const config = MODEL_CONFIGS[useCase]
    if (!config) {
        throw new Error(`Unknown model use case: ${useCase}`)
    }
    return config
}

/**
 * Get model parameters formatted for Vercel AI SDK
 */
export function getModelParams(useCase: ModelUseCase) {
    const config = getModelConfig(useCase)
    return {
        model: config.modelName,
        temperature: config.temperature,
        maxTokens: config.maxTokens
    }
}

/**
 * Calculate estimated cost for a request
 * 
 * @param useCase - The use case
 * @param inputTokens - Estimated input tokens
 * @param outputTokens - Estimated output tokens
 * @returns Estimated cost in USD
 */
export function estimateCost(
    useCase: ModelUseCase,
    inputTokens: number,
    outputTokens: number = 0
): number {
    const config = getModelConfig(useCase)
    const inputCost = (inputTokens / 1_000_000) * config.costPer1MTokens
    const outputCost = (outputTokens / 1_000_000) * config.costPer1MTokens * 4  // Output is 4x more expensive
    return inputCost + outputCost
}

/**
 * Future: A/B Testing Support
 * 
 * Example usage:
 * ```typescript
 * const modelName = shouldUseProForUser(userId) 
 *   ? 'gemini-1.5-pro' 
 *   : 'gemini-2.5-flash'
 * ```
 */
export function shouldUseProForUser(userId: string): boolean {
    // Placeholder for future A/B testing logic
    // Could check user tier, random assignment, feature flags, etc.
    return false
}

/**
 * Future: Dynamic Model Selection
 * 
 * Example usage:
 * ```typescript
 * const model = selectModelForComplexity(documentLength, userTier)
 * ```
 */
export function selectModelForComplexity(
    documentLength: number,
    userTier: 'free' | 'premium' = 'free'
): string {
    // Placeholder for future dynamic selection
    // Could consider document length, user tier, time of day, etc.
    if (userTier === 'premium' && documentLength > 100000) {
        return 'gemini-1.5-pro'
    }
    return 'gemini-2.0-flash-exp'
}

