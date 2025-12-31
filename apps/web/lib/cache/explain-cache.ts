import { createClient, type RedisClientType } from 'redis'
import { createHash } from 'crypto'

// Redis 客戶端（單例模式）
let redisClient: RedisClientType | null = null

function getRedisClient(): RedisClientType | null {
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
    const isUpstash = redisUrl.includes('upstash.io')

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) return new Error('Max retries reached')
          return Math.min(retries * 50, 2000)
        },
        ...(isUpstash && {
          tls: true,
        }),
      },
    })

    redisClient.on('error', (err) => {
      console.error('[ExplainCache] Redis error:', err)
    })

    // Connect to Redis
    redisClient.connect().catch((err) => {
      console.error('[ExplainCache] Failed to connect:', err)
      redisClient = null
    })

    return redisClient
  } catch (error) {
    console.error('[ExplainCache] Failed to initialize Redis:', error)
    return null
  }
}

/**
 * 文字清洗與正規化：移除客套話、多餘空白、明顯雜訊
 */
function normalizeQuestionText(text: string): string {
  let cleaned = text.trim()
  
  // 移除常見的客套話前綴
  const politePrefixes = [
    /^請幫我(詳解|解釋|解題|解答|說明)(這|一|這道|這題|此)/i,
    /^幫我(詳解|解釋|解題|解答|說明)(這|一|這道|這題|此)/i,
    /^可以(幫我|請)(詳解|解釋|解題|解答|說明)(這|一|這道|這題|此)/i,
    /^麻煩(幫我|請)(詳解|解釋|解題|解答|說明)(這|一|這道|這題|此)/i,
    /^能否(幫我|請)(詳解|解釋|解題|解答|說明)(這|一|這道|這題|此)/i,
  ]
  
  for (const prefix of politePrefixes) {
    cleaned = cleaned.replace(prefix, '').trim()
  }
  
  // 移除對話上下文標記
  if (cleaned.includes('【對話上下文】')) {
    const currentQuestionMatch = cleaned.match(/【當前問題】\s*\n([\s\S]+)/)
    if (currentQuestionMatch && currentQuestionMatch[1]) {
      cleaned = currentQuestionMatch[1].trim()
    }
  }
  
  // 移除 Q: / A: 格式的上下文，只保留最後的問題
  if (cleaned.includes('Q:') || cleaned.includes('A:')) {
    const lines = cleaned.split('\n')
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('Q:')) {
        cleaned = lines[i].replace(/^Q:\s*/, '').trim()
        break
      }
    }
  }
  
  // 移除教學提示標記
  cleaned = cleaned.replace(/\[教學提示[：:][^\]]+\]/g, '').trim()
  cleaned = cleaned.replace(/\[請用不同的角度[^\]]+\]/g, '').trim()
  
  // 正規化空白：多個空白/換行變成單一空白，但保留選項格式
  cleaned = cleaned.replace(/\s{2,}/g, ' ')
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  
  return cleaned
}

/**
 * 從題目文字中提取 stem（題幹）和 options（選項）
 * 返回格式：{ stem: string, options: string[] } 或 null
 */
function extractStemAndOptions(text: string): { stem: string; options: string[] } | null {
  const normalized = normalizeQuestionText(text)
  
  // 嘗試匹配選項格式：(A) ... (B) ... (C) ... (D) ...
  // 支援多種格式：(A)、（A）、A.、A)
  const optionPatterns = [
    /\(([A-E])\)\s*([^\n(]+)/g,  // (A) text
    /（([A-E])）\s*([^\n(]+)/g,  // （A）text
    /([A-E])\.\s*([^\n]+)/g,     // A. text
    /([A-E])\)\s*([^\n]+)/g,     // A) text
  ]
  
  const options: Array<{ key: string; text: string }> = []
  let lastMatchEnd = 0
  
  for (const pattern of optionPatterns) {
    const matches = Array.from(normalized.matchAll(pattern))
    if (matches.length >= 2) {
      // 找到至少 2 個選項，認為這是有效的選項格式
      for (const match of matches) {
        const key = match[1].toUpperCase()
        const text = match[2].trim()
        if (text.length > 0) {
          options.push({ key, text })
          lastMatchEnd = Math.max(lastMatchEnd, (match.index || 0) + match[0].length)
        }
      }
      break // 使用第一個匹配成功的格式
    }
  }
  
  if (options.length >= 2) {
    // 提取 stem：選項之前的所有文字
    const stemEnd = normalized.substring(0, lastMatchEnd).lastIndexOf(options[0].key)
    const stem = stemEnd > 0 
      ? normalized.substring(0, stemEnd).trim()
      : normalized.substring(0, normalized.indexOf(`(${options[0].key})`)).trim()
    
    return {
      stem: stem || normalized.substring(0, lastMatchEnd).trim(),
      options: options.map(o => `${o.key}:${o.text}`).sort(), // 排序確保一致性
    }
  }
  
  return null
}

/**
 * 生成緩存 key
 * 
 * 策略：
 * 1. 如果有 questionId，優先用 qid:{questionId}
 * 2. 如果沒有，先清洗文字，然後嘗試提取 stem + options
 * 3. 對整理後的內容做 hash
 */
export function getCacheKey(
  inputText: string,
  questionId?: string | null
): string {
  // 優先使用 questionId
  if (questionId && questionId.trim()) {
    return `explain:qid:${questionId.trim()}`
  }
  
  // 清洗文字
  const cleaned = normalizeQuestionText(inputText)
  
  // 嘗試提取 stem + options
  const extracted = extractStemAndOptions(cleaned)
  
  let cacheContent: string
  if (extracted && extracted.stem.length > 0) {
    // 使用 stem + options 作為緩存內容
    cacheContent = `${extracted.stem}|${extracted.options.join('|')}`
  } else {
    // 沒有找到選項，使用清洗後的完整文字
    cacheContent = cleaned
  }
  
  // 如果內容為空，使用原始文字（避免 hash 衝突）
  if (!cacheContent || cacheContent.trim().length === 0) {
    cacheContent = inputText.trim()
  }
  
  const hash = createHash('sha256').update(cacheContent).digest('hex')
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
  inputText: string,
  questionId?: string | null
): Promise<CachedExplainResult | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const key = getCacheKey(inputText, questionId)
    const cached = await client.get(key)
    
    if (cached) {
      const parsed = JSON.parse(cached) as CachedExplainResult
      console.log('[ExplainCache] ✅ Cache hit', { 
        key: key.substring(0, 32) + '...',
        hasQuestionId: !!questionId,
      })
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
  result: CachedExplainResult,
  questionId?: string | null
): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    const key = getCacheKey(inputText, questionId)
    await client.setEx(key, CACHE_TTL, JSON.stringify(result))
    console.log('[ExplainCache] ✅ Cache set', { 
      key: key.substring(0, 32) + '...',
      hasQuestionId: !!questionId,
    })
  } catch (error) {
    console.error('[ExplainCache] Failed to set cache:', error)
  }
}

/**
 * 清除特定題目的緩存（可選）
 */
export async function clearCachedExplanation(
  inputText: string,
  questionId?: string | null
): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    const key = getCacheKey(inputText, questionId)
    await client.del(key)
  } catch (error) {
    console.error('[ExplainCache] Failed to clear cache:', error)
  }
}
