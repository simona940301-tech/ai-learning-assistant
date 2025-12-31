import { runSummaryPipeline } from '@/lib/ai/summary-pipeline'
import type { SummarySheetResponse } from '@/lib/summary/types'

export interface SummaryRequest {
  content: string
  source: 'backpack' | 'upload'
  pdfMeta?: {
    title?: string
    totalPages?: number
    fileId?: string
  }
}

export interface SummaryResponse {
  summarySheet: SummarySheetResponse
  meta: {
    source: string
    preview?: string
    elapsedMs: number
  }
}

/**
 * Summary Service
 *
 * 負責處理總結生成業務邏輯
 */
export class SummaryService {
  /**
   * 生成總結表
   */
  async generateSummary(request: SummaryRequest, startTime: number = Date.now()): Promise<SummaryResponse> {
    const { content, source, pdfMeta } = request

    try {
      // 調用 summary pipeline
      const summarySheet = await runSummaryPipeline({
        content,
        source,
        pdfMeta,
      })

      const elapsedMs = Date.now() - startTime

      return {
        summarySheet,
        meta: {
          source,
          preview: pdfMeta?.title,
          elapsedMs,
        },
      }
    } catch (error) {
      console.error('[SummaryService] Failed to generate summary:', error)
      throw new Error('SUMMARY_GENERATION_FAILED')
    }
  }
}





