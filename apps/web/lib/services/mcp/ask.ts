export async function get_global_ask_context(args: {
  userId: string
  prompt: string
  locale?: string
}): Promise<{ ok: boolean; context?: unknown; error?: string }> {
  try {
    // TODO: 將來串接既有 Ask service 以取得上下文資料
    return {
      ok: false,
      error: 'NOT_IMPLEMENTED_YET:get_global_ask_context',
    }
  } catch (err) {
    console.error('MCP:get_global_ask_context', err)
    return { ok: false, error: 'FAILED_GLOBAL_ASK_CONTEXT' }
  }
}


