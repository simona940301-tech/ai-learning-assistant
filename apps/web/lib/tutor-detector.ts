// 題型偵測與分段系統

import type { QuestionSegment } from './tutor-types'

/**
 * 自動分段多題
 * 偵測邏輯：
 * 1. 有明確題號（1. 2. 或 1) 2)）
 * 2. 出現 4 個選項 (A)(B)(C)(D)
 * 3. 換行後出現新的題目特徵
 */
export function segmentQuestions(input: string): QuestionSegment[] {
  const segments: QuestionSegment[] = []

  // 先嘗試按題號分段
  const numberPattern = /(?:^|\n)\s*(\d+)[\.)]\s*/g
  const parts = input.split(numberPattern).filter(Boolean)

  if (parts.length > 2) {
    // 有明確題號
    for (let i = 0; i < parts.length; i += 2) {
      const index = parseInt(parts[i])
      const text = parts[i + 1]?.trim()
      if (text) {
        segments.push({
          index,
          text,
          choices: extractChoices(text),
          hasNumber: true,
        })
      }
    }
  } else {
    // 無題號，按選項組分段
    const choicePattern = /\([A-D]\)[^\(]+(?=\([A-D]\)|\n|$)/g
    const choiceSets: string[][] = []
    let currentSet: string[] = []

    const matches = input.match(choicePattern) || []
    matches.forEach((choice) => {
      currentSet.push(choice.trim())
      if (currentSet.length === 4) {
        choiceSets.push([...currentSet])
        currentSet = []
      }
    })

    if (choiceSets.length > 0) {
      choiceSets.forEach((choices, idx) => {
        // 找出選項前的題幹
        const firstChoice = choices[0]
        const stemEnd = input.indexOf(firstChoice)
        const prevStemEnd = idx > 0 ? input.indexOf(choiceSets[idx - 1][0]) : 0
        const stem = input.substring(prevStemEnd, stemEnd).trim()

        segments.push({
          index: idx + 1,
          text: stem + '\n' + choices.join('\n'),
          choices,
          hasNumber: false,
        })
      })
    } else {
      // 完全沒有選項，當作單題
      segments.push({
        index: 1,
        text: input.trim(),
        choices: undefined,
        hasNumber: false,
      })
    }
  }

  return segments
}

/**
 * 提取選項
 */
function extractChoices(text: string): string[] | undefined {
  const choicePattern = /\(([A-D])\)\s*([^\(\n]+)/g
  const choices: string[] = []
  let match

  while ((match = choicePattern.exec(text)) !== null) {
    choices.push(`(${match[1]}) ${match[2].trim()}`)
  }

  return choices.length === 4 ? choices : undefined
}

/**
 * 偵測科目與題型
 * 核心邏輯：分析任務意圖，不依賴主題詞
 */
export { detectSubjectAndType } from '@/legacy/types-deprecated'
