export async function schedule_srs_item(args: {
  userId: string
  itemId: string
  nextReview: string
}): Promise<{ ok: boolean; scheduleId?: string; error?: string }> {
  try {
    return {
      ok: false,
      error: 'NOT_IMPLEMENTED_YET:schedule_srs_item',
    }
  } catch (err) {
    console.error('MCP:schedule_srs_item', err)
    return { ok: false, error: 'FAILED_SCHEDULE_SRS_ITEM' }
  }
}

export async function fetch_srs_due_items(args: {
  userId: string
  now: string
}): Promise<{ ok: boolean; items?: unknown[]; error?: string }> {
  try {
    return {
      ok: false,
      error: 'NOT_IMPLEMENTED_YET:fetch_srs_due_items:NO_SRS_SERVICE',
    }
  } catch (err) {
    console.error('MCP:fetch_srs_due_items', err)
    return { ok: false, error: 'FAILED_FETCH_SRS_DUE_ITEMS' }
  }
}


