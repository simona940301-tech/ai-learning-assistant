import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runExplain } from '@/lib/ai/explain'
import type { ExplainMode } from '@/lib/types'

const Schema = z.object({
  input: z.object({
    text: z.string().optional(),
    imageUrl: z.string().url().optional(),
  }),
  mode: z.enum(['fast', 'deep']),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { input, mode } = Schema.parse(body)

    const vm = await runExplain({ input, mode: mode as ExplainMode })

    return NextResponse.json(vm)
  } catch (error) {
    console.error('[api/explain] error:', error)
    return NextResponse.json(
      {
        kind: 'vocab',
        mode: mode as ExplainMode || 'fast',
        answer: '',
        briefReason: '解析生成失敗，請稍後再試。',
      },
      { status: 500 }
    )
  }
}
