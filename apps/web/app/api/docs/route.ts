import { NextRequest, NextResponse } from 'next/server'
import { generateOpenAPISpec } from '@/lib/api-docs'

/**
 * GET /api/docs
 * 
 * 返回 OpenAPI 規範（Swagger）
 */
export async function GET(req: NextRequest) {
  const spec = generateOpenAPISpec()
  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

