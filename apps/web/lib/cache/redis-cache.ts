/**
 * Three-tier caching system for RAG analysis
 * L1: Memory (LRU, 100 items, 10 min TTL)
 * L2: Redis (existing client from lib/redis.ts)
 * L3: Database (permanent)
 */

import { LRUCache } from 'lru-cache'
import { getRedisClient, ensureRedisConnected } from '@/lib/redis'

// L1: Memory cache (100 items, 10 minutes TTL)
const memCache = new LRUCache<string, any>({
    max: 100,
    ttl: 1000 * 60 * 10, // 10 minutes
    updateAgeOnGet: true,
    updateAgeOnHas: false
})

export interface CacheResult<T> {
    data: T | null
    source: 'memory' | 'redis' | 'miss'
}

export interface CachedAnalysis {
    fileId: string
    analysisId: string
    fileName: string
    numPages: number
    status: string
    quickSummary?: string
    detectedSubject?: string
    detectedTopics?: string[]
    structuredNotes?: string
    examPredictions?: any[]
    processingTimeMs?: number
}

/**
 * Get cached analysis by file hash
 */
export async function getCachedAnalysis(
    fileHash: string
): Promise<CacheResult<CachedAnalysis>> {
    const cacheKey = `analysis:${fileHash}`

    // L1: Check memory cache
    const memResult = memCache.get(cacheKey)
    if (memResult) {
        console.log(`[Cache] ✅ Memory hit for ${fileHash.substring(0, 16)}...`)
        return { data: memResult, source: 'memory' }
    }

    // L2: Check Redis cache
    const redis = getRedisClient()
    if (redis) {
        try {
            await ensureRedisConnected()
            const redisResult = await redis.get(cacheKey)
            if (redisResult) {
                const parsed = JSON.parse(redisResult)
                console.log(`[Cache] ✅ Redis hit for ${fileHash.substring(0, 16)}...`)
                // Populate memory cache for faster subsequent access
                memCache.set(cacheKey, parsed)
                return { data: parsed, source: 'redis' }
            }
        } catch (error) {
            console.error('[Cache] Redis read error:', error)
            // Continue to miss - don't fail the request
        }
    }

    console.log(`[Cache] ❌ Cache miss for ${fileHash.substring(0, 16)}...`)
    return { data: null, source: 'miss' }
}

/**
 * Set cached analysis
 */
export async function setCachedAnalysis(
    fileHash: string,
    analysis: CachedAnalysis
): Promise<void> {
    const cacheKey = `analysis:${fileHash}`

    // Write to memory cache
    memCache.set(cacheKey, analysis)
    console.log(`[Cache] ✅ Cached to memory: ${fileHash.substring(0, 16)}...`)

    // Write to Redis cache (1 hour TTL)
    const redis = getRedisClient()
    if (redis) {
        try {
            await ensureRedisConnected()
            await redis.setEx(cacheKey, 3600, JSON.stringify(analysis))
            console.log(`[Cache] ✅ Cached to Redis: ${fileHash.substring(0, 16)}...`)
        } catch (error) {
            console.error('[Cache] Redis write error:', error)
            // Don't fail - memory cache is still working
        }
    }
}

/**
 * Invalidate cache for a specific file hash
 */
export async function invalidateCache(fileHash: string): Promise<void> {
    const cacheKey = `analysis:${fileHash}`

    // Remove from memory
    memCache.delete(cacheKey)

    // Remove from Redis
    const redis = getRedisClient()
    if (redis) {
        try {
            await ensureRedisConnected()
            await redis.del(cacheKey)
            console.log(`[Cache] ✅ Invalidated cache for ${fileHash.substring(0, 16)}...`)
        } catch (error) {
            console.error('[Cache] Redis delete error:', error)
        }
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    return {
        memorySize: memCache.size,
        memoryMax: memCache.max,
        redisEnabled: !!getRedisClient()
    }
}
