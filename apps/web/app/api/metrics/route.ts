import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler, createErrorResponse, ErrorCodes } from '@/lib/middleware/error-handler'

/**
 * GET /api/metrics
 * 
 * 系統指標端點（用於監控）
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  try {
    const supabase = createClient()

    // 檢查認證（可選，可以設置為公開或需要認證）
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 獲取基本指標
    const [
      totalUsers,
      activeContracts,
      pendingUGC,
      totalMatches,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('contract_escrows')
        .select('id', { count: 'exact', head: true })
        .in('status', ['PENDING', 'LOCKED']),
      supabase
        .from('ugc_questions')
        .select('id', { count: 'exact', head: true })
        .eq('review_status', 'PENDING'),
      supabase
        .from('match_history')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ])

    return NextResponse.json({
      metrics: {
        users: {
          total: totalUsers.count || 0,
        },
        contracts: {
          active: activeContracts.count || 0,
        },
        ugc: {
          pending: pendingUGC.count || 0,
        },
        matches: {
          last24h: totalMatches.count || 0,
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Metrics] Error:', error)
    return createErrorResponse(
      ErrorCodes.INTERNAL_SERVER_ERROR,
      'Failed to fetch metrics',
      500
    )
  }
})

