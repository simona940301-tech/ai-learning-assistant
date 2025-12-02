/**
 * RAG Embedding Cache
 * 
 * Caches embedding vectors for frequently accessed text chunks
 * to reduce embedding API calls and improve RAG retrieval speed.
 * 
 * Target: < 50ms retrieval for cached embeddings
 */

import { LRUCache } from 'lru-cache'
import { getRedisClient, ensureRedisConnected } from '@/lib/redis'
import crypto from 'crypto'

// L1: Memory cache for embeddings (500 items, 30 min TTL)
const embeddingCache = new LRUCache<string, number[]>({
    max: 500,
    ttl: 1000 * 60 * 30, // 30 minutes
    updateAgeOnGet: true,
})

/**
 * Generate cache key from text
 */
function getEmbeddingCacheKey(text: string): string {
    const hash = crypto.createHash('sha256').update(text).digest('hex')
    return `embedding:${hash.substring(0, 16)}`
}

/**
 * Get cached embedding
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
    const cacheKey = getEmbeddingCacheKey(text)

    // L1: Check memory cache
    const memResult = embeddingCache.get(cacheKey)
    if (memResult) {
        console.log(`[Embedding Cache] ✅ Memory hit`)
        return memResult
    }

    // L2: Check Redis cache
    const redis = getRedisClient()
    if (redis) {
        try {
            await ensureRedisConnected()
            const redisResult = await redis.get(cacheKey)
            if (redisResult) {
                const parsed = JSON.parse(redisResult)
                console.log(`[Embedding Cache] ✅ Redis hit`)
                // Populate memory cache
                embeddingCache.set(cacheKey, parsed)
                return parsed
            }
        } catch (error) {
            console.error('[Embedding Cache] Redis read error:', error)
        }
    }

    console.log(`[Embedding Cache] ❌ Cache miss`)
    return null
}

/**
 * Set cached embedding
 */
export async function setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
    const cacheKey = getEmbeddingCacheKey(text)

    // Write to memory cache
    embeddingCache.set(cacheKey, embedding)

    // Write to Redis cache (24 hour TTL)
    const redis = getRedisClient()
    if (redis) {
        try {
            await ensureRedisConnected()
            await redis.setEx(cacheKey, 86400, JSON.stringify(embedding))
            console.log(`[Embedding Cache] ✅ Cached to Redis`)
        } catch (error) {
            console.error('[Embedding Cache] Redis write error:', error)
        }
    }
}

/**
 * Get cache statistics
 */
export function getEmbeddingCacheStats() {
    return {
        memorySize: embeddingCache.size,
        memoryMax: embeddingCache.max,
        redisEnabled: !!getRedisClient()
    }
}
