import type { IndependentListPayload } from '@/lib/explain/types'

/**
 * 將 Markdown 轉換為 Structured 格式（純函數）
 */
export function convertMarkdownToStructured(markdown: string): IndependentListPayload {
  let cleanedMarkdown = markdown.trim()
  
  // 移除對話上下文標記
  if (cleanedMarkdown.includes('【對話上下文】')) {
    const currentQuestionMatch = cleanedMarkdown.match(/【當前問題】\s*\n([\s\S]*)/)
    if (currentQuestionMatch && currentQuestionMatch[1]) {
      cleanedMarkdown = currentQuestionMatch[1].trim()
    } else {
      cleanedMarkdown = cleanedMarkdown.replace(/【對話上下文】[\s\S]*?(?=##|$)/, '')
    }
  }
  
  // 移除 Q: / A: 格式的對話標記
  if (cleanedMarkdown.includes('Q:') || cleanedMarkdown.includes('A:')) {
    const lines = cleanedMarkdown.split('\n')
    const lastQIndex = lines.findLastIndex(line => line.trim().startsWith('Q:'))
    if (lastQIndex >= 0) {
      cleanedMarkdown = lines.slice(lastQIndex).join('\n').replace(/^Q:\s*/, '').trim()
    }
  }
  
  // 移除狀態標記
  cleanedMarkdown = cleanedMarkdown.replace(/A:\s*詳解已生成\s*\n?/gi, '')
  cleanedMarkdown = cleanedMarkdown.replace(/詳解已生成\s*\n?/gi, '')
  
  // 解析 Markdown，提取關鍵資訊
  const questionMatch = cleanedMarkdown.match(/##\s*(?:📝|題目)\s*\n+([\s\S]*?)(?=\n##|$)/)
  const optionsMatch = cleanedMarkdown.match(/##\s*(?:🔡|🔘|選項)\s*\n+([\s\S]*?)(?=\n##|$)/)
  const answerMatch = cleanedMarkdown.match(/##\s*(?:✅|答案)\s*\n+([\s\S]*?)(?=\n##|$)/)
  const reasoningMatch = cleanedMarkdown.match(/##\s*(?:🧠|詳解)\s*\n+([\s\S]*?)(?=\n##|$)/)
  const tipsMatch = cleanedMarkdown.match(/##\s*(?:💡|解題技巧)\s*\n+([\s\S]*?)(?=\n##|$)/)
  
  // 提取題目
  let question = questionMatch ? questionMatch[1].trim() : ''
  question = question.replace(/【對話上下文】[\s\S]*?【當前問題】\s*/g, '')
  question = question.replace(/【當前問題】\s*/g, '')
  question = question.replace(/Q:\s*/g, '')
  
  // 提取選項
  const options = optionsMatch 
    ? optionsMatch[1]
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.trim().replace(/^[\(（]?[A-E][\)）]?\s*\.?\s*/, '').trim())
        .filter(opt => opt.length > 0)
    : []
  
  // 提取答案
  let answer = answerMatch ? answerMatch[1].trim() : '-'
  answer = answer.replace(/\*\*/g, '').replace(/^答案[：:]\s*/i, '').trim()
  
  // 提取詳解
  let reasoning = reasoningMatch ? reasoningMatch[1].trim() : ''
  
  // 如果 reasoning 是錯誤訊息，嘗試從其他地方提取
  if (!reasoning || 
      reasoning === '無法生成詳細解析' || 
      reasoning === '無法生成詳細解析，請檢查題目格式' ||
      reasoning === '無法解析詳解內容') {
    // 嘗試從答案中提取
    if (answerMatch) {
      const answerText = answerMatch[1]
      if (answerText.includes('—') || answerText.includes('–')) {
        const parts = answerText.split(/[—–]/)
        if (parts.length > 1) {
          reasoning = parts.slice(1).join(' ').trim()
        }
      }
    }
    // 如果還是沒有，使用更友好的提示
    if (!reasoning || 
        reasoning === '無法生成詳細解析' || 
        reasoning === '無法生成詳細解析，請檢查題目格式' ||
        reasoning === '無法解析詳解內容') {
      reasoning = '請根據選項和題目上下文來判斷答案'
    }
  }
  
  // 提取解題技巧
  const tips = tipsMatch ? tipsMatch[1].trim() : undefined
  
  // 提取錯誤選項解析
  const counterpointsMatch = cleanedMarkdown.match(/##\s*錯誤選項解析\s*\n+([\s\S]*?)(?=\n##|$)/i)
  let counterpoints: Record<string, string> | undefined = undefined
  if (counterpointsMatch) {
    const counterpointsText = counterpointsMatch[1]
    const lines = counterpointsText.split('\n').filter(line => line.trim())
    counterpoints = {}
    lines.forEach(line => {
      const match = line.match(/^[-*]\s*([A-E])[：:]\s*(.+)/i)
      if (match) {
        counterpoints![match[1].toUpperCase()] = match[2].trim()
      }
    })
    if (Object.keys(counterpoints).length === 0) {
      counterpoints = undefined
    }
  }

  return [{
    question: question || '無法解析題目',
    options,
    explanation: {
      answer: answer || '-',
      reasoning: reasoning || '無法解析詳解內容',
      ...(counterpoints && { counterpoints }),
    },
    ...(tips && { tips }),
  }]
}

