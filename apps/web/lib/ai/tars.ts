/**
 * TARS: Type-Agnostic Recognition System
 * Detects question type from input text
 */
import { chatCompletionJSON } from '@/lib/openai'
import type { ExplainKind } from '@/lib/types'

interface TARSResult {
  kind: ExplainKind
  confidence: number
  signals: string[]
}

export async function runTARS(inputText: string): Promise<TARSResult | null> {
  if (!inputText || inputText.trim().length === 0) {
    return { kind: 'vocab', confidence: 0.5, signals: ['empty_input'] }
  }

  const prompt = `分析以下英文題目，判斷題型。僅輸出 JSON：

題目：${inputText.substring(0, 2000)}

類型選項：
- vocab: 單字/詞彙選擇（單句+選項，如 "He raised an interesting ( ) ... (A) notion (B) candidate"）
- fill-in-cloze: 文意選填（文章含編號空格 (1)(2)...，選項為詞/片語）
- sentence-completion: 句子完成（單句+選項，選項為完整句子）
- discourse: 篇章結構（文章含編號空格，選項為完整段落/句子）
- reading: 閱讀理解（長文章+問題，無編號空格）
- translation: 翻譯題（中翻英/英翻中）
- essay: 作文題（要求寫作段落或短文）
- hybrid: 混合題型（包含多種題型特徵）

格式：
{
  "kind": "vocab",
  "confidence": 0.9,
  "signals": ["has_single_blank", "word_options", "short_passage"]
}

Output JSON only:`

  try {
    const result = await chatCompletionJSON<{
      kind: string
      confidence: number
      signals: string[]
    }>(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        responseFormat: undefined,
      }
    )

    const kind = (result.kind || 'vocab') as ExplainKind
    const validKinds: ExplainKind[] = [
      'vocab',
      'fill-in-cloze',
      'sentence-completion',
      'discourse',
      'reading',
      'translation',
      'essay',
      'hybrid',
    ]

    if (!validKinds.includes(kind)) {
      return { kind: 'vocab', confidence: 0.5, signals: ['invalid_kind_fallback'] }
    }

    return {
      kind,
      confidence: Math.max(0, Math.min(1, result.confidence || 0.7)),
      signals: Array.isArray(result.signals) ? result.signals : [],
    }
  } catch (error) {
    console.error('[TARS] Detection failed:', error)
    return { kind: 'vocab', confidence: 0.3, signals: ['error_fallback'] }
  }
}
