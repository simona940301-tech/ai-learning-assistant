import { NextRequest, NextResponse } from 'next/server'
import { getHeartbeatReport } from '@/lib/heartbeat'

/**
 * GET /api/heartbeat
 *
 * Returns system health diagnostics in JSON format.
 * Access in browser with ?debug=1 or in dev mode.
 */
export async function GET(request: NextRequest) {
  try {
    const report = await getHeartbeatReport()

    // Return full JSON report
    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Heartbeat generation failed:', error)
    return NextResponse.json(
      {
        error: 'heartbeat_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
