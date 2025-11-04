/**
 * KCE: Knowledge-Context Explanation
 * Generates explanation based on detected kind and mode
 */
import { chatCompletionJSON } from '@/lib/openai'
import type { ExplainKind, ExplainMode, ExplainViewModel } from '@/lib/types'

interface KCEParams {
  input: { text?: string; imageUrl?: string }
  kind: ExplainKind
  mode: ExplainMode
}

export async function runKCE(params: KCEParams): Promise<ExplainViewModel> {
  const { input, kind, mode } = params
  const text = input.text || ''

  console.log(`[KCE] mode: ${mode}, kind: ${kind}`)

  if (mode === 'fast') {
    return generateFastExplanation(text, kind)
  } else {
    return generateDeepExplanation(text, kind)
  }
}

async function generateFastExplanation(
  text: string,
  kind: ExplainKind
): Promise<ExplainViewModel> {
  const prompt = `快速解析題目。僅輸出 JSON：

題目：${text.substring(0, 1500)}

格式：
{
  "answer": "答案（如 A/B/C/D 或具體答案）",
  "briefReason": "簡短理由（≤25字中文）"
}

要求：briefReason 必須≤25字，直接說明為何選此答案。Output JSON only:`

  try {
    const result = await chatCompletionJSON<{
      answer: string
      briefReason: string
    }>([{ role: 'user', content: prompt }], {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      responseFormat: undefined,
    })

    return {
      kind,
      mode: 'fast',
      answer: result.answer || '',
      briefReason: result.briefReason?.substring(0, 25) || '依據文意判定。',
    }
  } catch (error) {
    console.error('[KCE] Fast generation failed:', error)
    return {
      kind,
      mode: 'fast',
      answer: '',
      briefReason: '依據文意判定。',
    }
  }
}

async function generateDeepExplanation(
  text: string,
  kind: ExplainKind
): Promise<ExplainViewModel> {
  const kindPrompts: Record<ExplainKind, string> = {
    vocab: `單字題詳解。提供：
- cnTranslation: 題幹中譯
- fullExplanation: 完整解析（Markdown格式）
- distractorNotes: 各選項分析 [{option, note}]
- answer: 答案
- briefReason: 簡短理由（≤25字）`,
    'fill-in-cloze': `文意選填詳解。提供：
- cnTranslation: 文章完整中譯
- fullExplanation: 逐空解析（Markdown格式）
- grammarHighlights: 核心語法點（數組）
- answer: 答案
- briefReason: 簡短理由（≤25字）`,
    'sentence-completion': `句子完成詳解。提供：
- cnTranslation: 題幹中譯
- fullExplanation: 完整解析（Markdown格式）
- distractorNotes: 各選項分析
- answer: 答案
- briefReason: 簡短理由（≤25字）`,
    discourse: `篇章結構詳解。提供：
- fullExplanation: 篇章邏輯解析（Markdown格式）
- discourseRole: 語用標籤（轉承/例證/結論等）
- answer: 答案
- briefReason: 簡短理由（≤25字）`,
    reading: `閱讀理解詳解。提供：
- fullExplanation: 完整解析（Markdown格式）
- evidenceBlocks: 關鍵證據句（≤3句，用於高亮）
- answer: 答案
- briefReason: 簡短理由（≤25字）`,
    translation: `翻譯題詳解。提供：
- cnTranslation: 標準中譯
- grammarHighlights: 核心語法點（數組）
- fullExplanation: 翻譯要點（Markdown格式）
- answer: 答案
- briefReason: 簡短理由（≤25字）`,
    essay: `作文題詳解。提供：
- fullExplanation: 寫作建議（Markdown格式）
- answer: 範例答案（可選）
- briefReason: 簡短理由（≤25字）`,
    hybrid: `混合題型詳解。提供：
- fullExplanation: 完整解析（Markdown格式）
- mixAnswerExtra: 非選擇題補充說明
- answer: 答案
- briefReason: 簡短理由（≤25字）`,
  }

  const prompt = `${kindPrompts[kind]}

題目：${text.substring(0, 2000)}

格式（JSON）：
{
  "answer": "...",
  "briefReason": "...",
  "cnTranslation": "...",
  "fullExplanation": "...",
  "distractorNotes": [{"option": "A", "note": "..."}],
  "grammarHighlights": ["..."],
  "evidenceBlocks": ["..."],
  "discourseRole": "...",
  "mixAnswerExtra": "..."
}

注意：僅提供該題型相關欄位。Output JSON only:`

  try {
    const result = await chatCompletionJSON<Partial<ExplainViewModel>>(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        responseFormat: undefined,
      }
    )

    return {
      kind,
      mode: 'deep',
      answer: result.answer || '',
      briefReason: result.briefReason?.substring(0, 25) || '依據文意判定。',
      cnTranslation: result.cnTranslation,
      fullExplanation: result.fullExplanation,
      distractorNotes: result.distractorNotes,
      grammarHighlights: result.grammarHighlights,
      evidenceBlocks: result.evidenceBlocks?.slice(0, 3),
      discourseRole: result.discourseRole,
      mixAnswerExtra: result.mixAnswerExtra,
    }
  } catch (error) {
    console.error('[KCE] Deep generation failed:', error)
    return {
      kind,
      mode: 'deep',
      answer: '',
      briefReason: '依據文意判定。',
    }
  }
}
