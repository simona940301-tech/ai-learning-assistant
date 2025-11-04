/**
 * Conservative Mode Detector
 * Self-diagnoses question type without external classification
 */
import { chatCompletionJSON } from '@/lib/openai'
import type { ConservativeQuestionType } from './conservative-types'

export async function detectConservativeType(inputText: string): Promise<ConservativeQuestionType> {
  if (!inputText || inputText.trim().length === 0) {
    return 'E2_CLOZE' // Default fallback
  }

  const prompt = `分析以下英文題目，自行判斷題型。僅輸出 JSON：

題目：${inputText.substring(0, 3000)}

題型判斷規則：
- E1_VOCAB: 題幹是一句話、四個選項是單字或片語
- E2_CLOZE: 一段短文，有 (1)…(5) 空格、每格有四個選項
- E3_FILL_IN_CLOZE: 一篇長文、有 (1)…(8) 空格、底下附字庫 A–H
- E4_READING: 一篇文章，題後附 2–4 題四選題
- E5_DISCOURSE: 一篇長文要插入句子（篇章結構）
- E5_TRANSLATION: 中翻英或英翻中題目
- E6_WRITING: 英文作文題

格式：
{
  "type": "E2_CLOZE"
}

Output JSON only:`

  try {
    const result = await chatCompletionJSON<{ type: string }>(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        responseFormat: undefined,
      }
    )

    const validTypes: ConservativeQuestionType[] = [
      'E1_VOCAB',
      'E2_CLOZE',
      'E3_FILL_IN_CLOZE',
      'E4_READING',
      'E5_DISCOURSE',
      'E5_TRANSLATION',
      'E6_WRITING',
    ]

    const detectedType = (result.type || 'E2_CLOZE') as ConservativeQuestionType
    if (!validTypes.includes(detectedType)) {
      console.warn(`[ConservativeDetector] Invalid type detected: ${detectedType}, defaulting to E2_CLOZE`)
      return 'E2_CLOZE'
    }

    console.log(`[ConservativeDetector] Detected type: ${detectedType}`)
    return detectedType
  } catch (error) {
    console.error('[ConservativeDetector] Detection failed:', error)
    return 'E2_CLOZE' // Safe fallback
  }
}
