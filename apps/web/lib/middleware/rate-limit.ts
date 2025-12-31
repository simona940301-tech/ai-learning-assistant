/**
 * Rate Limiting Middleware
 * 
 * 使用 Redis 實現分佈式速率限制
 * 基於 Token Bucket 算法
 * 
 * 環境變數：
 * - RATE_LIMIT_ENABLED: 是否啟用速率限制（默認：true）
 * - RATE_LIMIT_WINDOW: 時間窗口（秒，默認：60）
 * - RATE_LIMIT_MAX_REQUESTS: 最大請求數（默認：100）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient, ensureRedisConnected } from '@/lib/redis'

export interface RateLimitConfig {
  window: number // 時間窗口（秒）
  maxRequests: number // 最大請求數
  keyPrefix?: string // Redis key 前綴
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset: number // Unix timestamp
  retryAfter?: number // 秒
}

const DEFAULT_CONFIG: RateLimitConfig = {
  window: parseInt(process.env.RATE_LIMIT_WINDOW || '60', 10),
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  keyPrefix: 'ratelimit',
}

/**
 * 速率限制檢查
 */
export async function checkRateLimit(
  req: NextRequest,
  userId: string,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const enabled = process.env.RATE_LIMIT_ENABLED !== 'false'

  if (!enabled) {
    return {
      allowed: true,
      remaining: finalConfig.maxRequests,
      reset: Date.now() + finalConfig.window * 1000,
    }
  }

  const client = getRedisClient()
  if (!client || !(await ensureRedisConnected())) {
    // Redis 不可用時，允許請求（降級）
    console.warn('[Rate Limit] Redis unavailable, allowing request')
    return {
      allowed: true,
      remaining: finalConfig.maxRequests,
      reset: Date.now() + finalConfig.window * 1000,
    }
  }

  try {
    const key = `${finalConfig.keyPrefix}:${userId}:${Math.floor(Date.now() / 1000 / finalConfig.window)}`
    
    // 獲取當前計數
    const current = await client.get(key)
    const count = current ? parseInt(current, 10) : 0

    if (count >= finalConfig.maxRequests) {
      // 超過限制
      const reset = (Math.floor(Date.now() / 1000 / finalConfig.window) + 1) * finalConfig.window * 1000
      const retryAfter = Math.ceil((reset - Date.now()) / 1000)

      return {
        allowed: false,
        remaining: 0,
        reset,
        retryAfter,
      }
    }

    // 增加計數
    const newCount = count + 1
    await client.setEx(key, finalConfig.window, newCount.toString())

    const reset = (Math.floor(Date.now() / 1000 / finalConfig.window) + 1) * finalConfig.window * 1000

    return {
      allowed: true,
      remaining: finalConfig.maxRequests - newCount,
      reset,
    }
  } catch (error) {
    console.error('[Rate Limit] Error:', error)
    // 錯誤時允許請求（降級）
    return {
      allowed: true,
      remaining: finalConfig.maxRequests,
      reset: Date.now() + finalConfig.window * 1000,
    }
  }
}

/**
 * 速率限制中間件
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<RateLimitConfig>
) {
  return async (req: NextRequest) => {
    // 獲取用戶 ID（從認證或 IP）
    const userId = req.headers.get('x-user-id') || 
                   req.ip || 
                   'anonymous'

    const result = await checkRateLimit(req, userId, config)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: '請求過於頻繁，請稍後再試',
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': (config?.maxRequests || DEFAULT_CONFIG.maxRequests).toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': result.retryAfter?.toString() || '60',
          },
        }
      )
    }

    // 添加速率限制頭部
    const response = await handler(req)
    response.headers.set('X-RateLimit-Limit', (config?.maxRequests || DEFAULT_CONFIG.maxRequests).toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', result.reset.toString())

    return response
  }
}

