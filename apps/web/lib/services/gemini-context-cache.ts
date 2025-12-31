import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

/**
 * Service for managing Gemini Context Cache resources
 * 
 * Context Caching allows us to pre-encode document content and reuse it across multiple queries,
 * significantly improving response time and reducing token costs for repeated queries.
 */
export class GeminiContextCacheService {
    /**
     * Creates a Context Cache from document text
     * 
     * @param text - The document content to cache
     * @param displayName - A human-readable name for the cache
     * @param systemInstruction - Optional system instruction for the cache
     * @returns The cache resource name (cachedContents/ID)
     */
    static async createCache(
        text: string,
        displayName: string,
        systemInstruction?: string
    ): Promise<{ cacheName: string; expiresAt: Date }> {
        try {
            // Access the cache manager (available in newer SDK versions)
            const cacheManager = (genAI as any).cacheManager

            if (!cacheManager) {
                throw new Error('Cache manager not available in current SDK version')
            }

            // Create the cache with the document content
            const cache = await cacheManager.create({
                model: 'models/gemini-1.5-flash-001', // Use flash for cost efficiency
                displayName,
                systemInstruction: systemInstruction || `You are a helpful academic assistant. Answer questions based on the following document content.`,
                contents: [
                    {
                        role: 'user',
                        parts: [{ text }]
                    }
                ],
                ttlSeconds: 3600 // 1 hour TTL (can be adjusted)
            })

            console.log(`[ContextCache] Created cache: ${cache.name}`)
            console.log(`[ContextCache] Expires at: ${cache.expireTime}`)

            return {
                cacheName: cache.name,
                expiresAt: new Date(cache.expireTime)
            }
        } catch (error) {
            console.error('[ContextCache] Failed to create cache:', error)
            throw error
        }
    }

    /**
     * Deletes a Context Cache resource
     * 
     * @param cacheName - The cache resource name to delete (cachedContents/ID)
     */
    static async deleteCache(cacheName: string): Promise<void> {
        try {
            const cacheManager = (genAI as any).cacheManager

            if (!cacheManager) {
                console.warn('[ContextCache] Cache manager not available, skipping deletion')
                return
            }

            await cacheManager.delete(cacheName)
            console.log(`[ContextCache] Deleted cache: ${cacheName}`)
        } catch (error) {
            console.error('[ContextCache] Failed to delete cache:', error)
            throw error
        }
    }

    /**
     * Gets information about a Context Cache
     * 
     * @param cacheName - The cache resource name (cachedContents/ID)
     */
    static async getCache(cacheName: string) {
        try {
            const cacheManager = (genAI as any).cacheManager

            if (!cacheManager) {
                throw new Error('Cache manager not available')
            }

            return await cacheManager.get(cacheName)
        } catch (error) {
            console.error('[ContextCache] Failed to get cache:', error)
            throw error
        }
    }
}
