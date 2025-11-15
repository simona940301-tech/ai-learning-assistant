import { NextResponse } from 'next/server'

import { runMcpAction } from '@/lib/services/mcpRegistry'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    if (!body || typeof body.action !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'INVALID_REQUEST' },
        { status: 400 },
      )
    }

    const { action, args } = body
    const result = await runMcpAction(action, args ?? {})

    return NextResponse.json(
      {
        ok: result?.ok ?? false,
        result,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error('MCP core route error', err)
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}


