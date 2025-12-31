/**
 * Redis Client for Play Battle System
 * 
 * 用途：
 * - 精力值快取（daily_energy_count）
 * - ⚠️ 匹配池管理已遷移到 Rust 引擎（P4）
 * - 會話快取（未來擴展）
 * 
 * 環境變數：
 * - REDIS_URL: Redis 連接 URL（例如：redis://localhost:6379）
 *   對於 Upstash Redis：redis://default:token@host:6379（需要 TLS）
 * - REDIS_PASSWORD: Redis 密碼（可選，如果 URL 中已包含則不需要）
 */

import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType | null = null

/**
 * 獲取 Redis 客戶端（單例模式）
 */
export function getRedisClient(): RedisClientType | null {
  if (redisClient) {
    return redisClient
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const redisPassword = process.env.REDIS_PASSWORD

  try {
    // ✅ 支持 Upstash Redis（需要 TLS）
    // Upstash URL 格式：redis://default:token@host:6379
    const isUpstash = redisUrl.includes('upstash.io')

    redisClient = createClient({
      url: redisUrl,
      password: redisPassword,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('[Redis] Max reconnection attempts reached')
            return new Error('Max reconnection attempts reached')
          }
          return Math.min(retries * 100, 3000)
        },
        ...(isUpstash && {
          tls: true,
        }),
      },
    }) as RedisClientType

    redisClient.on('error', (err) => {
      console.error('[Redis] Client error:', err)
    })

    redisClient.on('connect', () => {
      console.log('[Redis] Client connected')
    })

    redisClient.on('disconnect', () => {
      console.warn('[Redis] Client disconnected')
    })

    // 異步連接（不阻塞）
    redisClient.connect().catch((err) => {
      console.error('[Redis] Connection failed:', err)
      redisClient = null
    })

    return redisClient
  } catch (error) {
    console.error('[Redis] Failed to create client:', error)
    return null
  }
}

/**
 * 確保 Redis 客戶端已連接
 */
export async function ensureRedisConnected(): Promise<boolean> {
  const client = getRedisClient()
  if (!client) {
    return false
  }

  try {
    if (!client.isOpen) {
      await client.connect()
    }
    return true
  } catch (error) {
    console.error('[Redis] Connection check failed:', error)
    return false
  }
}

/**
 * 精力值相關操作
 */
export const energyCache = {
  /**
   * 獲取用戶精力值（從 Redis）
   */
  async get(userId: string): Promise<number | null> {
    const client = getRedisClient()
    if (!client) return null

    try {
      await ensureRedisConnected()
      const value = await client.get(`energy:${userId}`)
      return value ? parseInt(value, 10) : null
    } catch (error) {
      console.error('[Redis] Failed to get energy:', error)
      return null
    }
  },

  /**
   * 設置用戶精力值（Redis + PostgreSQL 同步）
   */
  async set(userId: string, count: number): Promise<boolean> {
    const client = getRedisClient()
    if (!client) return false

    try {
      await ensureRedisConnected()
      // 設置過期時間為當天結束（UTC+8，即次日 00:00）
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const ttl = Math.floor((tomorrow.getTime() - now.getTime()) / 1000)

      await client.setEx(`energy:${userId}`, ttl, count.toString())
      return true
    } catch (error) {
      console.error('[Redis] Failed to set energy:', error)
      return false
    }
  },

  /**
   * 原子性減少精力值（DECR）
   */
  async decrement(userId: string): Promise<number | null> {
    const client = getRedisClient()
    if (!client) return null

    try {
      await ensureRedisConnected()
      const newValue = await client.decr(`energy:${userId}`)
      return newValue >= 0 ? newValue : null
    } catch (error) {
      console.error('[Redis] Failed to decrement energy:', error)
      return null
    }
  },
}

/**
 * ⚠️ DEPRECATED: 匹配池相關操作
 * 
 * P4 更新：匹配池邏輯已遷移到 Rust 引擎
 * 此模塊保留僅用於向後兼容，不應在新代碼中使用
 * 
 * @deprecated 請使用 Rust WebSocket 進行匹配
 */
/**
 * Match Pool Logic
 * 
 * ⚠️ Previously handled here, now fully migrated to Rust Game Engine or HTTP stateless logic.
 * This section intentionally left empty to prevent usage of legacy Redis matching.
 */

