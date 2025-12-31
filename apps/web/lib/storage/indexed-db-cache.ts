/**
 * 🚀 IndexedDB Text Cache - 大型檔案快取服務
 *
 * 功能：
 * - 替代 LocalStorage (10MB 限制)，支援最高 1GB+ 快取
 * - 快取 PDF/圖片文字提取結果
 * - 避免重複 OCR 調用
 * - 7 天 TTL 自動過期
 * - 預期提升: 重複上傳大檔案從 10s → 0.1s (100x)
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface TextCacheDB extends DBSchema {
  'extracted-text': {
    key: string // file hash
    value: {
      text: string
      metadata: {
        fileName: string
        fileSize: number
        fileType: string
        timestamp: number
        method: 'pdf-parse' | 'gemini-ocr' | 'direct'
        version: string
      }
    }
  }
}

export class IndexedDBCache {
  private static readonly DB_NAME = 'summary-cache'
  private static readonly DB_VERSION = 1
  private static readonly STORE_NAME = 'extracted-text'
  private static readonly TTL_MS = 7 * 24 * 3600 * 1000 // 7 days
  private static readonly CACHE_VERSION = 'v1.0'

  private static dbPromise: Promise<IDBPDatabase<TextCacheDB>> | null = null

  /**
   * Initialize IndexedDB connection (lazy)
   */
  private static async getDB(): Promise<IDBPDatabase<TextCacheDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<TextCacheDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create object store if it doesn't exist
          if (!db.objectStoreNames.contains('extracted-text')) {
            const store = db.createObjectStore('extracted-text')
            console.log('[IndexedDB] Object store created:', 'extracted-text')
          }
        },
        blocked() {
          console.warn('[IndexedDB] Database upgrade blocked by another tab')
        },
        blocking() {
          console.warn('[IndexedDB] This tab is blocking a database upgrade')
        },
      })
    }

    return this.dbPromise
  }

  /**
   * 🚀 Compute file hash for cache key (native crypto.subtle)
   * 
   * Uses crypto.subtle.digest (native Web Crypto API):
   * - 10x faster than crypto-js
   * - Non-blocking (async)
   * - No external dependencies
   * - Full file hash for accuracy
   */
  static async computeFileHash(file: File): Promise<string> {
    try {
      // Read entire file as ArrayBuffer
      const buffer = await file.arrayBuffer()

      // Hash with SHA-256 (native Web Crypto API)
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)

      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // Return format: size-hash (ensures uniqueness)
      return `${file.size}-${hashHex.substring(0, 32)}`
    } catch (error) {
      console.error('[IndexedDB] Hash computation failed:', error)
      // Fallback: use filename + size + timestamp
      return `${file.name}-${file.size}-${Date.now()}`
    }
  }

  /**
   * Get cached extracted text
   *
   * Returns null if:
   * - Cache miss
   * - Expired (> 7 days)
   * - Version mismatch
   */
  static async getCachedText(fileHash: string): Promise<string | null> {
    try {
      const db = await this.getDB()
      const cached = await db.get(this.STORE_NAME, fileHash)

      if (!cached) {
        console.log('[IndexedDB] Cache MISS:', fileHash)
        return null
      }

      // Check expiration
      const age = Date.now() - cached.metadata.timestamp
      if (age > this.TTL_MS) {
        console.log('[IndexedDB] Cache EXPIRED:', fileHash, `(age: ${Math.floor(age / 86400000)} days)`)
        // Delete expired entry
        await db.delete(this.STORE_NAME, fileHash)
        return null
      }

      // Check version
      if (cached.metadata.version !== this.CACHE_VERSION) {
        console.log('[IndexedDB] Cache VERSION MISMATCH:', {
          cached: cached.metadata.version,
          current: this.CACHE_VERSION
        })
        await db.delete(this.STORE_NAME, fileHash)
        return null
      }

      console.log('[IndexedDB] Cache HIT:', fileHash, {
        size: cached.text.length,
        method: cached.metadata.method,
        age: `${Math.floor(age / 3600000)}h`
      })

      // Track cache hit analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'indexeddb_cache_hit', {
          file_size: cached.metadata.fileSize,
          method: cached.metadata.method,
          age_hours: Math.floor(age / 3600000)
        })
      }

      return cached.text

    } catch (error) {
      console.error('[IndexedDB] Error getting cached text:', error)
      return null // Non-critical, continue without cache
    }
  }

  /**
   * Cache extracted text
   */
  static async cacheText(
    fileHash: string,
    text: string,
    metadata: {
      fileName: string
      fileSize: number
      fileType: string
      method: 'pdf-parse' | 'gemini-ocr' | 'direct'
    }
  ): Promise<void> {
    try {
      const db = await this.getDB()

      const cacheEntry = {
        text,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          version: this.CACHE_VERSION
        }
      }

      await db.put(this.STORE_NAME, cacheEntry, fileHash)

      console.log('[IndexedDB] Cached text:', fileHash, {
        textLength: text.length,
        method: metadata.method,
        size: `${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB`
      })

      // Track cache write analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'indexeddb_cache_write', {
          file_size: metadata.fileSize,
          text_length: text.length,
          method: metadata.method
        })
      }

    } catch (error) {
      console.error('[IndexedDB] Error caching text:', error)
      // Non-critical, don't throw
    }
  }

  /**
   * Clear expired cache entries (maintenance)
   */
  static async clearExpired(): Promise<number> {
    try {
      const db = await this.getDB()
      const allKeys = await db.getAllKeys(this.STORE_NAME)

      let deletedCount = 0
      const now = Date.now()

      for (const key of allKeys) {
        const entry = await db.get(this.STORE_NAME, key)
        if (entry && now - entry.metadata.timestamp > this.TTL_MS) {
          await db.delete(this.STORE_NAME, key)
          deletedCount++
        }
      }

      console.log('[IndexedDB] Cleared expired entries:', deletedCount)
      return deletedCount

    } catch (error) {
      console.error('[IndexedDB] Error clearing expired entries:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalEntries: number
    totalSize: number
    oldestEntry: number | null
  }> {
    try {
      const db = await this.getDB()
      const allKeys = await db.getAllKeys(this.STORE_NAME)

      let totalSize = 0
      let oldestTimestamp: number | null = null

      for (const key of allKeys) {
        const entry = await db.get(this.STORE_NAME, key)
        if (entry) {
          totalSize += entry.text.length
          if (!oldestTimestamp || entry.metadata.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.metadata.timestamp
          }
        }
      }

      return {
        totalEntries: allKeys.length,
        totalSize,
        oldestEntry: oldestTimestamp
      }

    } catch (error) {
      console.error('[IndexedDB] Error getting stats:', error)
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null
      }
    }
  }

  /**
   * Clear all cache (for debugging)
   */
  static async clearAll(): Promise<void> {
    try {
      const db = await this.getDB()
      await db.clear(this.STORE_NAME)
      console.log('[IndexedDB] All cache cleared')
    } catch (error) {
      console.error('[IndexedDB] Error clearing cache:', error)
    }
  }
}

/**
 * Auto-cleanup on page load (background task)
 */
if (typeof window !== 'undefined') {
  // Run cleanup 5 seconds after page load (non-blocking)
  setTimeout(() => {
    IndexedDBCache.clearExpired().catch((err) => {
      console.warn('[IndexedDB] Auto-cleanup failed (non-critical):', err)
    })
  }, 5000)
}
