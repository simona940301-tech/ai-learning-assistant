import type { UniversalExplainResult } from '@/lib/ai/universal-explainer'

export interface FormattedExplain {
  title: string
  markdown: string
  metadata: {
    questionCount: number
    hasSharedPassage: boolean
    subject?: string
  }
}

/**
 * 統一的詳解結果格式化器
 * 將 UniversalExplainResult 轉換成適合儲存的格式
 */
export function formatExplainResult(result: UniversalExplainResult): FormattedExplain {
  // 1. 生成標題
  const title = generateTitle(result)

  // 2. 確保有 markdown 內容
  const markdown = generateMarkdown(result)

  // 3. 提取 metadata（移除硬編碼 english）
  const metadata = extractMetadata(result)

  return { title, markdown, metadata }
}

function generateTitle(result: UniversalExplainResult): string {
  // 優先順序：meta.title > 第一題題幹 > 預設標題
  if (result.meta?.title) return result.meta.title

  // 從 questions 中提取第一題
  if (result.questions?.[0]?.question) {
    return result.questions[0].question.substring(0, 50) + (result.questions[0].question.length > 50 ? '...' : '')
  }

  // 從 sharedPassage 中提取
  if (result.sharedPassage?.questions?.[0]?.question) {
    return result.sharedPassage.questions[0].question.substring(0, 50) + '...'
  }

  return '解題詳解'
}

function generateMarkdown(result: UniversalExplainResult): string {
  // 簡化：直接使用 markdown，如果沒有則生成簡單格式
  if (result.markdown && result.markdown.trim().length > 0) {
    return result.markdown
  }

  // 簡單 fallback：從 questions 生成基本格式
  let md = '# 解題詳解\n\n'

  if (result.questions?.length) {
    result.questions.forEach((q, i) => {
      md += `## 題目 ${i + 1}\n\n`
      if (q.question) md += `${q.question}\n\n`
      if (q.explanation?.answer) md += `**答案**: ${q.explanation.answer}\n\n`
      if (q.explanation?.reasoning) md += `**解析**: ${q.explanation.reasoning}\n\n`
    })
  } else {
    md += '詳解內容生成中...\n'
  }

  return md
}

function extractMetadata(result: UniversalExplainResult) {
  const questionCountFromQuestions = result.questions?.length;
  const questionCountFromShared = result.sharedPassage?.questions?.length;

  return {
    questionCount: questionCountFromQuestions ?? questionCountFromShared ?? 0,
    hasSharedPassage: !!result.sharedPassage,
    subject: result.meta?.subject,
  }
}
