/**
 * Universal Explainer v2 - ChatGPT Style
 *
 * 完全移除題型判斷，像 ChatGPT 一樣回答任何問題
 * 目標：快速、穩定、永遠有輸出
 */

import { chatCompletion, chatCompletionJSON } from '@/lib/gemini'
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
    title?: string
    subject?: string
    totalElapsedMs?: number
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

import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Universal Explainer - ChatGPT-like: Takes any input, generates explanation
 * No format parsing, no type detection, just pure AI reasoning
 */
export async function universalExplainer(
  inputText: string,
  imageUrl?: string // ✅ Support image input
): Promise<UniversalExplainResult> {
  const start = Date.now()
  const mode = process.env.EXPLAINER_MODE || 'llm-only'
  const lenientMode = process.env.EXPLAIN_LENIENT_UNIVERSAL !== 'false' // ✅ Feature flag，預設開啟
  const sourceModel = 'gemini-2.0-flash-exp'

  // 移除複雜的題型檢測，像 ChatGPT 一樣直接處理
  const isEnglish = detectEnglishSubject(inputText)

  // 追蹤開始事件
  const truncatedInput = truncateHeadTail(inputText)
  safeTrack('explain.generate.start' as any, {
    chars: truncatedInput.length,
    originalChars: inputText.length,
    hasImage: !!imageUrl,
    mode,
    isEnglish,
  })

  try {
    // ✅ 簡化：直接生成 markdown，像 ChatGPT 一樣
    const prompt = buildSimpleMarkdownPrompt(truncatedInput, isEnglish)
    let markdown = ''

    if (imageUrl) {
      // ✅ Multimodal Request (Image + Text)
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      // Extract base64 data
      // Data URL format: data:image/png;base64,iVBORw0KGgo...
      const base64Data = imageUrl.split(',')[1]
      const mimeType = imageUrl.split(';')[0].split(':')[1] || 'image/png'

      // Modify prompt for image context to ensure all questions are solved
      const imagePrompt = `${prompt}\n\n【圖片題目特別注意事項】\n1. 請仔細識別圖片中的**所有題目**，包括用「(1)」、「(2)」、「1.」、「2.」等任何格式標記的題號\n2. 如果圖片包含多個題目，請**分別為每一題**提供完整解析（題意說明、正確答案、錯誤選項解析、Reminder）\n3. 不要遺漏任何題目，即使題目之間沒有明顯分隔\n4. 對於每一題，請在標題中明確標示題號（例如：## 題目 (1)、## 題目 (2)）\n5. 題幹部分如果包含共用閱讀文章，請在最前面先完整顯示原文，然後再逐題解析`

      const result = await model.generateContent([
        imagePrompt,
        {
          inlineData: {
            data: base64Data,
            mimeType
          }
        }
      ])
      markdown = result.response.text().trim()
    } else {
      // ✅ Text-only Request
      const result = await chatCompletion(
        [{ role: 'user', content: prompt }],
        {
          model: 'gemini-2.0-flash-exp',
          temperature: 0.3, // ✅ 適中溫度：平衡創造力和準確性
        }
      )
      markdown = result.trim()
    }

    // ✅ 簡單驗證：只要有內容就返回
    if (markdown && markdown.length > 10) {
      return {
        markdown,
        status: 'full',
        meta: { elapsedMs: Date.now() - start, layer: 'universal', mode, sourceModel },
      }
    }

    // Fallback：如果內容太短，使用簡單格式
    return {
      markdown: `## 📝 題目\n\n${truncatedInput}\n\n## 🧠 詳解\n\n${markdown || '正在生成詳解中...'}`,
      status: markdown ? 'full' : 'minimal',
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
 * ✅ 優化的 Prompt：結構清晰、快狠準，符合專案架構要求
 */
function buildSimpleMarkdownPrompt(inputText: string, isEnglish: boolean): string {
  const content = safeText(inputText, '')

  const subjectContext = isEnglish
    ? '這是一題英文考題，請從英文學習的角度來解釋。'
    : '這是一題考題，請從學習的角度來解釋。'

  return `你是專業的學測解題老師。${subjectContext}

請用簡潔的繁體中文，為下面的題目寫出一份好讀的詳解。

【題目】

${content}

輸出時請使用「簡單的 Markdown」，只要有基本的標題、粗體或條列就好，不需要華麗排版。

**必要區塊（請按照以下順序完整輸出）：**

1. **題意說明**（必填）
   - 標題：## 題意說明
   - 內容：簡單說明這題在考什麼、關鍵線索是什麼、解題思路
   - 字數：2-4 句話即可

2. **正確答案**（必填）
   - 標題：## ✅ 正確答案
   - 格式：正確答案：(B) hatch
     （請嚴格遵守此格式：文字「正確答案」+ 全形冒號「：」+ 選項代號如「(B)」 + 單字）
   - 如果是多題，格式為：正確答案：(1) B — hatch, (2) C — among others

3. **錯誤選項解析**（必填）
   - 標題：## 錯誤選項解析
   - 內容：依序用條列說明 (A) ~ (E)（有幾個選項就寫幾個），每個選項 1–2 句即可
   - 格式範例：
     - (A) humble：意為「謙遜的」，不符合描述風景的情境。
     - (C) massive：意為「龐大的」，雖然可以形容景觀，但無法傳達生動的感受。

4. **Reminder**（必填，請使用英文標題）
   - 標題：## Reminder
   - 內容：用 1–3 句幫學生收尾，可以是記憶小技巧、常見陷阱提醒等。內容請使用繁體中文。
   - 格式：直接寫內容，不要用條列式，也不要加「小結：」等前綴。

整體原則：
- **絕對不要截斷內容**：請確保每個句子都完整結束，不要在句中斷開。
- 所有 4 個區塊都是必填的，請完整輸出
- 嚴格遵守上述標題格式（## 題意說明、## ✅ 正確答案、## 錯誤選項解析、## Reminder）
- 解釋要精簡、直白，像在對國高中生講解
- 優先確保內容正確、清楚，其次才是美觀
- 不要輸出任何多餘的說明（例如不要解釋你在做什麼），只輸出詳解本身
- 如果題目有多題，請為每題都提供完整解析`
}

// convertSharedPassageToMarkdown 和 convertQuestionsToMarkdown 已移至 universal-explainer-helpers.ts
