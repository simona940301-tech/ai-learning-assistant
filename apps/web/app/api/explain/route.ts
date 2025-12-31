/**
 * /api/explain - Layered Fallback Explanation API
 *
 * 三層降級機制：
 * 1. Universal Explainer: 完整解釋（AI 直接生成）
 * 2. Basic Extractor: 基本解釋（規則提取 + 簡短 AI）
 * 3. Minimal Fallback: 最小解釋（保底模板，永遠不失敗）
 *
 * 原則：
 * - 永遠有輸出，永遠不拋錯
 * - 不依賴題型分類
 * - 快速、穩定、可靠
 *
 * 返回格式：兼容舊格式（answer/briefReason）和新格式（markdown）
 */

export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getApiUser } from '@/lib/api/auth'
import { Api } from '@/lib/api/response'
import { universalExplainer } from '@/lib/ai/universal-explainer'
import { basicExtractor } from '@/lib/ai/basic-extractor'
import { minimalFallback } from '@/lib/ai/minimal-fallback'
import { safeText, safeMatch, safeTrim, safeToUpperCase } from '@/lib/safe-text'
import type { ExplainMode } from '@/lib/types'
import type { MinimalFallbackResult } from '@/lib/ai/minimal-fallback'
import { getCachedExplanation, setCachedExplanation } from '@/lib/cache/explain-cache'

// Feature flag for quick rollback
const UNIVERSAL_EXPLAINER_ENABLED = process.env.EXPLAIN_UNIVERSAL_ENABLED !== 'false'

const Schema = z.object({
  input: z.object({
    text: z.string().optional(),
    imageUrl: z.string().url().optional(),
  }),
  mode: z.enum(['fast', 'deep']).optional(),
  conservative: z.boolean().optional(),
  questionId: z.string().optional(), // 可選的題目 ID，用於緩存 key 生成
})

export async function POST(req: NextRequest) {
  // Authentication check - required for all AI endpoints
  const { user, errorType } = await getApiUser(req)

  if (!user) {
    const message =
      errorType === 'invalid-jwt'
        ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
        : errorType === 'unauthenticated'
          ? 'Authentication required'
          : 'Authentication error occurred'

    return Api.unauthorized(message)
  }

  const startTime = Date.now()
  let requestMode: 'fast' | 'deep' | undefined
  let cachedQuestionId: string | undefined = undefined
  let inputText: string = '' // ✅ 存儲 input text 供後續使用

  // 輔助函數：存入緩存並返回響應
  const buildAndCacheResponse = async (
    markdown: string,
    status: string,
    meta: any,
    answer: string,
    briefReason: string,
    kind: string = 'vocab',
    structured?: any
  ) => {
    const response = {
      kind: kind as any,
      mode: (requestMode || 'deep') as any,
      answer: answer || '',
      briefReason: briefReason || '',
      fullExplanation: markdown,
      markdown,
      status,
      ...(structured ? { structured } : {}),
      meta: {
        ...meta,
        totalElapsedMs: Date.now() - startTime,
        cached: false,
      },
    }

    // 存入緩存（非阻塞，不影響響應速度）
    if (inputText && inputText.trim().length > 0) {
      setCachedExplanation(inputText, {
        markdown,
        structured,
        status,
        meta: response.meta,
      }, cachedQuestionId).catch((err) => {
        console.error('[api/explain] Failed to cache result:', err)
      })
    }

    return Api.success(response)
  }

  const buildMinimalResponse = (
    minimal: MinimalFallbackResult,
    failureCause?: string
  ) => {
    const minimalMarkdown = `## 📝 題目

${minimal.question}

${minimal.options.length > 0 ? `## 🔡 選項

${minimal.options.map(opt => `(${opt.key}) ${opt.text}`).join('\n\n')}

` : ''}## ✅ 答案

${minimal.answer !== '-' ? `**${minimal.answer}**` : '-'}

## 🧠 詳解

${minimal.reason !== '-' ? minimal.reason : '無法生成詳細解析，請檢查題目格式'}

## 💡 解題技巧

- **主題識別**：找出段落主題與最能概括的選項
- **細節比對**：核對選項細節是否與原文一致
- **上下文**：選能補足或延伸主旨的選項
- **排除法**：先剔除不相干或與原文矛盾者`

    const answerText = minimal.answer !== '-' ? minimal.answer : ''
    const briefReasonText = minimal.reason !== '-' ? minimal.reason.substring(0, 25) : '無法生成詳細解析'

    return Api.success({
      // ExplainViewModel 格式
      kind: 'vocab' as any, // 默認為 vocab
      mode: (requestMode || 'deep') as any,
      answer: answerText || '-',
      briefReason: briefReasonText,
      fullExplanation: minimalMarkdown,
      // 保留原有格式
      markdown: minimalMarkdown,
      status: minimal.status,
      meta: {
        ...minimal.meta,
        totalElapsedMs: Date.now() - startTime,
        ...(failureCause ? { failureCause } : {}),
      },
    })
  }

  try {
    const body = await req.json()
    const { input, mode, questionId } = Schema.parse(body)
    requestMode = mode
    cachedQuestionId = questionId // 保存 questionId 供後續使用
    const text = safeText(input.text, '')
    inputText = text // ✅ 存儲到外部變量供 buildAndCacheResponse 使用

    // ✅ 緩存檢查：在處理前先檢查是否有緩存
    if (text && text.trim().length > 0) {
      const cached = await getCachedExplanation(text, questionId)
      if (cached) {
        // 從緩存返回，標記為 cached
        const latency = Date.now() - startTime
        console.log('[api/explain] ✅ Cache hit', {
          questionId: questionId || 'none',
          latency_ms: latency,
        })

        // 確保返回格式與正常流程一致
        let answer = ''
        let briefReason = '詳解已生成'
        let kind: string = 'vocab'

        // 嘗試從 markdown 中提取答案（與正常流程相同的邏輯）
        const answerMatch =
          cached.markdown.match(/##\s*✅\s*正確答案\s*\n+(?:\s*\n){0,2}\s*正確答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/im) ||
          cached.markdown.match(/正確答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/i) ||
          cached.markdown.match(/答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/i)

        if (answerMatch) {
          answer = answerMatch[1].toUpperCase()
        }

        const reasoningMatch =
          cached.markdown.match(/##\s*小結與記憶\s*\n+([^\n]{15,80})/i) ||
          cached.markdown.match(/##\s*錯誤選項解析\s*\n+([^\n]{15,80})/i) ||
          cached.markdown.match(/##\s*解題步驟\s*\n+([^\n]{15,80})/i) ||
          cached.markdown.match(/##\s*題意說明\s*\n+([^\n]{15,80})/i) ||
          cached.markdown.match(/##\s*詳解\s*\n+([^\n]{15,80})/i)

        if (reasoningMatch) {
          briefReason = reasoningMatch[1].trim().substring(0, 50)
        }

        return Api.success({
          kind: kind as any,
          mode: (mode || 'deep') as any,
          answer: answer || '',
          briefReason: briefReason || '',
          fullExplanation: cached.markdown,
          markdown: cached.markdown,
          status: cached.status,
          meta: {
            ...cached.meta,
            totalElapsedMs: latency,
            cached: true, // 標記為緩存結果
          },
        })
      }
    }

    if (!text || text.trim().length === 0) {
      // Empty input → minimal fallback (Markdown format)
      const minimal = minimalFallback('')
      const emptyMarkdown = `## 📝 題目

請輸入題目

## ✅ 答案

-

## 🧠 詳解

請輸入題目內容以生成詳解`

      return Api.success({
        // ExplainViewModel 格式
        kind: 'vocab' as any,
        mode: (mode || 'deep') as any,
        answer: '-',
        briefReason: '請輸入題目內容以生成詳解',
        fullExplanation: emptyMarkdown,
        // 保留原有格式
        markdown: emptyMarkdown,
        status: minimal.status,
        meta: {
          ...minimal.meta,
          totalElapsedMs: Date.now() - startTime,
        },
      })
    }

    // 如果缺少 Gemini 設定，直接回傳最小解析，避免 500 或空白回應
    const hasGeminiKey = !!process.env.GEMINI_API_KEY
    console.log('[api/explain] Checking API keys:', {
      hasGeminiKey,
      geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    })

    if (!hasGeminiKey) {
      console.warn('[api/explain] Missing GEMINI_API_KEY, returning minimal fallback')
      const minimal = minimalFallback(text)
      return buildMinimalResponse(minimal, 'missing_gemini_api_key')
    }

    // Layer 1: Universal Explainer
    if (UNIVERSAL_EXPLAINER_ENABLED) {
      try {
        // ✅ Detect if text is actually a base64 image
        let processingText = text
        let processingImage = input.imageUrl

        if (text.startsWith('data:image/')) {
          console.log('[api/explain] Detected base64 image in text field')
          processingImage = text
          processingText = '請解析這張圖片中的題目，並提供詳細解答。'
        }

        const universal = await universalExplainer(processingText, processingImage)
        // 只要有 markdown 就返回（即使有警告也返回）
        if (universal.markdown) {
          console.log('[api/explain] ✅ Universal layer success', {
            elapsedMs: universal.meta?.elapsedMs,
            markdownLength: universal.markdown.length,
            markdownPreview: universal.markdown.substring(0, 100),
            status: universal.status,
          })

          // ✅ 簡化：直接從 markdown 中提取答案，不需要結構化數據
          // 嘗試從 markdown 中提取答案（例如：答案：(1) B 或 答案：C）
          let answer = ''
          let briefReason = '詳解已生成'
          let kind: string = 'vocab'

          // 從 markdown 中提取答案（優先尋找新格式：## ✅ 正確答案 標題後的「正確答案：(B) hatch」）
          // 優先順序：1. 在「## ✅ 正確答案」標題後尋找「正確答案：(X)」格式
          //           2. 直接尋找「正確答案：(X)」格式
          //           3. 尋找「答案：(X)」格式
          const answerMatch =
            // 優先：在「## ✅ 正確答案」標題後 0-3 行內尋找「正確答案：(X)」格式
            // 支援：**正確答案**：(B)、正確答案: (B)、(B) hatch 等格式
            universal.markdown.match(/##\s*✅\s*正確答案\s*\n+(?:[^\n]*\n){0,3}.*?([A-E])\)/im) ||
            universal.markdown.match(/##\s*✅\s*正確答案\s*\n+(?:[^\n]*\n){0,3}.*?([A-E])\s+[a-zA-Z]/im) ||
            // 次優先：直接尋找「正確答案：(X)」格式
            universal.markdown.match(/正確答案[:：]\s*(?:\(?\d+\)?\s*)?\(?([A-E])\)?/i) ||
            // Fallback：尋找「答案：(X)」格式
            universal.markdown.match(/答案[:：]\s*(?:\(?\d+\)?\s*)?\(?([A-E])\)?/i)

          if (answerMatch) {
            answer = answerMatch[1].toUpperCase()
          } else {
            // 如果找不到單一答案，嘗試找多個答案（例如：(1) B, (2) C）
            const multiAnswerMatch = universal.markdown.match(/(?:\(?\d+\)?\s*([A-E]))/gi)
            if (multiAnswerMatch && multiAnswerMatch.length > 0) {
              // 多題答案，用第一個作為代表
              answer = multiAnswerMatch[0].match(/([A-E])/i)?.[1]?.toUpperCase() || ''
            }
          }

          // 從 markdown 中提取簡短理由（優先順序：小結與記憶 > 錯誤選項解析 > 解題步驟/題意說明 > 其他）
          // 新規格：小結與記憶和錯誤選項解析是必填的，優先從這些區塊提取
          const reasoningMatch =
            // 優先 1：從「Reminder」區塊提取（必填，1-3 句總結）
            universal.markdown.match(/##\s*Reminder\s*\n+([^\n]{15,80})/i) ||
            // 優先 2：從「小結與記憶」區塊提取（舊格式相容）
            universal.markdown.match(/##\s*小結與記憶\s*\n+([^\n]{15,80})/i) ||
            // 優先 3：從「錯誤選項解析」區塊提取（必填，條列說明）
            universal.markdown.match(/##\s*錯誤選項解析\s*\n+([^\n]{15,80})/i) ||
            // Fallback 1：從「解題步驟」區塊提取（可能不存在）
            universal.markdown.match(/##\s*解題步驟\s*\n+([^\n]{15,80})/i) ||
            // Fallback 2：從「題意說明」區塊提取（可能不存在）
            universal.markdown.match(/##\s*題意說明\s*\n+([^\n]{15,80})/i) ||
            // Fallback 3：其他可能的標題
            universal.markdown.match(/##\s*詳解\s*\n+([^\n]{15,80})/i) ||
            universal.markdown.match(/##\s*解析\s*\n+([^\n]{15,80})/i)

          if (reasoningMatch) {
            briefReason = reasoningMatch[1].trim().substring(0, 50)
          }

          // 如果還是沒有答案，從 markdown 開頭提取（避免顯示 '-'）
          if (!answer) {
            // 嘗試從 markdown 內容中找答案提示
            const fallbackMatch = universal.markdown.match(/([A-E])\s*[—–-]/i) ||
              universal.markdown.match(/選項\s*([A-E])/i)
            if (fallbackMatch) {
              answer = fallbackMatch[1].toUpperCase()
            }
          }

          // ✅ 存入緩存並返回
          return await buildAndCacheResponse(
            universal.markdown,
            universal.status,
            universal.meta,
            answer || '',
            briefReason || '',
            kind
          )
        }
      } catch (error) {
        console.error('[api/explain] Universal layer failed:', error)
      }
    }

    // Layer 2: Basic Extractor - 轉換為 Markdown 和 Structured 格式
    try {
      const basic = await basicExtractor(text)
      console.log('[api/explain] ✅ Basic layer success', {
        elapsedMs: basic.meta.elapsedMs,
        hasAnswer: basic.answer !== '-',
        hasReason: basic.reason !== '-',
      })

      // 生成 Structured 格式（ExplainCardContent 使用）
      const answerOption = basic.options.find(opt => opt.key === basic.answer)
      const structured = {
        question: basic.question,
        answer: basic.answer !== '-' && answerOption
          ? `${basic.answer} — ${answerOption.text}`
          : basic.answer,
        reasoning: basic.reason !== '-' ? basic.reason : '無法生成詳細解析',
        counterpoints: basic.options
          .filter(opt => opt.key !== basic.answer)
          .reduce((acc, opt) => {
            acc[opt.key] = opt.text
            return acc
          }, {} as Record<string, string>),
        note: undefined,
      }

      // 將 Basic Extractor 結果轉換為 Markdown 格式（作為 fallback）
      const markdown = `## 📝 題目

${basic.question}

## 🔡 選項

${basic.options.map(opt => `(${opt.key}) ${opt.text}`).join('\n\n')}

## ✅ 答案

${basic.answer !== '-' ? `**${basic.answer}** — ${basic.options.find(opt => opt.key === basic.answer)?.text || ''}` : '-'}

## 🧠 詳解

${basic.reason !== '-' ? basic.reason : '無法生成詳細解析'}

## 💡 解題技巧

- **主題識別**：找出段落主題與最能概括的選項
- **細節比對**：核對選項細節是否與原文一致
- **上下文**：選能補足或延伸主旨的選項
- **排除法**：先剔除不相干或與原文矛盾者`

      // 提取答案和理由
      const answerText = basic.answer !== '-' ? basic.answer : ''
      const briefReasonText = basic.reason !== '-' ? basic.reason.substring(0, 25) : '依據文意判定。'

      // ✅ 存入緩存並返回
      return await buildAndCacheResponse(
        markdown,
        basic.status,
        basic.meta,
        answerText || '-',
        briefReasonText,
        'vocab',
        structured
      )
    } catch (error) {
      console.error('[api/explain] Basic layer failed:', error)
    }

    // Layer 3: Minimal Fallback - 轉換為 Markdown 格式
    const minimal = minimalFallback(text)
    console.log('[api/explain] ⚠️ Using minimal fallback', {
      elapsedMs: minimal.meta.elapsedMs,
      hint: minimal.meta.hint,
    })

    return buildMinimalResponse(minimal)
  } catch (error) {
    console.error('[api/explain] Critical error:', error)
    const minimal = minimalFallback('')
    const errorMarkdown = `## 📝 題目

無法解析題目

## ✅ 答案

-

## 🧠 詳解

⚠️ 無法生成詳解，請重試一次

錯誤訊息：${error instanceof Error ? error.message : 'Unknown error'}`

    return Api.success({
      // ExplainViewModel 格式
      kind: 'vocab' as any,
      mode: (requestMode || 'deep') as any,
      answer: '-',
      briefReason: '無法生成詳解，請重試一次',
      fullExplanation: errorMarkdown,
      // 保留原有格式
      markdown: errorMarkdown,
      status: minimal.status,
      meta: {
        ...minimal.meta,
        totalElapsedMs: Date.now() - startTime,
        failureCause: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}
