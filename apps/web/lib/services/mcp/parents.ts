export async function generate_parents_weekly(args: {
  userId: string
  range: { from: string; to: string }
}): Promise<{ ok: boolean; reportId?: string; summary?: unknown; error?: string }> {
  try {
    return {
      ok: false,
      error: 'NOT_IMPLEMENTED_YET:generate_parents_weekly',
    }
  } catch (err) {
    console.error('MCP:generate_parents_weekly', err)
    return { ok: false, error: 'FAILED_GENERATE_PARENTS_WEEKLY' }
  }
}


