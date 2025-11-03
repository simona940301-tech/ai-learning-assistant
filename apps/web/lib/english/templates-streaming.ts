import { nanoid } from 'nanoid'
import { chatCompletionStream } from '@/lib/openai'
import type { OptionKey } from '@/lib/explain-normalizer'

/**
 * Reconstruct options from text when parser fails
 */
function reconstructOptionsFromText(text: string): Array<{ key: string; text: string }> {
  const labelRegex = /(?:^|\n)\s*[\(（]?([A-D])[\)）\.\、\s]/gim
  const matches: Array<{ key: string; index: number }> = []

  let match: RegExpExecArray | null
  while ((match = labelRegex.exec(text)) !== null) {
    matches.push({ key: match[1].toUpperCase(), index: match.index })
  }

  if (matches.length < 2) {
    return []
  }

  const reconstructed: Array<{ key: string; text: string }> = []
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]

    const startIdx = current.index + text.slice(current.index).indexOf(current.key) + 1
    const endIdx = next ? next.index : text.length

    const optionText = text
      .slice(startIdx, endIdx)
      .replace(/^[\)）\.\、\s]+/, '')
      .trim()
      .split(/\n/)[0]
      .trim()

    if (optionText && current.key <= 'D') {
      reconstructed.push({ key: current.key, text: optionText })
    }
  }

  return reconstructed.length >= 2 ? reconstructed : []
}

/**
 * Optimized E4 template with streaming support
 * Reduced prompt size (600 chars passage max), faster generation
 */
export async function* generateE4TemplateStream(
  stem: string,
  options: Array<{ key: string; text: string }>
): AsyncGenerator<{ type: string; data: any }, void, unknown> {
  const { parseReading } = await import('./reading-parser')
  const parsed = parseReading(stem)

  const passage = parsed.passage || ''
  const questions = parsed.questions || []
  const groupId = parsed.groupId || ''

  // Fallback if no questions parsed
  let finalQuestions = questions
  if (questions.length === 0 && options.length > 0) {
    finalQuestions = [
      {
        id: 1,
        qid: 'Q1',
        stem: stem.replace(/^.*?[?!.]\s*/i, '').trim() || '根據文章回答',
        options: options.map((opt) => ({ key: opt.key as OptionKey, text: opt.text })),
        answer: undefined,
        evidence: '',
        reason: '',
        groupId,
        raw: stem,
      },
    ]
  }

  // Reconstruct options if needed
  finalQuestions = finalQuestions.map((q) => {
    if (!q.options || q.options.length === 0) {
      const reconstructed = reconstructOptionsFromText(q.raw || stem)
      if (reconstructed.length > 0) {
        return { ...q, options: reconstructed.map((o) => ({ key: o.key as OptionKey, text: o.text })) }
      }
    }
    return q
  })

  // Use full passage (no truncation) to ensure complete context
  // Previous 600 char limit was causing context truncation issues
  const finalPassage = passage || stem

  // Enhanced prompt: same as non-streaming version for consistency
  const prompt = `你是英文閱讀理解專家。針對以下問題提供精準、清晰的詳解，就像人類老師一樣直接說明。

文章：
${finalPassage}

${finalQuestions.map((q, idx) => `問題 ${idx + 1}：${q.stem}
選項：
${q.options.map((opt) => `(${opt.key}) ${opt.text}`).join('\n')}`).join('\n\n')}

請為每個問題提供 JSON 格式回答（僅輸出 JSON，不要其他文字）：

[{
  "id": 1,
  "answer": "C",
  "reasoning": "The word 'dilemma' refers to the difficulty of shifting from one-size-fits-all standardized tests to student-centered assessments. The passage says, 'States are rethinking... student-centered assessments. Obviously, the task is difficult and time-consuming. Fortunately, modern technology can help solve this dilemma.' Hence, the dilemma is whether or not to adopt student-centered assessment.",
  "counterpoints": {
    "A": "只是舉例標準化測驗，與兩難無關。",
    "B": "只是法律背景，非段落重點。",
    "D": "文中說科技用來『解決』兩難，而非構成兩難。"
  },
  "evidence": "從文章中直接引用完整的證據句（必須是文章中的原句，不要改寫）"
}]

關鍵要求：
1. answer 欄位必須是單一字母（A、B、C 或 D），不要包含選項文字
   - 正確格式："answer": "D"
   - 錯誤格式："answer": "D — Option Text" 或 "answer": "Option D"

2. reasoning 必須是一段自然、連貫的推論句，直接說明為什麼正確答案是正確的
   - 必須引用原文證據句（使用引號標註）
   - 必須明確說明「文章中的 XXX 對應選項中的 YYY」
   - 使用自然語氣，不要使用「解題步驟」或「步驟一、步驟二」等格式
   - 應該像老師在旁邊解釋一樣：直接、精準、有邏輯

3. counterpoints 必須具體指出每個錯誤選項的錯誤原因（10-30字，簡潔明確）

4. evidence 必須是文章的完整原句（用於後續引用）

5. 禁止使用「解題步驟」「步驟一、步驟二」等格式化語言或空泛表達

Output JSON only.`

  // Stream response and parse incrementally
  // DO NOT yield raw text - only yield parsed question objects when complete
  let buffer = ''
  let currentQuestionIndex = 0

  yield { type: 'status', data: { stage: 'generating', questionIndex: 0, totalQuestions: finalQuestions.length, message: '正在分析問題...' } }

  try {
    for await (const chunk of chatCompletionStream(
      [{ role: 'user', content: prompt }],
      { model: 'gpt-4o-mini', temperature: 0.3 }
    )) {
      buffer += chunk

      // DO NOT yield raw text chunks - this causes "printing raw code" effect
      // Only yield parsed questions when JSON is complete

      // Try to parse complete JSON objects as they arrive
      try {
        // Look for complete JSON array in the buffer
        const jsonMatch = buffer.match(/\[\s*\{[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\})*\s*\]/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (Array.isArray(parsed) && parsed.length > currentQuestionIndex) {
            // New complete question(s) available - only yield when fully parsed
            for (let i = currentQuestionIndex; i < parsed.length; i++) {
              yield { type: 'question', data: { index: i, question: parsed[i] } }
              currentQuestionIndex = parsed.length
            }
          }
        }
      } catch {
        // Still parsing - do NOT yield anything, just continue accumulating
        // This prevents showing raw JSON during computation
      }
    }

    // Final parse attempt
    let jsonStr = buffer.trim()
    // Remove markdown code fences
    jsonStr = jsonStr.replace(/^```json\s*|\s*```$/gi, '').replace(/^```\s*|\s*```$/gi, '').trim()
    
    // Find JSON array
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      const finalAnswers = JSON.parse(arrayMatch[0])
      yield { type: 'complete', data: { answers: finalAnswers, passage: finalPassage, questions: finalQuestions, groupId } }
    } else {
      yield { type: 'error', data: { message: 'Failed to parse JSON response', buffer: buffer.substring(0, 200) } }
    }
  } catch (error) {
    yield { type: 'error', data: { message: (error as Error).message, buffer: buffer.substring(0, 200) } }
  }
}
