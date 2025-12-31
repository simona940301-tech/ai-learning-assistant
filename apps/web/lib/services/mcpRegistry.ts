import { get_global_ask_context } from './mcp/ask'
import {
  get_scoped_context,
  init_backpack_file_upload,
  retrieve_doc_chunks,
} from './mcp/backpack'
import {
  run_explain_stage,
  finalize_explain_card,
  log_explain_event,
} from './mcp/explain'
import { create_wrongbook_entry } from './mcp/wrongbook'
import { schedule_srs_item, fetch_srs_due_items } from './mcp/srs'
import { create_ready_score_snapshot } from './mcp/score'
import { generate_parents_weekly } from './mcp/parents'

type McpActionArgs = Record<string, unknown>
type McpActionResult = { ok: boolean; [key: string]: unknown }
type McpActionHandler = (args: any) => Promise<McpActionResult>

const mcpActions: Record<string, McpActionHandler> = {
  get_global_ask_context,
  run_explain_stage,
  get_scoped_context,
  init_backpack_file_upload,
  retrieve_doc_chunks,
  finalize_explain_card,
  log_explain_event,
  create_wrongbook_entry,
  schedule_srs_item,
  fetch_srs_due_items,
  create_ready_score_snapshot,
  generate_parents_weekly,
}

export async function runMcpAction(action: string, args: McpActionArgs) {
  const handler = mcpActions[action]

  if (!handler) {
    return {
      ok: false,
      error: `UNKNOWN_ACTION:${action}`,
    }
  }

  return handler(args)
}

