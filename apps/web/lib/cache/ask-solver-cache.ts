import { createHash } from 'crypto'
import { getRedisClient, ensureRedisConnected } from '@/lib/redis'

const CACHE_NAMESPACE = 'ask:solve:v1'
const DEFAULT_CACHE_TTL_SECONDS = 12 * 60 * 60 // 12 小時

export interface AskSolverCachePayload {
  subject: string
  question: string
  explanation: Record<string, unknown>
  routing?: Record<string, unknown>
  meta: Record<string, unknown>
  health?: Record<string, unknown>
  _meta?: {
    latency_ms?: number
    cached?: boolean
  }
}

export function getAskCacheKey(rawQuestion: string): string | null {
  const normalized = rawQuestion.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  const hash = createHash('sha256').update(normalized).digest('hex')
  return `${CACHE_NAMESPACE}:${hash}`
}

export async function readAskCache(questionText: string): Promise<AskSolverCachePayload | null> {
  const key = getAskCacheKey(questionText)
  if (!key) return null

  const client = getRedisClient()
  if (!client) return null

  try {
    await ensureRedisConnected()
    const cached = await client.get(key)
    if (!cached) return null

    const payload = JSON.parse(cached) as AskSolverCachePayload
    console.log('[AskCache] ✅ hit', { key })
    return payload
  } catch (error) {
    console.error('[AskCache] Failed to read cache:', error)
    return null
  }
}

export async function writeAskCache(
  questionText: string,
  payload: AskSolverCachePayload
): Promise<{ key: string; ttl: number } | null> {
  const key = getAskCacheKey(questionText)
  if (!key) return null

  const client = getRedisClient()
  if (!client) return null

  const ttl = Number(process.env.ASK_CACHE_TTL_SECONDS) || DEFAULT_CACHE_TTL_SECONDS

  try {
    await ensureRedisConnected()
    await client.setEx(key, ttl, JSON.stringify(payload))
    console.log('[AskCache] ✅ stored', { key, ttl })
    return { key, ttl }
  } catch (error) {
    console.error('[AskCache] Failed to write cache:', error)
    return null
  }
}
