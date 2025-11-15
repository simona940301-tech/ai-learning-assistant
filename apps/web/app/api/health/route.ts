import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler, createErrorResponse, ErrorCodes } from '@/lib/middleware/error-handler'

/**
 * GET /api/health
 * 
 * 健康檢查端點
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {}

  // 檢查 Supabase 連接
  try {
    const supabase = createClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    checks.database = error ? { status: 'error', message: error.message } : { status: 'ok' }
  } catch (error) {
    checks.database = { status: 'error', message: 'Database connection failed' }
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
  const status = allHealthy ? 200 : 503

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
})
