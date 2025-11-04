/**
 * Conservative Mode Explainer
 * Generates structured, slot-by-slot, verifiable explanations
 */
import { chatCompletionJSON } from '@/lib/openai'
import type {
  ConservativeQuestionType,
  ConservativeAnswer,
  E1VocabAnswer,
  E2ClozeAnswer,
  E3FillInClozeAnswer,
  E4ReadingAnswer,
  E5DiscourseAnswer,
  E5TranslationAnswer,
  E6WritingAnswer,
} from './conservative-types'

export async function generateConservativeExplanation(
  inputText: string,
  type: ConservativeQuestionType
): Promise<ConservativeAnswer> {
  const prompts: Record<ConservativeQuestionType, string> = {
    E1_VOCAB: `你是英語解題教師。分析以下文意字彙題，輸出結構化 JSON：

題目：${inputText.substring(0, 2000)}

格式（必須嚴格遵守）：
{
  "type": "E1_VOCAB",
  "question_text": "完整題幹文字",
  "answer": "B",
  "one_line_reason": "in wonder 為固定片語，意為驚奇地。（≤30字）",
  "distractor_rejects": [
    {"option": "A", "reason": "搭配錯誤"},
    {"option": "C", "reason": "詞性不符"},
    {"option": "D", "reason": "語意不對"}
  ]
}

要求：
- 所有選項都必須列出在 distractor_rejects 中
- one_line_reason 必須≤30字，具體可驗證
- 不得省略任何欄位
- Output JSON only:`,

    E2_CLOZE: `你是英語解題教師。分析以下綜合測驗題，逐格輸出答案與理由：

題目：${inputText.substring(0, 3000)}

格式（必須嚴格遵守）：
{
  "type": "E2_CLOZE",
  "passage_summary": "本文描述城市咖啡文化的興起。",
  "slots": [
    {
      "slot": 1,
      "answer": "B",
      "one_line_reason": "since 1970s → 用現在完成式",
      "distractor_rejects": [
        {"option": "A", "reason": "過去式與 since 不合"},
        {"option": "C", "reason": "時態錯誤"},
        {"option": "D", "reason": "語意不通"}
      ]
    },
    {
      "slot": 2,
      "answer": "C",
      "one_line_reason": "轉折語需 however",
      "distractor_rejects": [
        {"option": "A", "reason": "語意連接錯誤"},
        {"option": "B", "reason": "非轉折"},
        {"option": "D", "reason": "語氣不符"}
      ]
    }
  ]
}

要求：
- 必須為每一格（slot）提供完整答案
- 每一格都必須有 answer、one_line_reason、distractor_rejects
- distractor_rejects 必須列出所有其他選項
- one_line_reason 必須≤30字
- Output JSON only:`,

    E3_FILL_IN_CLOZE: `你是英語解題教師。分析以下文意選填題，逐格輸出答案與理由：

題目：${inputText.substring(0, 3000)}

格式（必須嚴格遵守）：
{
  "type": "E3_FILL_IN_CLOZE",
  "passage_summary": "本文描述主題...",
  "slots": [
    {
      "slot": 1,
      "answer": "B",
      "one_line_reason": "前文提到...，後句描述...，因此選B",
      "distractor_rejects": [
        {"option": "A", "reason": "語意不符"},
        {"option": "C", "reason": "搭配錯誤"},
        {"option": "D", "reason": "上下文邏輯不對"}
      ]
    }
  ]
}

要求：
- 必須為每一格提供完整答案
- 明確指出依據的句子或段落
- 所有選項都必須分析
- Output JSON only:`,

    E4_READING: `你是英語解題教師。分析以下閱讀測驗題，逐題輸出答案與理由：

題目：${inputText.substring(0, 4000)}

格式（必須嚴格遵守）：
{
  "type": "E4_READING",
  "title": "文章標題",
  "questions": [
    {
      "qid": 1,
      "answer": "C",
      "one_line_reason": "第三段提到鹿習慣進入都市造成事故。",
      "evidence_sentence": "Deer have adapted to urban environments...",
      "distractor_rejects": [
        {"option": "A", "reason": "未提及"},
        {"option": "B", "reason": "與主題無關"},
        {"option": "D", "reason": "無貿易內容"}
      ]
    },
    {
      "qid": 2,
      "answer": "B",
      "one_line_reason": "最後一段強調改善棲地。",
      "evidence_sentence": "To prevent collisions, local governments...",
      "distractor_rejects": [
        {"option": "A", "reason": "句意相反"},
        {"option": "C", "reason": "未提政策"},
        {"option": "D", "reason": "細節錯誤"}
      ]
    }
  ]
}

要求：
- 必須為每一題提供完整答案
- evidence_sentence 必須是原文完整句子
- 所有選項都必須分析
- Output JSON only:`,

    E5_DISCOURSE: `你是英語解題教師。分析以下篇章結構題，逐格輸出答案與理由：

題目：${inputText.substring(0, 3000)}

格式（必須嚴格遵守）：
{
  "type": "E5_DISCOURSE",
  "passage_summary": "本文描述...",
  "slots": [
    {
      "slot": 1,
      "answer": "D",
      "one_line_reason": "空格前提到...，後句描述...，因此選項D延續主題",
      "distractor_rejects": [
        {"option": "A", "reason": "篇章銜接錯誤"},
        {"option": "B", "reason": "邏輯順序不對"},
        {"option": "C", "reason": "語意轉折不符"}
      ]
    }
  ]
}

要求：
- 必須說明篇章銜接邏輯
- 所有選項都必須分析
- Output JSON only:`,

    E5_TRANSLATION: `你是英語解題教師。分析以下翻譯題，輸出結構化詳解：

題目：${inputText.substring(0, 2000)}

格式（必須嚴格遵守）：
{
  "type": "E5_TRANSLATION",
  "original_zh": "你在處理這些任務之前，需要先整理出你的優先事項。",
  "reference_en": "You need to sort out your priorities before dealing with these tasks.",
  "grammar_focus": "動名詞片語 (before dealing with...)",
  "key_phrase_analysis": "sort out your priorities (整理優先順序)",
  "native_upgrade": "You should set your priorities straight before tackling these assignments."
}

要求：
- 必須提供精準翻譯
- 強調語法重點
- 提供道地表達（native_upgrade）
- Output JSON only:`,

    E6_WRITING: `你是英語解題教師。分析以下英文作文題，輸出結構化評分：

題目：${inputText.substring(0, 2000)}

格式（必須嚴格遵守）：
{
  "type": "E6_WRITING",
  "topic_summary": "描述一次挑戰性經驗，並解釋學習到的東西。",
  "student_sample": "範文內容（可選）",
  "maws_scores": {
    "content": 4.0,
    "organization": 3.5,
    "grammar_structure": 4.5,
    "vocabulary_fluency": 3.0
  },
  "qualitative_feedback": "質化評論（結構化、可視覺化）",
  "high_score_sample_intro": "高分示範寫法開頭（可選）"
}

要求：
- 必須提供結構化評分
- 質化評論要具體可驗證
- Output JSON only:`,
  }

  const prompt = prompts[type]

  try {
    const result = await chatCompletionJSON<ConservativeAnswer>(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-4o-mini',
        temperature: 0.2,
        responseFormat: undefined,
      }
    )

    // Validate result matches expected type
    if (result.type !== type) {
      console.warn(`[ConservativeExplainer] Type mismatch: expected ${type}, got ${result.type}`)
    }

    console.log(`[ConservativeExplainer] Generated explanation for type: ${type}`)
    return result
  } catch (error) {
    console.error('[ConservativeExplainer] Generation failed:', error)
    // Return minimal fallback based on type
    return generateFallbackAnswer(type)
  }
}

function generateFallbackAnswer(type: ConservativeQuestionType): ConservativeAnswer {
  switch (type) {
    case 'E1_VOCAB':
      return {
        type: 'E1_VOCAB',
        question_text: '',
        answer: '',
        one_line_reason: '解析生成失敗',
        distractor_rejects: [],
      }
    case 'E2_CLOZE':
    case 'E3_FILL_IN_CLOZE':
    case 'E5_DISCOURSE':
      return {
        type: type as 'E2_CLOZE' | 'E3_FILL_IN_CLOZE' | 'E5_DISCOURSE',
        passage_summary: '',
        slots: [],
      }
    case 'E4_READING':
      return {
        type: 'E4_READING',
        title: '',
        questions: [],
      }
    case 'E5_TRANSLATION':
      return {
        type: 'E5_TRANSLATION',
        original_zh: '',
        reference_en: '',
        grammar_focus: '',
        key_phrase_analysis: '',
      }
    case 'E6_WRITING':
      return {
        type: 'E6_WRITING',
        topic_summary: '',
        maws_scores: {
          content: 0,
          organization: 0,
          grammar_structure: 0,
          vocabulary_fluency: 0,
        },
        qualitative_feedback: '解析生成失敗',
      }
  }
}
