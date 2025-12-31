import type { UniversalExplainResult } from '@/lib/ai/universal-explainer'
import { formatExplainResult } from './formatters'
import { save_backpack_note } from './backpackNotes'

export async function run_explain_stage(args: {
  cardId: string
  stage: string
  payload?: unknown
  mode?: 'fast' | 'deep'
  family?: string
}): Promise<{ ok: boolean; status?: string; delta?: unknown; error?: string }> {
  try {
    // 將 payload 轉換成題目文字（支援多種格式）
    let inputText = ''
    if (typeof args.payload === 'string') {
      inputText = args.payload
    } else if (args.payload && typeof args.payload === 'object') {
      // 支援 payload.text 或 payload.question 等格式
      const payload = args.payload as any
      inputText = payload.text || payload.question || payload.content || JSON.stringify(payload)
    }

    if (!inputText || inputText.trim().length === 0) {
      return {
        ok: false,
        error: 'INVALID_PAYLOAD: payload must contain text/question/content or be a string'
      }
    }

    // MCP: added helper (non-breaking) - 呼叫現有 universalExplainer pipeline
    const { universalExplainer } = await import('@/lib/ai/universal-explainer')
    const result = await universalExplainer(inputText)

    // 根據 pipeline 結果決定 status
    let status = 'ok'
    if (result.status === 'raw' || result.status === 'minimal') {
      status = 'partial'
    } else if (!result.markdown) {
      status = 'error'
    }

    return {
      ok: true,
      status,
      delta: result, // 直接傳回完整的 UniversalExplainResult，讓上游 agent 自己解析
    }
  } catch (err) {
    console.error('MCP:run_explain_stage', err)
    return {
      ok: false,
      error: `FAILED_RUN_EXPLAIN_STAGE: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
  }
}

export async function finalize_explain_card(args: {
  cardId: string
  outputs: {
    explainResult: UniversalExplainResult
    userId: string  // 必填：service layer 需要知道是哪個用戶
    payload?: {
      text?: string
      source?: 'ask' | 'backpack' | 'unknown'
    }
  }
}): Promise<{
  ok: boolean
  id?: string
  error?: string
  target?: string
}> {
  try {
    console.log('[finalize_explain_card] Starting', {
      cardId: args.cardId,
      hasExplainResult: !!args.outputs?.explainResult,
      questionId: (args.outputs as any)?.questionId,
      userId: args.outputs?.userId,
      source: args.outputs?.payload?.source
    })

    // 1. 驗證輸入
    if (!args.outputs?.explainResult) {
      console.error('[finalize_explain_card] Missing explainResult')
      return { ok: false, error: 'INVALID_INPUT: explainResult required' }
    }

    if (!args.outputs.userId) {
      console.error('[finalize_explain_card] Missing userId')
      return { ok: false, error: 'INVALID_INPUT: userId required' }
    }

    // 2. 格式化詳解結果
    const formattedExplain = formatExplainResult(args.outputs.explainResult)
    console.log('[finalize_explain_card] Formatted result', {
      title: formattedExplain.title,
      markdownLength: formattedExplain.markdown.length,
      metadata: formattedExplain.metadata
    })

    // 簡化：統一存到 backpack_notes（ask page 的所有內容都存筆記本）
    const source = args.outputs.payload?.source || 'ask'
    console.log('[finalize_explain_card] Saving to backpack_notes', { source })

    const result = await save_backpack_note({
      userId: args.outputs.userId,
      formattedExplain,
      source: args.outputs.payload?.source,
      originalPayload: args.outputs.payload
    })

    if (result.ok) {
      console.log('[finalize_explain_card] Successfully saved to backpack_notes', { id: result.id })
      
      // P1-E: Send NOTE_SAVED event to Chick system
      try {
        const { sendNoteSavedAction } = await import('@/lib/chick/action-bus')
        await sendNoteSavedAction({ noteId: result.id })
      } catch (chickError) {
        // Non-blocking: log but don't fail the save operation
        console.warn('[finalize_explain_card] Failed to send NOTE_SAVED event:', chickError)
      }
      
      return { ok: true, target: 'backpack_notes', id: result.id }
    } else {
      console.error('[finalize_explain_card] Failed to save to backpack_notes', result.error)
      return { ok: false, error: `BACKPACK_FAILED: ${result.error}` }
    }
  } catch (err) {
    console.error('[finalize_explain_card] Critical error', err)
    return {
      ok: false,
      error: `FINALIZE_FAILED: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
  }
}

export async function log_explain_event(args: {
  cardId: string
  phase: string
  detail?: unknown
}): Promise<{ ok: boolean; logId?: string; error?: string }> {
  try {
    return {
      ok: false,
      error: 'NOT_IMPLEMENTED_YET:log_explain_event',
    }
  } catch (err) {
    console.error('MCP:log_explain_event', err)
    return { ok: false, error: 'FAILED_LOG_EXPLAIN_EVENT' }
  }
}
