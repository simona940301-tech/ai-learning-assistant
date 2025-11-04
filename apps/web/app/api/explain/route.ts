import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runExplain } from '@/lib/ai/explain'
import { runConservativeMode } from '@/lib/ai/conservative'
import type { ExplainMode } from '@/lib/types'

const Schema = z.object({
  input: z.object({
    text: z.string().optional(),
    imageUrl: z.string().url().optional(),
  }),
  mode: z.enum(['fast', 'deep']),
  conservative: z.boolean().optional(), // New: conservative mode flag
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { input, mode, conservative = false } = Schema.parse(body)

    // Conservative mode: self-diagnose and generate structured explanation
    if (conservative) {
      const text = input.text || ''
      const result = await runConservativeMode(text)
      return NextResponse.json({
        mode: 'conservative',
        ...result,
      })
    }

    // Normal TARS+KCE mode
    const vm = await runExplain({ input, mode: mode as ExplainMode })
    return NextResponse.json(vm)
  } catch (error) {
    console.error('[api/explain] error:', error)
    return NextResponse.json(
      {
        kind: 'vocab',
        mode: 'fast',
        answer: '',
        briefReason: '解析生成失敗，請稍後再試。',
      },
      { status: 500 }
    )
  }
}
