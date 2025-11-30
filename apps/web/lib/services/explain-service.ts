import { universalExplainer } from '@/lib/ai/universal-explainer'
import { basicExtractor } from '@/lib/ai/basic-extractor'
import { minimalFallback } from '@/lib/ai/minimal-fallback'
import { safeText } from '@/lib/safe-text'
import { getCachedExplanation, setCachedExplanation } from '@/lib/cache/explain-cache'

/**
 * Feature flag for quick rollback
 */
const UNIVERSAL_EXPLAINER_ENABLED = process.env.EXPLAIN_UNIVERSAL_ENABLED !== 'false'

export interface ExplainRequest {
  input: {
    text?: string
    imageUrl?: string
  }
  mode?: 'fast' | 'deep'
  conservative?: boolean
}

export interface ExplainResponse {
  markdown: string
  structured?: any
  questions?: any
  sharedPassage?: any
  status: string
  meta: {
    elapsedMs: number
    totalElapsedMs: number
    layer?: string
    cached?: boolean
    failureCause?: string
    hint?: string
  }
}

/**
 * Explain Service
 * 
 * 負責處理題目詳解生成的業務邏輯
 * 三層降級機制：
 * 1. Universal Explainer: 完整解釋（AI 直接生成）
 * 2. Basic Extractor: 基本解釋（規則提取 + 簡短 AI）
 * 3. Minimal Fallback: 最小解釋（保底模板，永遠不失敗）
 * 
 * 原則：
 * - 永遠有輸出，永遠不拋錯
 * - 不依賴題型分類
 * - 快速、穩定、可靠
 */
export class ExplainService {
  /**
   * 生成題目詳解
   */
  async generateExplanation(request: ExplainRequest, startTime: number = Date.now()): Promise<ExplainResponse> {
    const { input, mode } = request
    const text = safeText(input.text, '')

    // 空輸入處理
    if (!text || text.trim().length === 0) {
      return this.handleEmptyInput(startTime)
    }

    // 階段一：檢查緩存
    const cached = await getCachedExplanation(text)
    if (cached) {
      return {
        ...cached,
        meta: {
          ...cached.meta,
          totalElapsedMs: Date.now() - startTime,
          cached: true,
        },
      }
    }

    // 階段二：並行執行 Universal 和 Basic
    const [universalResult, basicResult] = await Promise.allSettled([
      UNIVERSAL_EXPLAINER_ENABLED
        ? universalExplainer(text).catch((err) => {
            console.error('[ExplainService] Universal layer failed:', err)
            return null
          })
        : Promise.resolve(null),
      basicExtractor(text).catch((err) => {
        console.error('[ExplainService] Basic layer failed:', err)
        return null
      }),
    ])

    // 優先使用 Universal 結果
    if (universalResult.status === 'fulfilled' && universalResult.value) {
      const universal = universalResult.value
      
      // ✅ 檢查 markdown 是否有效（不是錯誤訊息）
      const isValidMarkdown = universal.markdown && 
        universal.markdown.length > 50 && 
        !universal.markdown.includes('⚠️ 無法生成詳解') &&
        !universal.markdown.includes('無法生成詳解')
      
      // ✅ 檢查是否有結構化數據
      const hasStructured = universal.sharedPassage || universal.questions
      
      // ✅ 只有當 markdown 有效或結構化數據存在時才使用
      if (isValidMarkdown || hasStructured) {
        console.log('[ExplainService] ✅ Universal layer success', {
          hasMarkdown: !!universal.markdown,
          markdownLength: universal.markdown?.length,
          hasStructured,
          status: universal.status,
          layer: universal.meta?.layer,
        })
        
        const fallbackElapsed = universal.meta?.elapsedMs ?? universal.meta?.totalElapsedMs ?? Date.now() - startTime
        const result: ExplainResponse = {
          markdown: universal.markdown || '',
          structured: universal.structured,
          questions: universal.questions,
          sharedPassage: universal.sharedPassage,
          status: universal.status,
          meta: {
            ...universal.meta,
            elapsedMs: fallbackElapsed,
            totalElapsedMs: Date.now() - startTime,
          },
        }

        // 存入緩存
        await setCachedExplanation(text, result)

        return result
      } else {
        console.warn('[ExplainService] ⚠️ Universal result invalid, falling back', {
          markdownLength: universal.markdown?.length,
          markdownPreview: universal.markdown?.substring(0, 100),
          hasStructured,
          hasSharedPassage: !!universal.sharedPassage,
          hasQuestions: !!universal.questions,
          questionsLength: Array.isArray(universal.questions) ? universal.questions.length : 0,
          failureCause: universal.meta?.failureCause,
          warnings: universal.meta?.warnings?.slice(0, 5),
        })
      }
    } else if (universalResult.status === 'rejected') {
      console.error('[ExplainService] ❌ Universal layer rejected:', universalResult.reason)
    }

    // Fallback 到 Basic 結果
    if (basicResult.status === 'fulfilled' && basicResult.value) {
      const basic = basicResult.value
      console.log('[ExplainService] ✅ Basic layer success', {
        elapsedMs: basic.meta.elapsedMs,
        hasAnswer: basic.answer !== '-',
        hasReason: basic.reason !== '-',
      })

      const markdown = this.convertBasicToMarkdown(basic)
      const result: ExplainResponse = {
        markdown,
        status: basic.status,
        meta: {
          ...basic.meta,
          totalElapsedMs: Date.now() - startTime,
        },
      }

      // 存入緩存
      await setCachedExplanation(text, result)

      return result
    }

    // Layer 3: Minimal Fallback
    return this.handleMinimalFallback(text, startTime)
  }

  /**
   * 處理空輸入
   */
  private handleEmptyInput(startTime: number): ExplainResponse {
    const minimal = minimalFallback('')
    const emptyMarkdown = `## 📝 題目

請輸入題目

## ✅ 答案

-

## 🧠 詳解

請輸入題目內容以生成詳解`

    return {
      markdown: emptyMarkdown,
      status: minimal.status,
      meta: {
        ...minimal.meta,
        totalElapsedMs: Date.now() - startTime,
      },
    }
  }

  /**
   * 處理 Minimal Fallback
   */
  private handleMinimalFallback(text: string, startTime: number): ExplainResponse {
    const minimal = minimalFallback(text)
    console.log('[ExplainService] ⚠️ Using minimal fallback', {
      elapsedMs: minimal.meta.elapsedMs,
      hint: minimal.meta.hint,
    })

    const minimalMarkdown = `## 📝 題目

${minimal.question}

${minimal.options.length > 0 ? `## 🔡 選項

${minimal.options.map((opt) => `(${opt.key}) ${opt.text}`).join('\n\n')}

` : ''}## ✅ 答案

${minimal.answer !== '-' ? `**${minimal.answer}**` : '-'}

## 🧠 詳解

${minimal.reason !== '-' ? minimal.reason : '無法生成詳細解析，請檢查題目格式'}

## 💡 解題技巧

- **主題識別**：找出段落主題與最能概括的選項
- **細節比對**：核對選項細節是否與原文一致
- **上下文**：選能補足或延伸主旨的選項
- **排除法**：先剔除不相干或與原文矛盾者`

    return {
      markdown: minimalMarkdown,
      status: minimal.status,
      meta: {
        ...minimal.meta,
        totalElapsedMs: Date.now() - startTime,
      },
    }
  }

  /**
   * 將 Basic Extractor 結果轉換為 Markdown 格式
   */
  private convertBasicToMarkdown(basic: any): string {
    // 如果 reason 是 '-' 或空，提供更友好的提示
    const reasonText = basic.reason !== '-' && basic.reason ? 
      basic.reason : 
      '請根據選項和題目上下文來判斷答案'
    
    return `## 📝 題目

${basic.question}

## 🔡 選項

${basic.options.map((opt: any) => `(${opt.key}) ${opt.text}`).join('\n\n')}

## ✅ 答案

${basic.answer !== '-' ? `**${basic.answer}** — ${basic.options.find((opt: any) => opt.key === basic.answer)?.text || ''}` : '-'}

## 🧠 詳解

${reasonText}

## 💡 解題技巧

- **主題識別**：找出段落主題與最能概括的選項
- **細節比對**：核對選項細節是否與原文一致
- **上下文**：選能補足或延伸主旨的選項
- **排除法**：先剔除不相干或與原文矛盾者`
  }

  /**
   * 處理請求解析錯誤
   */
  handleParseError(startTime: number, cause: string): ExplainResponse {
    const minimal = minimalFallback('')
    return {
      markdown: `## 📝 題目

無法解析請求

## ✅ 答案

-

## 🧠 詳解

⚠️ 請求格式錯誤，請檢查輸入`,
      status: minimal.status,
      meta: {
        ...minimal.meta,
        totalElapsedMs: Date.now() - startTime,
        failureCause: cause,
      },
    }
  }

  /**
   * 處理驗證錯誤
   */
  handleValidationError(startTime: number, errorMessage: string): ExplainResponse {
    const minimal = minimalFallback('')
    return {
      markdown: `## 📝 題目

請求格式錯誤

## ✅ 答案

-

## 🧠 詳解

⚠️ 請檢查請求格式`,
      status: minimal.status,
      meta: {
        ...minimal.meta,
        totalElapsedMs: Date.now() - startTime,
        failureCause: errorMessage,
      },
    }
  }

  /**
   * 處理關鍵錯誤（最後的 fallback）
   */
  handleCriticalError(startTime: number, error: Error | string): ExplainResponse {
    const errorMessage = error instanceof Error ? error.message : error
    const minimal = minimalFallback('')
    const errorMarkdown = `## 📝 題目

無法解析題目

## ✅ 答案

-

## 🧠 詳解

⚠️ 無法生成詳解，請重試一次

${process.env.NODE_ENV === 'development' ? `\n錯誤訊息：${errorMessage}` : ''}`

    return {
      markdown: errorMarkdown,
      status: minimal.status,
      meta: {
        ...minimal.meta,
        totalElapsedMs: Date.now() - startTime,
        failureCause: errorMessage,
      },
    }
  }

  /**
   * 處理最終 fallback（如果所有方法都失敗）
   */
  handleFinalFallback(startTime: number, errorMessage: string): ExplainResponse {
    return {
      markdown: '## ⚠️ 服務暫時無法使用，請稍後再試',
      status: 'error',
      meta: {
        elapsedMs: Date.now() - startTime,
        totalElapsedMs: Date.now() - startTime,
        layer: 'minimal',
        failureCause: errorMessage,
      },
    }
  }
}
