import { saveBackpackNote } from '@/lib/supabase'
import type { FormattedExplain } from './formatters'

type BackpackNoteResult = { ok: true; id: string } | { ok: false; error: string }

/**
 * 將格式化的詳解結果儲存到 backpack_notes
 */
export async function save_backpack_note(args: {
  userId: string
  formattedExplain: FormattedExplain
  source?: 'ask' | 'backpack' | 'unknown'
  originalPayload?: unknown
}): Promise<BackpackNoteResult> {
  try {
    if (!args.userId || !args.formattedExplain) {
      return { ok: false, error: 'INVALID_INPUT:save_backpack_note' }
    }

    // 從 payload 提取題目資訊
    const question = extractQuestionFromPayload(args.originalPayload) ||
                    args.formattedExplain.title

    // 確定技能分類
    const canonical_skill = determineSkill(args.formattedExplain, args.source)

    // 優化 folder 命名：避免與 error_book 表混淆
    const folder = determineFolder(args.source)

    // 建構完整的 markdown 筆記
    const note_md = buildCompleteNote(args.formattedExplain)

    // 呼叫現有的 saveBackpackNote helper，並處理其返回類型
    const result = await saveBackpackNote({
      user_id: args.userId,
      question,
      canonical_skill,
      note_md,
      folder,
      created_at: new Date().toISOString(),
    })

    // 確保返回類型對齊：saveBackpackNote 應該返回 { id: string }
    if (!result || !result.id) {
      console.error('MCP:save_backpack_note:invalid_result', result)
      return { ok: false, error: 'FAILED_SAVE_BACKPACK_NOTE_RESULT' }
    }

    return { ok: true, id: result.id }
  } catch (err) {
    console.error('MCP:save_backpack_note', err)
    return { ok: false, error: 'FAILED_SAVE_BACKPACK_NOTE' }
  }
}

function extractQuestionFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null

  const p = payload as any
  return p.text || p.question || p.stem || null
}

function determineSkill(formatted: FormattedExplain, source?: string): string {
  // 優先使用 metadata 中的 subject
  if (formatted.metadata.subject) return formatted.metadata.subject

  // 根據 source 確定技能分類
  if (source === 'ask') return '智能問答'
  if (source === 'backpack') return '知識筆記'
  return '題目解析'
}

function determineFolder(source?: string): string {
  // 優化 folder 命名：避免與 error_book 表混淆
  switch (source) {
    case 'ask':
      return 'ask_explanations'
    case 'backpack':
      return 'backpack'
    default:
      return 'notes'
  }
}

function buildCompleteNote(formatted: FormattedExplain): string {
  let note = `# ${formatted.title}\n\n`
  note += `## 題目資訊\n`
  note += `- 題目數量: ${formatted.metadata.questionCount}\n`
  note += `- 包含長篇文章: ${formatted.metadata.hasSharedPassage ? '是' : '否'}\n`
  if (formatted.metadata.subject) {
    note += `- 科目: ${formatted.metadata.subject}\n`
  }
  note += '\n---\n\n'
  note += formatted.markdown

  // TODO: 若 future schema 有 backpack_item_id 欄位，可以把 originalPayload.backpackItemId 傳下去
  // 這樣可以從詳解筆記點回原始檔案/片段位置

  return note
}
