import { NextRequest } from 'next/server'
import { getSupabaseClient, isMockModeEnabled } from '@/lib/api/auth'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { Api } from '@/lib/api/response'

/**
 * GET /api/health
 *
 * 健康檢查端點
 *
 * @returns 統一格式的 API 回應
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {}

  // 檢查 Supabase 連接 (在 mock 模式下跳過)
  if (isMockModeEnabled()) {
    checks.database = { status: 'ok', message: 'Mock mode enabled - database check skipped' }
  } else {
    try {
      const supabase = getSupabaseClient(req)
      const { error } = await supabase.from('profiles').select('id').limit(1)
      checks.database = error ? { status: 'error', message: error.message } : { status: 'ok' }
    } catch (error) {
      checks.database = { status: 'error', message: 'Database connection failed' }
    }
  }

  // 檢查 Redis 連接
  try {
    const { ensureRedisConnected } = await import('@/lib/redis')
    const connected = await ensureRedisConnected()
    checks.redis = connected ? { status: 'ok' } : { status: 'error', message: 'Redis unavailable' }
  } catch (error) {
    checks.redis = { status: 'error', message: 'Redis connection failed' }
  }

  const allHealthy = Object.values(checks).every((check) => check.status === 'ok')

  // ✨ 使用統一的 API 回應格式
  if (allHealthy) {
    return Api.success(
      {
        status: 'healthy',
        checks
      },
      Api.withTimestamp()
    )
  } else {
    // 服務降級，但仍返回 200 (健康檢查不應該 503，因為服務仍在運行)
    return Api.success(
      {
        status: 'degraded',
        checks
      },
      Api.withTimestamp()
    )
  }
})
