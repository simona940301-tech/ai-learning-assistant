/**
 * Basic Extractor
 * 
 * Layer 2: 規則提取 + 簡短 AI 補句
 * 當 Universal Explainer 失敗時使用
 */

import { chatCompletionJSON } from '@/lib/gemini'
import { safeText, safeMatch, safeMatchAll, safeTrim, safeToUpperCase } from '@/lib/safe-text'

export interface BasicExtractResult {
  question: string
  options: Array<{ key: string; text: string }>
  answer: string
  reason: string
  status: 'basic'
  meta: {
    elapsedMs: number
    layer: 'basic'
    failureCause?: string
  }
}

/**
 * Extract question and options using simple regex rules
 */
function extractQuestionAndOptions(text: string): {
  question: string
  options: Array<{ key: string; text: string }>
} {
  const safeText = safeTrim(text, '')
  
  // Extract options: (A) text, （A）text, A) text, etc.
  // Improved pattern: handles full-width brackets and multi-line options
  // Match until next option marker or end of text
  const optionPattern = /[（(]\s*([A-EＡ-Ｅａ-ｅ])\s*[）)]\s*([\s\S]+?)(?=\s*[（(]\s*[A-EＡ-Ｅａ-ｅ]\s*[）)]|$)/gi
  const optionMatches = safeMatchAll(safeText, optionPattern)
  
  const options: Array<{ key: string; text: string }> = []
  const fullWidthMap: Record<string, string> = {
    'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E',
    'ａ': 'A', 'ｂ': 'B', 'ｃ': 'C', 'ｄ': 'D', 'ｅ': 'E',
  }
  
  for (const match of optionMatches) {
    const key = safeToUpperCase(fullWidthMap[match[1]] || match[1], '')
    let text = safeTrim(match[2] || '', '')
    
    // Handle long options (might contain passage text)
    // If option text is suspiciously long (>200 chars), try to find natural boundary
    if (text.length > 200) {
      // Look for natural sentence/paragraph break
      const sentenceEnd = Math.max(
        text.search(/[.!?]\s+/),
        text.search(/\n\n/),
        text.search(/[（(]\s*\d+\s*[）)]/), // Next numbered blank
        150 // Default limit
      )
      if (sentenceEnd > 0 && sentenceEnd < text.length) {
        text = text.substring(0, sentenceEnd + 1).trim()
      }
    }
    
    if (key && text && !options.find(opt => opt.key === key)) {
      options.push({ key, text })
    }
  }
  
  // Extract question: everything before first option
  // Improved: better handling of passage with numbered blanks
  let question = safeText
  
  if (optionMatches.length > 0) {
    // Find the first option marker position
    const firstOptionIndex = safeText.search(/[（(]\s*[A-EＡ-Ｅａ-ｅ]\s*[）)]/)
    
    if (firstOptionIndex > 0) {
      question = safeText.substring(0, firstOptionIndex).trim()
    }
    
    // If question is very long (>1000 chars), it might contain embedded options
    // Look for vocabulary section as a separator (e.g., "dialect n. 方言")
    if (question.length > 1000) {
      const vocabSectionMatch = safeText.match(/\n\s*[a-z]+\s+n\.\s+[^\n]+/i)
      if (vocabSectionMatch && vocabSectionMatch.index !== undefined) {
        const vocabIndex = vocabSectionMatch.index
        // Options usually come after vocabulary section
        // Try multiple patterns to find options start
        const patterns = ['(Ａ)', '(A)', '（Ａ）', '（A）']
        let optionsStartAfterVocab = -1
        for (const pattern of patterns) {
          const index = safeText.indexOf(pattern, vocabIndex)
          if (index > vocabIndex && (optionsStartAfterVocab === -1 || index < optionsStartAfterVocab)) {
            optionsStartAfterVocab = index
          }
        }
        
        if (optionsStartAfterVocab > vocabIndex && optionsStartAfterVocab < firstOptionIndex) {
          question = safeText.substring(0, optionsStartAfterVocab).trim()
        }
      }
    }
  }
  
  return {
    question: question || safeText.substring(0, 1000), // Limit question length
    options: options.slice(0, 4), // Limit to 4 options
  }
}

/**
 * Basic Extractor - Layer 2: 規則提取 + 簡短 AI
 */
export async function basicExtractor(inputText: string): Promise<BasicExtractResult> {
  const start = Date.now()
  
  try {
    // Step 1: Extract question and options using rules
    const { question, options } = extractQuestionAndOptions(inputText)
    
    // Step 2: Ask AI for one-sentence reason only
    const prompt = `英文考題：

題目：${question.substring(0, 500)}

${options.length > 0 ? `選項：\n${options.map(opt => `(${opt.key}) ${opt.text}`).join('\n')}\n` : ''}

請提供：
1) 答案（A/B/C/D，如果不確定請寫 "-"）
2) 一句話理由（≤ 30 字）

格式（JSON）：
{
  "answer": "A",
  "reason": "..."
}

Output JSON only:`

    const result = await chatCompletionJSON<{
      answer: string
      reason: string
    }>(
      [{ role: 'user', content: prompt }],
      {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        responseFormat: undefined,
        maxOutputTokens: 200, // 更短，更快
      }
    )

    return {
      question,
      options,
      answer: safeText(result.answer, '-'),
      reason: safeText(result.reason, '-'),
      status: 'basic',
      meta: {
        elapsedMs: Date.now() - start,
        layer: 'basic',
      },
    }
  } catch (error) {
    console.error('[BasicExtractor] Failed:', error)
    
    // Even if AI fails, return extracted structure
    const { question, options } = extractQuestionAndOptions(inputText)
    
    return {
      question,
      options,
      answer: '-',
      reason: '-',
      status: 'basic',
      meta: {
        elapsedMs: Date.now() - start,
        layer: 'basic',
        failureCause: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

