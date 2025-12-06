/**
 * 🚀 Analysis Cache Service - 十倍速度優化核心組件
 *
 * 功能：
 * - 快取 AI 分析結果，避免重複調用 API
 * - 支援多文件組合的唯一指紋識別
 * - TTL: 7 天 (可調整)
 * - 預期提升: 20s → 0.5s (40x for cached analyses)
 */

import { getRedisClient } from '@/lib/redis'
import crypto from 'crypto'

export interface CachedAnalysisResult {
  // 核心分析內容
  summary: string
  subject?: string
  topics?: string[]
  keyConcepts?: Array<{
    concept: string
    explanation: string
    importance: string
    curriculumCode?: string
    sources?: string[]
  }>
  examPrediction?: Array<any>
  sources?: string[]

  // 元數據
  metadata: {
    documentIds: string[]
    cachedAt: string
    version: string // Cache schema version for invalidation
  }
}

export class AnalysisCacheService {
  private static readonly CACHE_VERSION = 'v1.0'
  private static readonly TTL_SECONDS = 7 * 24 * 3600 // 7 days

  /**
   * 生成文件組合的唯一指紋
   *
   * 規則：
   * - 文件 ID 排序後組合 (確保相同組合產生相同 key)
   * - 包含 subject hint (不同科目可能產生不同分析)
   * - SHA-256 hash 確保唯一性
   */
  static generateCacheKey(documentIds: string[], subject?: string): string {
    // 排序 ID 確保相同組合產生相同 key
    const sortedIds = [...documentIds].sort()
    const payload = JSON.stringify({
      ids: sortedIds,
      subject: subject || 'auto',
      version: this.CACHE_VERSION
    })

    const hash = crypto.createHash('sha256').update(payload).digest('hex')
    return `analysis:${hash.substring(0, 16)}` // 縮短 key (前 16 字元已足夠唯一)
  }

  /**
   * 獲取快取的分析結果
   *
   * 流程：
   * 1. 生成 cache key
   * 2. 從 Redis 查詢
   * 3. 驗證版本號 (schema 變更時自動失效)
   * 4. 返回結果或 null
   */
  static async getCachedAnalysis(
    documentIds: string[],
    subject?: string
  ): Promise<CachedAnalysisResult | null> {
    try {
      const redis = getRedisClient()
      if (!redis) {
        console.log('[AnalysisCache] Redis not available, skipping cache lookup')
        return null
      }

      const cacheKey = this.generateCacheKey(documentIds, subject)
      console.log('[AnalysisCache] 🔍 Looking up:', cacheKey, { documentIds, subject })

      const cached = await redis.get(cacheKey)

      if (cached) {
        console.log('[AnalysisCache] 🎯 Cache HIT:', cacheKey)

        const result: CachedAnalysisResult = JSON.parse(cached)

        // 驗證版本號
        if (result.metadata.version !== this.CACHE_VERSION) {
          console.warn('[AnalysisCache] ⚠️ Cache version mismatch, invalidating:', {
            cached: result.metadata.version,
            current: this.CACHE_VERSION
          })
          // 刪除舊版快取
          await redis.del(cacheKey)
          return null
        }

        // 記錄快取命中 telemetry
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'analysis_cache_hit', {
            document_count: documentIds.length,
            subject: subject || 'auto'
          })
        }

        return result
      }

      console.log('[AnalysisCache] ❌ Cache MISS:', cacheKey)

      // 記錄快取未命中 telemetry
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'analysis_cache_miss', {
          document_count: documentIds.length,
          subject: subject || 'auto'
        })
      }

      return null
    } catch (error) {
      console.error('[AnalysisCache] Error getting cached analysis (non-critical):', error)
      // 快取失敗不影響主流程，返回 null 繼續正常分析
      return null
    }
  }

  /**
   * 快取分析結果
   *
   * 流程：
   * 1. 生成 cache key
   * 2. 添加元數據 (timestamp, version)
   * 3. 寫入 Redis (TTL: 7 days)
   * 4. 記錄 telemetry
   */
  static async cacheAnalysis(
    documentIds: string[],
    analysis: Omit<CachedAnalysisResult, 'metadata'>,
    subject?: string
  ): Promise<void> {
    try {
      const redis = getRedisClient()
      if (!redis) {
        console.log('[AnalysisCache] Redis not available, skipping cache write')
        return
      }

      const cacheKey = this.generateCacheKey(documentIds, subject)

      const cacheData: CachedAnalysisResult = {
        ...analysis,
        metadata: {
          documentIds,
          cachedAt: new Date().toISOString(),
          version: this.CACHE_VERSION
        }
      }

      await redis.setEx(cacheKey, this.TTL_SECONDS, JSON.stringify(cacheData))

      console.log('[AnalysisCache] 💾 Cached analysis:', cacheKey, {
        documentCount: documentIds.length,
        subject: subject || 'auto',
        ttl: `${this.TTL_SECONDS / 86400} days`,
        size: `${JSON.stringify(cacheData).length} bytes`
      })

      // 記錄快取寫入 telemetry
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'analysis_cache_write', {
          document_count: documentIds.length,
          subject: subject || 'auto',
          cache_size: JSON.stringify(cacheData).length
        })
      }
    } catch (error) {
      console.error('[AnalysisCache] Error caching analysis (non-critical):', error)
      // 快取失敗不影響主流程，靜默處理
    }
  }

  /**
   * 手動清除快取 (用於調試或強制重新分析)
   */
  static async clearCache(documentIds: string[], subject?: string): Promise<boolean> {
    try {
      const redis = getRedisClient()
      if (!redis) return false

      const cacheKey = this.generateCacheKey(documentIds, subject)
      const deleted = await redis.del(cacheKey)

      console.log('[AnalysisCache] 🗑️ Cache cleared:', cacheKey, { success: deleted > 0 })
      return deleted > 0
    } catch (error) {
      console.error('[AnalysisCache] Error clearing cache:', error)
      return false
    }
  }

  /**
   * 獲取快取統計資訊 (用於監控)
   */
  static async getCacheStats(): Promise<{
    totalKeys: number
    memoryUsage: string
  } | null> {
    try {
      const redis = getRedisClient()
      if (!redis) return null

      // 獲取所有 analysis: 開頭的 key
      const keys = await redis.keys('analysis:*')

      // 獲取 Redis 記憶體使用情況
      const info = await redis.info('memory')
      const memoryMatch = info.match(/used_memory_human:(.+)/)
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'N/A'

      return {
        totalKeys: keys.length,
        memoryUsage
      }
    } catch (error) {
      console.error('[AnalysisCache] Error getting cache stats:', error)
      return null
    }
  }
}
