import { chatCompletionJSON } from '@/lib/gemini'
import { safeText } from '@/lib/safe-text'
import type { SummarySheetResponse } from '@/lib/summary/types'
import { summaryPromptV1 } from '@/lib/prompts'

export interface SummaryPipelineRequest {
  content: string
  source: 'backpack' | 'upload'
  pdfMeta?: {
    title?: string
    totalPages?: number
    fileId?: string
  }
}

/**
 * Summary Pipeline
 *
 * 使用 AI 生成結構化的總結表，包含五段式內容和快閃卡
 */
export async function runSummaryPipeline(request: SummaryPipelineRequest): Promise<SummarySheetResponse> {
  const { content, pdfMeta } = request
  const startTime = Date.now()

  try {
    // 準備 prompt
    const prompt = summaryPromptV1({
      content: safeText(content, ''),
      pdfMeta,
    })

    // 調用 AI 生成總結
    const result = await chatCompletionJSON<SummarySheetResponse>(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-4o-mini',
        temperature: 0.1, // 適中的創造性
        maxOutputTokens: 3000, // 足夠處理複雜總結
        responseFormat: { type: 'json_object' },
      }
    )

    const elapsedMs = Date.now() - startTime
    console.log('[SummaryPipeline] Generated summary in', elapsedMs, 'ms')

    // 驗證結果結構
    if (!result.executive_summary || !result.why || !result.what || !result.how || !result.check) {
      throw new Error('Invalid summary structure: missing required sections')
    }

    return result
  } catch (error) {
    console.error('[SummaryPipeline] Failed to generate summary:', error)
    throw new Error(`Summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}





