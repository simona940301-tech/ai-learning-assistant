import { NextRequest } from 'next/server'
import { z } from 'zod'
import { SummarySheetResponseSchema } from '@/lib/summary/types'
import { SummaryService } from '@/lib/services/summary-service'
import { Api } from '@/lib/api/response'
import { ApiErrorCode } from '@/lib/types/api'

const RequestSchema = z.object({
  source: z.enum(['backpack', 'upload']).default('upload'),
  content: z.string().min(1, '需要提供要統整的內容'),
  pdfMeta: z
    .object({
      title: z.string().optional(),
      totalPages: z.number().optional(),
      fileId: z.string().optional(),
    })
    .optional(),
})

const summaryService = new SummaryService()

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const json = await req.json()
    const payload = RequestSchema.parse(json)

    // 使用真實的 summary pipeline
    const result = await summaryService.generateSummary({
      content: payload.content,
      source: payload.source,
      pdfMeta: payload.pdfMeta,
    })

    // 驗證生成的總結結構
    const summarySheet = SummarySheetResponseSchema.parse(result.summarySheet)

    return Api.success({
      summarySheet,
    }, {
      ...result.meta,
      totalElapsedMs: Date.now() - startTime,
    })
  } catch (error) {
    console.error('[api/summary] Failed to generate summary sheet', error)

    // 錯誤處理
    // 錯誤處理
    if (error instanceof Error && error.message === 'SUMMARY_GENERATION_FAILED') {
      return Api.customError(
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        '總結生成失敗，請檢查內容或稍後再試'
      )
    }

    return Api.badRequest(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}
