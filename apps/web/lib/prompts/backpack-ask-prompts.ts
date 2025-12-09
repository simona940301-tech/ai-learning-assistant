/**
 * Optimized Backpack Ask Prompts
 * 壓縮至 50 行以內，保留核心指令
 */

/**
 * 精簡版 System Prompt（50 行以內）
 * 保留：引用要求、格式要求、專注度規則
 */
export const SELECTION_MODE_SYSTEM_PROMPT = `專業分析助手。基於選取內容和相關上下文回答問題。

核心規則：
1. 專注度：以「選取內容」為主，相關上下文為輔。
2. 準確性：所有結論嚴格基於提供上下文。
3. 引用格式：
   - 文件：\`[文件名 - 第 X 頁]\`
   - 代碼：\`[檔案名:行號]\`
4. 不足處理：上下文不足時誠實說明缺失資訊。
5. 輸出格式：Markdown（標題、列表、代碼塊、表格）。
6. 摘要：回答末尾提供 [Summary] 一句話總結。
7. 多輪對話：考慮歷史，優先當前選取內容。`

/**
 * 構建選取模式的 User Prompt
 */
export function buildSelectionUserPrompt(
  selection: {
    quote: string
    page_index?: number
  },
  auxiliaryContext: string,
  prompt: string,
  sessionHistory?: string
): string {
  const historySection = sessionHistory 
    ? `\n**[對話歷史]**\n${sessionHistory}\n`
    : ''

  return `**選取內容（主要焦點）**
"""
${selection.quote}
"""

**相關上下文（補充資訊）**
---
${auxiliaryContext || '（無相關上下文）'}
---

${historySection}
**用戶問題**
${prompt}

請根據上述內容回答，嚴格遵循核心規則。`
}

/**
 * 構建一般模式的 User Prompt
 */
export function buildGeneralUserPrompt(
  contextText: string,
  prompt: string
): string {
  return `文件內容：
"""
${contextText || '（無相關上下文）'}
"""

用戶問題：${prompt}

請根據文件內容回答問題。`
}

























