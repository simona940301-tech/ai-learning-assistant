/**
 * Universal Explainer Helper Functions
 */

import type {
  SharedPassagePayload,
  IndependentListPayload,
  QuestionItem,
} from '@/lib/explain/types'
import { isSharedPayload, isIndependentList } from '@/lib/explain/types'

/**
 * 推導缺欄位列表（用於追蹤和日誌）
 */
export function inferMissingFields(
  data: SharedPassagePayload | IndependentListPayload
): string[] {
  const missing: string[] = []

  if (isSharedPayload(data)) {
    if (!data.sharedPassage || data.sharedPassage.trim().length === 0) {
      missing.push('sharedPassage')
    }
    if (!data.questions || data.questions.length === 0) {
      missing.push('questions')
    } else {
      data.questions.forEach((q, idx) => {
        if (!q.options || q.options.length === 0) {
          missing.push(`questions[${idx}].options`)
        }
        if (!q.explanation) {
          missing.push(`questions[${idx}].explanation`)
        } else {
          if (!q.explanation.answer) {
            missing.push(`questions[${idx}].explanation.answer`)
          }
          if (!q.explanation.reasoning) {
            missing.push(`questions[${idx}].explanation.reasoning`)
          }
        }
      })
    }
  } else if (isIndependentList(data)) {
    if (data.length === 0) {
      missing.push('questions (empty array)')
    } else {
      data.forEach((q, idx) => {
        if (!q.question) {
          missing.push(`questions[${idx}].question`)
        }
        if (!q.options || q.options.length === 0) {
          missing.push(`questions[${idx}].options`)
        }
        if (!q.explanation) {
          missing.push(`questions[${idx}].explanation`)
        } else {
          if (!q.explanation.answer) {
            missing.push(`questions[${idx}].explanation.answer`)
          }
          if (!q.explanation.reasoning) {
            missing.push(`questions[${idx}].explanation.reasoning`)
          }
        }
      })
    }
  }

  return missing
}

/**
 * 安全地轉換為 Markdown（避免轉換函數拋錯）
 */
export function safeConvertToMarkdown<T>(
  converter: (data: T) => string,
  data: T
): string {
  try {
    return converter(data)
  } catch (error) {
    console.error('[safeConvertToMarkdown] Conversion failed:', error)
    return '## 📝 題目\n\n無法解析題目\n\n## ✅ 答案\n\n-'
  }
}

/**
 * 將共用題幹格式轉換為 Markdown
 */
export function convertSharedPassageToMarkdown(
  data: SharedPassagePayload
): string {
  const counterpointsTexts = data.questions.map((q) => {
    const counterpointsText = q.explanation.counterpoints
      ? Object.entries(q.explanation.counterpoints)
          .map(([key, value]) => `${key}: ${value}`)
          .join('；')
      : ''
    return counterpointsText
  })

  const markdown = `## 📝 題目

${data.sharedPassage}

${data.questions
  .map((q, idx) => {
    const optionsText = q.options.map((opt) => opt).join('\n\n')
    const answerText = q.explanation.answer || '-'
    const reasoningText = q.explanation.reasoning || '無法生成詳細解析'
    const counterpointsText = counterpointsTexts[idx] || ''

    return `## 🔡 選項 ${idx + 1}

${optionsText}

## ✅ 答案 ${idx + 1}

${answerText}

## 🧠 詳解 ${idx + 1}

${reasoningText}

${counterpointsText ? `## ❌ 其他選項分析 ${idx + 1}\n\n${counterpointsText}` : ''}`
  })
  .join('\n\n---\n\n')}

${data.note ? `## 📘 延伸補充\n\n${data.note}` : ''}`

  return markdown
}

/**
 * 將獨立題目格式轉換為 Markdown
 */
export function convertQuestionsToMarkdown(
  questions: IndependentListPayload
): string {
  if (questions.length === 0) {
    return '## 📝 題目\n\n無法解析題目\n\n## ✅ 答案\n\n-'
  }

  // 單題或多題都統一處理
  const markdown = questions
    .map((q, idx) => {
      const questionText = q.question || '無法解析題目'
      const optionsText = q.options.map((opt) => opt).join('\n\n')
      const answerText = q.explanation.answer || '-'
      const reasoningText = q.explanation.reasoning || '無法生成詳細解析'
      const counterpointsText = q.explanation.counterpoints
        ? Object.entries(q.explanation.counterpoints)
            .map(([key, value]) => `${key}: ${value}`)
            .join('；')
        : ''

      return `## 📝 題目 ${questions.length > 1 ? idx + 1 : ''}

${questionText}

## 🔡 選項 ${questions.length > 1 ? idx + 1 : ''}

${optionsText}

## ✅ 答案 ${questions.length > 1 ? idx + 1 : ''}

${answerText}

## 🧠 詳解 ${questions.length > 1 ? idx + 1 : ''}

${reasoningText}

${counterpointsText ? `## ❌ 其他選項分析 ${questions.length > 1 ? idx + 1 : ''}\n\n${counterpointsText}` : ''}

${q.tips ? `## 💡 解題技巧 ${questions.length > 1 ? idx + 1 : ''}\n\n${q.tips}` : ''}`
    })
    .join('\n\n---\n\n')

  return markdown
}


