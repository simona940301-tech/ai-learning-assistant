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

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { universalExplainer } from '@/lib/ai/universal-explainer'
import { basicExtractor } from '@/lib/ai/basic-extractor'
import { minimalFallback } from '@/lib/ai/minimal-fallback'
import { safeText, safeMatch, safeTrim, safeToUpperCase } from '@/lib/safe-text'
import type { ExplainMode } from '@/lib/types'

// Feature flag for quick rollback
const UNIVERSAL_EXPLAINER_ENABLED = process.env.EXPLAIN_UNIVERSAL_ENABLED !== 'false'

const Schema = z.object({
  input: z.object({
    text: z.string().optional(),
    imageUrl: z.string().url().optional(),
  }),
  mode: z.enum(['fast', 'deep']).optional(),
  conservative: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await req.json()
    const { input, mode } = Schema.parse(body)
    const text = safeText(input.text, '')

    if (!text || text.trim().length === 0) {
      // Empty input → minimal fallback (Markdown format)
      const minimal = minimalFallback('')
      const emptyMarkdown = `## 📝 題目

請輸入題目

## ✅ 答案

-

## 🧠 詳解

請輸入題目內容以生成詳解`

      return NextResponse.json({
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

    // Layer 1: Universal Explainer
    if (UNIVERSAL_EXPLAINER_ENABLED) {
      try {
        const universal = await universalExplainer(text)
        // 只要有 markdown 就返回（即使有警告也返回）
        if (universal.markdown) {
          console.log('[api/explain] ✅ Universal layer success', {
            elapsedMs: universal.meta?.elapsedMs,
            markdownLength: universal.markdown.length,
            status: universal.status,
          })

          // 提取 answer 和 briefReason 從 markdown 或 structured
          let answer = ''
          let briefReason = '依據文意判定。'
          let kind: string = 'vocab'

          // 從 markdown 中提取答案
          const answerMatch = universal.markdown.match(/##\s*✅\s*答案\s*\n\n\*\*([A-E])\*\*/i) || 
                             universal.markdown.match(/答案[：:]\s*\*\*?([A-E])\*\*?/i)
          if (answerMatch) {
            answer = answerMatch[1]
          }

          // 從 structured 中提取答案
          if (universal.structured?.answer) {
            const structuredAnswerMatch = universal.structured.answer.match(/^([A-E])[^\w]/i)
            if (structuredAnswerMatch) {
              answer = structuredAnswerMatch[1]
            } else {
              answer = universal.structured.answer
            }
            briefReason = universal.structured.reasoning || briefReason
          }

          // 從 questions 或 sharedPassage 中提取答案（如果是多題）
          if (universal.questions && universal.questions.length > 0) {
            const firstQuestion = universal.questions[0]
            if (firstQuestion.explanation?.answer) {
              // 從 explanation.answer 中提取答案（格式可能是 "B among others" 或 "(1) B — among others"）
              const answerMatch = firstQuestion.explanation.answer.match(/\(?\d+\)?\s*([A-E])/i) || 
                                 firstQuestion.explanation.answer.match(/^([A-E])/i)
              if (answerMatch) {
                answer = answerMatch[1]
              } else {
                answer = firstQuestion.explanation.answer
              }
            }
            briefReason = firstQuestion.explanation?.reasoning || briefReason
            kind = (firstQuestion as any).kind || kind
          }

          if (universal.sharedPassage && universal.sharedPassage.questions && universal.sharedPassage.questions.length > 0) {
            const firstQuestion = universal.sharedPassage.questions[0]
            if (firstQuestion.explanation?.answer) {
              // 從 explanation.answer 中提取答案
              const answerMatch = firstQuestion.explanation.answer.match(/\(?\d+\)?\s*([A-E])/i) || 
                                 firstQuestion.explanation.answer.match(/^([A-E])/i)
              if (answerMatch) {
                answer = answerMatch[1]
              } else {
                answer = firstQuestion.explanation.answer
              }
            }
            briefReason = firstQuestion.explanation?.reasoning || briefReason
            kind = (firstQuestion as any).kind || kind
          }

          // 如果沒有找到答案，嘗試從 markdown 中提取
          if (!answer) {
            const markdownAnswerMatch = universal.markdown.match(/\*\*([A-E])\*\*/i)
            if (markdownAnswerMatch) {
              answer = markdownAnswerMatch[1]
            }
          }

          return NextResponse.json({
            // ExplainViewModel 格式
            kind: kind as any,
            mode: (mode || 'deep') as any,
            answer: answer || '-',
            briefReason: briefReason.substring(0, 25), // 限制長度
            fullExplanation: universal.markdown,
            // 保留原有格式
            markdown: universal.markdown,
            structured: universal.structured,
            questions: universal.questions,
            sharedPassage: universal.sharedPassage,
            status: universal.status,
            meta: {
              ...universal.meta,
              totalElapsedMs: Date.now() - startTime,
            },
          })
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

      return NextResponse.json({
        // ExplainViewModel 格式
        kind: 'vocab' as any, // 默認為 vocab，因為 Basic Extractor 不區分題型
        mode: (mode || 'deep') as any,
        answer: answerText || '-',
        briefReason: briefReasonText,
        fullExplanation: markdown,
        // 保留原有格式
        structured,
        markdown,
        status: basic.status,
        meta: {
          ...basic.meta,
          totalElapsedMs: Date.now() - startTime,
        },
      })
    } catch (error) {
      console.error('[api/explain] Basic layer failed:', error)
    }

    // Layer 3: Minimal Fallback - 轉換為 Markdown 格式
    const minimal = minimalFallback(text)
    console.log('[api/explain] ⚠️ Using minimal fallback', {
      elapsedMs: minimal.meta.elapsedMs,
      hint: minimal.meta.hint,
    })

    // 將 Minimal Fallback 結果轉換為 Markdown 格式
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

    // 提取答案和理由
    const answerText = minimal.answer !== '-' ? minimal.answer : ''
    const briefReasonText = minimal.reason !== '-' ? minimal.reason.substring(0, 25) : '無法生成詳細解析'

    return NextResponse.json({
      // ExplainViewModel 格式
      kind: 'vocab' as any, // 默認為 vocab
      mode: (mode || 'deep') as any,
      answer: answerText || '-',
      briefReason: briefReasonText,
      fullExplanation: minimalMarkdown,
      // 保留原有格式
      markdown: minimalMarkdown,
      status: minimal.status,
      meta: {
        ...minimal.meta,
        totalElapsedMs: Date.now() - startTime,
      },
    })
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

    return NextResponse.json({
      // ExplainViewModel 格式
      kind: 'vocab' as any,
      mode: (mode || 'deep') as any,
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
