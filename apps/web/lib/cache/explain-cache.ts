import Redis from 'ioredis'
import { createHash } from 'crypto'

// Redis 客戶端（單例模式）
let redisClient: Redis | null = null

function getRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ExplainCache] REDIS_URL not configured, caching disabled')
    }
    return null
  }

  if (redisClient) return redisClient

  try {
    // ✅ 支持 Upstash Redis（需要 TLS）
    // Upstash URL 格式：redis://default:token@host:6379
    const isUpstash = redisUrl.includes('upstash.io')
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      // ✅ Upstash 需要 TLS
      ...(isUpstash && {
        tls: {},
      }),
    })

    redisClient.on('error', (err) => {
      console.error('[ExplainCache] Redis error:', err)
    })

    return redisClient
  } catch (error) {
    console.error('[ExplainCache] Failed to initialize Redis:', error)
    return null
  }
}

/**
 * 生成緩存 key（基於題目文本的 hash）
 * ✅ 優化：提取純題目文本，忽略對話上下文
 */
function getCacheKey(inputText: string): string {
  // 提取純題目文本（移除對話上下文）
  let pureQuestion = inputText.trim()
  
  // 如果包含對話上下文標記，只提取當前問題部分
  if (pureQuestion.includes('【對話上下文】')) {
    const currentQuestionMatch = pureQuestion.match(/【當前問題】\s*\n(.+)/s)
    if (currentQuestionMatch && currentQuestionMatch[1]) {
      pureQuestion = currentQuestionMatch[1].trim()
    }
  }
  
  // 如果包含其他上下文格式（Q: / A:），提取最後的問題
  if (pureQuestion.includes('Q:') || pureQuestion.includes('A:')) {
    const lines = pureQuestion.split('\n')
    // 從後往前找最後一個 Q: 開頭的行
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('Q:')) {
        pureQuestion = lines[i].replace(/^Q:\s*/, '').trim()
        break
      }
    }
  }
  
  const hash = createHash('sha256').update(pureQuestion).digest('hex')
  return `explain:${hash}`
}

/**
 * 緩存 TTL（24 小時）
 */
const CACHE_TTL = 24 * 60 * 60 // 秒

export interface CachedExplainResult {
  markdown: string
  structured?: any
  questions?: any
  sharedPassage?: any
  status: string
  meta?: any
}

/**
 * 從緩存獲取詳解結果
 */
export async function getCachedExplanation(
  inputText: string
): Promise<CachedExplainResult | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const key = getCacheKey(inputText)
    const cached = await client.get(key)
    
    if (cached) {
      const parsed = JSON.parse(cached) as CachedExplainResult
      console.log('[ExplainCache] ✅ Cache hit', { key: key.substring(0, 16) + '...' })
      return parsed
    }
    
    return null
  } catch (error) {
    console.error('[ExplainCache] Failed to get cache:', error)
    return null
  }
}

/**
 * 將詳解結果存入緩存
 */
export async function setCachedExplanation(
  inputText: string,
  result: CachedExplainResult
): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    const key = getCacheKey(inputText)
    await client.setex(key, CACHE_TTL, JSON.stringify(result))
    console.log('[ExplainCache] ✅ Cache set', { key: key.substring(0, 16) + '...' })
  } catch (error) {
    console.error('[ExplainCache] Failed to set cache:', error)
  }
}

/**
 * 清除特定題目的緩存（可選）
 */
export async function clearCachedExplanation(inputText: string): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    const key = getCacheKey(inputText)
    await client.del(key)
  } catch (error) {
    console.error('[ExplainCache] Failed to clear cache:', error)
  }
}

