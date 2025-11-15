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
  outputs: unknown
}): Promise<{ ok: boolean; card?: unknown; error?: string }> {
  try {
    return {
      ok: false,
      error: 'NOT_IMPLEMENTED_YET:finalize_explain_card',
    }
  } catch (err) {
    console.error('MCP:finalize_explain_card', err)
    return { ok: false, error: 'FAILED_FINALIZE_EXPLAIN_CARD' }
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


