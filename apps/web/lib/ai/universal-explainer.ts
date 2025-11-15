/**
 * Universal Explainer v2 - ChatGPT Style
 *
 * 完全移除題型判斷，像 ChatGPT 一樣回答任何問題
 * 目標：快速、穩定、永遠有輸出
 */

import { chatCompletion, chatCompletionJSON } from '@/lib/openai'
import { safeText } from '@/lib/safe-text'
import { ensureExplainShape, type ExplainResult } from './explain-validator'
import { track } from '@plms/shared/analytics'
import type {
  SharedPassagePayload,
  IndependentListPayload,
} from '@/lib/explain/types'
import { isSharedPayload, isIndependentList } from '@/lib/explain/types'
import type { ExplainStatus } from '@/lib/explain/types'
import {
  inferMissingFields,
  safeConvertToMarkdown,
  convertSharedPassageToMarkdown,
  convertQuestionsToMarkdown,
} from './universal-explainer-helpers'

/**
 * 安全的事件追蹤：避免 track 不存在時中斷流程
 */
const safeTrack = (event: string, payload?: any) => {
  try {
    if (track) {
      track(event as any, payload)
    }
  } catch {
    // 靜默失敗，不中斷流程
  }
}

/**
 * 舊版單題格式（向後兼容）
 */
export interface ExplainCardContentData {
  question: string
  answer: string
  reasoning: string
  counterpoints?: Record<string, string>
  note?: string
}

export interface UniversalExplainResult {
  markdown: string
  structured?: ExplainCardContentData // 舊版格式（向後兼容）
  questions?: IndependentListPayload // 新版格式（單題或多題獨立題幹）
  sharedPassage?: SharedPassagePayload // 新版格式（多題共用題幹，優先使用）
  status: ExplainStatus // ✅ 使用 union 型別
  meta?: {
    elapsedMs: number
    layer: 'universal' | 'basic' | 'minimal'
    failureCause?: string
    warnings?: string[]
    missingFields?: string[] // ✅ 缺欄位列表
    mode?: string // ✅ 路由模式
    sourceModel?: string // ✅ 使用的模型
  }
}

/**
 * 頭尾截斷策略：確保選項在最後不被切掉
 * 規則：若原文長度 ≤ HEAD+TAIL，直接全送；否則送 raw[0:HEAD] + "\n...\n" + raw[-TAIL:]
 */
function truncateHeadTail(inputText: string): string {
  const HEAD_CHARS = parseInt(
    process.env.EXPLAINER_HEAD_CHARS || '2200',
    10
  )
  const TAIL_CHARS = parseInt(
    process.env.EXPLAINER_TAIL_CHARS || '1200',
    10
  )

  const text = safeText(inputText, '')
  const totalLength = text.length

  // 如果總長度不超過 HEAD+TAIL，直接返回
  if (totalLength <= HEAD_CHARS + TAIL_CHARS) {
    return text
  }

  // 否則截取頭尾
  const head = text.substring(0, HEAD_CHARS)
  const tail = text.substring(totalLength - TAIL_CHARS)
  return `${head}\n...\n${tail}`
}

/**
 * 檢測是否為英文題（英文含量 > 70%）
 */
function detectEnglishSubject(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return false
  
  const englishWords = normalized.match(/\b[a-z]{2,}\b/gi)?.length ?? 0
  const totalWords = normalized.split(/\s+/).filter(Boolean).length || 1
  const englishWordRatio = englishWords / totalWords
  
  const englishChars = normalized.match(/[a-z]/gi)?.length ?? 0
  const totalChars = normalized.length || 1
  const englishCharRatio = englishChars / totalChars
  
  // 英文含量超過 70% 判斷為英文題
  return englishWordRatio > 0.7 || englishCharRatio > 0.7
}

/**
 * 檢測是否為單字題（非文法題）
 * 升級版：更準確的單字題判斷邏輯
 */
function detectVocabularyQuestion(text: string, options: string[]): boolean {
  // 檢查選項是否都是單字或短片語（< 3 個單字）
  const areOptionsShort = options.every(opt => {
    const cleanOpt = opt.replace(/^\([A-E]\)\s*/i, '').trim()
    const wordCount = cleanOpt.split(/\s+/).length
    return wordCount <= 3
  })

  // 檢查題幹是否包含空格（_____ 或 ____ 或類似格式）
  const hasBlank = /_{2,}|\([\s_]+\)/.test(text)

  // 檢查選項本身是否包含動詞變化（如果選項是動詞變化，才是文法題）
  const optionsHaveVerbForms = options.some(opt => {
    const cleanOpt = opt.replace(/^\([A-E]\)\s*/i, '').trim().toLowerCase()
    return /(have been|has been|had been|will have|would have|should have|being|having been|to \w+|had \w+)/i.test(cleanOpt)
  })

  // 檢查是否有明顯的文法考點連接詞
  const hasComplexGrammar = /(if|when|although|because|unless|whether|provided that|in order to|so that)/i.test(text)

  // 單字題判斷：選項都是短詞 + 有空格 + 選項不是動詞變化
  return areOptionsShort && hasBlank && !optionsHaveVerbForms && !hasComplexGrammar
}

/**
 * Universal Explainer - ChatGPT-like: Takes any input, generates explanation
 * No format parsing, no type detection, just pure AI reasoning
 */
export async function universalExplainer(
  inputText: string
): Promise<UniversalExplainResult> {
  const start = Date.now()
  const mode = process.env.EXPLAINER_MODE || 'llm-only'
  const lenientMode = process.env.EXPLAIN_LENIENT_UNIVERSAL !== 'false' // ✅ Feature flag，預設開啟
  const sourceModel = 'gpt-4o-mini'

  // 移除複雜的題型檢測，像 ChatGPT 一樣直接處理
  const isEnglish = detectEnglishSubject(inputText)

  // 追蹤開始事件
  const truncatedInput = truncateHeadTail(inputText)
  safeTrack('explain.generate.start' as any, {
    chars: truncatedInput.length,
    originalChars: inputText.length,
    mode,
    isEnglish,
  })

  try {
    const prompt = buildPrompt(truncatedInput, isEnglish)

    // 直接獲取結構化 JSON（增加輸出長度以處理複雜題目）
    const result = await chatCompletionJSON<ExplainResult>(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-4o-mini',
        temperature: 0.05, // ✅ 極低溫度：最大化速度和確定性
        maxOutputTokens: 2000, // ✅ 增加輸出長度以處理複雜題目
        responseFormat: { type: 'json_object' },
      }
    )

    // 使用輕量驗證器
    const validation = ensureExplainShape(result)

    // 簡化：只要有 fixed 就直接返回，移除複雜的條件判斷
    if (validation.fixed) {
      const fixedResult = validation.fixed

      // 處理共用題幹格式
      if (isSharedPayload(fixedResult)) {
        const markdown = safeConvertToMarkdown(convertSharedPassageToMarkdown, fixedResult)
        return {
          markdown,
          sharedPassage: fixedResult,
          status: 'full',
          meta: { elapsedMs: Date.now() - start, layer: 'universal', mode, sourceModel },
        }
      }

      // 處理獨立題目格式
      if (isIndependentList(fixedResult)) {
        const markdown = safeConvertToMarkdown(convertQuestionsToMarkdown, fixedResult)
        return {
          markdown,
          questions: fixedResult,
          status: 'full',
          meta: { elapsedMs: Date.now() - start, layer: 'universal', mode, sourceModel },
        }
      }
    }

    // 簡單 fallback（不重新生成，直接返回錯誤）
    return {
      markdown: '⚠️ 無法生成詳解格式，請重試',
      status: 'raw',
      meta: { elapsedMs: Date.now() - start, layer: 'universal', mode, sourceModel },
    }
  } catch (error) {
    console.error('[UniversalExplainer] Failed:', error)
    
    // ✅ 追蹤失敗事件
    safeTrack('explain.generate.fail' as any, {
      reason: 'exception',
      error: error instanceof Error ? error.message : 'Unknown error',
      mode,
      sourceModel,
    })

    return {
      markdown: '⚠️ 無法生成詳解，請重試一次',
      status: 'raw',
      meta: {
        elapsedMs: Date.now() - start,
        layer: 'universal',
        failureCause: error instanceof Error ? error.message : 'Unknown error',
        mode,
        sourceModel,
      },
    }
  }
}

/**
 * 統一的 ChatGPT 風格 Prompt（移除題型限制）
 */
function buildPrompt(inputText: string, isEnglish: boolean): string {
  const content = safeText(inputText, '')

  // 簡化：統一處理所有題型，像 ChatGPT 一樣
  const subjectContext = isEnglish
    ? '這是英文題目，請提供專業的英文學習解釋。'
    : '這是非英文題目。'

  return `You are a precise test prep expert. Analyze any question and provide accurate explanations.

**Context:** ${subjectContext}
**Question:** ${content}

**Output Format (strict JSON, no markdown, no extra text):**

**If multiple questions share the SAME passage (reading comprehension with numbered blanks like (1), (2), (3)):**

{
  "sharedPassage": "完整文章內容（保留所有原始格式，包括換行和空格，不要清理或壓縮，不含選項標記）",
  "questions": [
    {
      "options": ["(A) ...", "(B) ...", "(C) ...", "(D) ..."],
      "explanation": {
        "answer": "(1) B — among others",
        "reasoning": "5-8個字說明為何正確",
        "counterpoints": {
          "A": "具體錯誤原因（5-8字）",
          "C": "具體錯誤原因（5-8字）",
          "D": "具體錯誤原因（5-8字）"
        }
      },
      "tips": "（可選）針對本題的具體解題技巧；若沒有就省略。"
    }
  ],
  "note": "（可選）作為最頂尖的學習專家，僅在認為有重要考點需要補充時才提供，統一在題組最後顯示；若沒有重要考點則省略此字段。"
}

**If questions have INDEPENDENT stems (not sharing a passage):**

Since json_object mode requires a root object (not array), wrap the array in an object:

{
  "questions": [
    {
      "question": "original question stem (remove option markers)",
      "options": ["(A) ...", "(B) ...", "(C) ...", "(D) ..."],
      "explanation": {
        "answer": "C among others",
        "reasoning": "5-8個字說明為何正確",
        "counterpoints": {
          "A": "具體錯誤原因（5-8字）",
          "B": "具體錯誤原因（5-8字）",
          "D": "具體錯誤原因（5-8字）"
        }
      },
      "tips": "（可選）針對本題的具體解題技巧；若沒有就省略。"
    }
  ]
}

**Rules (CRITICAL - 必須遵守):**

1. **All text in 繁體中文** (except English quotes)
2. **Answer format:** "C" for single, "(1) B" for numbered
3. **Long passage (>300 chars):** Use "sharedPassage" format
4. **Single question:** Wrap in {"questions": [...]} object
5. **NO markdown, NO extra text, ONLY JSON**`
}

/**
 * Markdown Prompt（fallback，已使用頭尾截斷）
 */
function buildMarkdownPrompt(inputText: string): string {
  // inputText 已經在 universalExplainer 中截斷過，這裡直接使用
  const content = safeText(inputText, '')

  return `你是世界頂尖的英語教學專家。請為以下題目生成完整詳解。

**題目內容：**
${content}

---

**輸出格式（嚴格遵守）：**

## 📝 題目

[題幹內容，不含選項標記]

## 🔡 選項

[列出所有選項，每個選項獨立一行]

## ✅ 答案

[列出所有答案，格式：(1) B — among others]

## 🧠 詳解

**不要寫開場白，直接進入核心說明**

對每個空格（或單題），都要提供：

1. **為什麼選正確答案**：1-2 句精準理由，說明為什麼這個選項正確
2. **其他選項為什麼不選**：簡短說明每個錯誤選項的問題（1 句即可）

## 💡 解題技巧

- **理解上下文**：注意句子的整體意義和語境
- **語法結構**：確保選擇的詞語在語法上正確，並能流暢地融入句子中
- **詞彙搭配**：注意固定搭配和慣用語
- **排除法**：先剔除明顯不符合語境的選項

---

**重要原則：**
1. **不要判斷題型**：直接分析內容，給出答案和解析
2. **詳解要完整**：每個空格都要有詳細說明，不能省略
3. **格式要清晰**：使用編號和粗體標記，讓結構清楚
4. **語言要精準**：用簡潔有力的語言說明，避免冗長
5. **直接輸出 Markdown**：不要包在程式碼區塊，不要輸出 JSON

現在開始！`
}

// convertSharedPassageToMarkdown 和 convertQuestionsToMarkdown 已移至 universal-explainer-helpers.ts
