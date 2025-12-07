/**
 * Edge-compatible RAG Embedding Cache
 * 
 * ⚡ Edge Runtime 專用版本
 * - 使用 Web Crypto API（替代 Node.js crypto）
 * - 支援 Upstash Redis（Edge-compatible）
 * - 優雅降級：如果 Redis 不可用，只使用 Memory Cache
 * 
 * Target: < 50ms retrieval for cached embeddings
 */

import { LRUCache } from 'lru-cache'

// L1: Memory cache for embeddings (500 items, 30 min TTL)
const embeddingCache = new LRUCache<string, number[]>({
    max: 500,
    ttl: 1000 * 60 * 30, // 30 minutes
    updateAgeOnGet: true,
})

// Lazy load Upstash Redis (Edge-compatible)
let upstashRedis: any = null
let redisInitialized = false

/**
 * Initialize Upstash Redis client (lazy, Edge-compatible)
 */
async function getUpstashRedis() {
    if (redisInitialized) {
        return upstashRedis
    }

    redisInitialized = true

    // Check if Upstash Redis is configured
    const upstashRedisUrl = process.env.UPSTASH_REDIS_REST_URL
    const upstashRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!upstashRedisUrl || !upstashRedisToken) {
        console.log('[Embedding Cache Edge] Upstash Redis not configured, using memory cache only')
        return null
    }

    try {
        // Dynamic import to avoid bundling in Edge Runtime if not needed
        const { Redis } = await import('@upstash/redis')
        upstashRedis = new Redis({
            url: upstashRedisUrl,
            token: upstashRedisToken,
        })
        console.log('[Embedding Cache Edge] Upstash Redis initialized')
        return upstashRedis
    } catch (error) {
        console.warn('[Embedding Cache Edge] Failed to initialize Upstash Redis:', error)
        return null
    }
}

/**
 * Generate cache key from text using Web Crypto API (Edge-compatible)
 */
async function getEmbeddingCacheKey(text: string): Promise<string> {
    // Use Web Crypto API (available in Edge Runtime)
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return `embedding:${hashHex.substring(0, 16)}`
}

/**
 * Get cached embedding (Edge-compatible)
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
    const cacheKey = await getEmbeddingCacheKey(text)

    // L1: Check memory cache
    const memResult = embeddingCache.get(cacheKey)
    if (memResult) {
        console.log(`[Embedding Cache Edge] ✅ Memory hit`)
        return memResult
    }

    // L2: Check Upstash Redis (Edge-compatible)
    const redis = await getUpstashRedis()
    if (redis) {
        try {
            const redisResult = await redis.get(cacheKey)
            if (redisResult) {
                const parsed = Array.isArray(redisResult) ? redisResult : JSON.parse(redisResult as string)
                console.log(`[Embedding Cache Edge] ✅ Redis hit`)
                // Populate memory cache
                embeddingCache.set(cacheKey, parsed)
                return parsed
            }
        } catch (error) {
            console.error('[Embedding Cache Edge] Redis read error:', error)
        }
    }

    console.log(`[Embedding Cache Edge] ❌ Cache miss`)
    return null
}

/**
 * Set cached embedding (Edge-compatible)
 */
export async function setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
    const cacheKey = await getEmbeddingCacheKey(text)

    // Write to memory cache
    embeddingCache.set(cacheKey, embedding)

    // Write to Upstash Redis (24 hour TTL)
    const redis = await getUpstashRedis()
    if (redis) {
        try {
            await redis.set(cacheKey, embedding, { ex: 86400 }) // 24 hours
            console.log(`[Embedding Cache Edge] ✅ Cached to Redis`)
        } catch (error) {
            console.error('[Embedding Cache Edge] Redis write error:', error)
        }
    }
}

/**
 * Get cache statistics
 */
export async function getEmbeddingCacheStats() {
    const redis = await getUpstashRedis()
    return {
        memorySize: embeddingCache.size,
        memoryMax: embeddingCache.max,
        redisEnabled: !!redis
    }
}





















