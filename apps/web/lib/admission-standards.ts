/**
 * 級距轉換映射表
 * 根據第二張圖片中的級距對應分數表
 */

export interface StandardMapping {
  頂標: number
  前標: number
  均標: number
  後標: number
  底標: number
}

// 各科目的級距分數對應表
export const STANDARD_SCORES: Record<string, StandardMapping> = {
  國文: {
    頂標: 13,
    前標: 12,
    均標: 10,
    後標: 9,
    底標: 7,
  },
  英文: {
    頂標: 13,
    前標: 11,
    均標: 8,
    後標: 4,
    底標: 3,
  },
  數學A: {
    頂標: 11,
    前標: 9,
    均標: 6,
    後標: 4,
    底標: 3,
  },
  數學B: {
    頂標: 12,
    前標: 10,
    均標: 6,
    後標: 4,
    底標: 3,
  },
  社會: {
    頂標: 13,
    前標: 12,
    均標: 10,
    後標: 8,
    底標: 7,
  },
  自然: {
    頂標: 13,
    前標: 12,
    均標: 9,
    後標: 7,
    底標: 5,
  },
}

/**
 * 將級距文字轉換為實際分數
 * @param subject 科目名稱（國文、英文、數學A、數學B、社會、自然）
 * @param standard 級距文字（頂標、前標、均標、後標、底標）
 * @returns 對應的分數，如果無法轉換則返回 null
 */
export function convertStandardToScore(
  subject: string,
  standard: string | null | undefined
): number | null {
  if (!standard || standard === '--' || standard === '無') {
    return null
  }

  // 標準化科目名稱
  let subjectKey: string
  if (subject.includes('數學A') || subject === '數學A') {
    subjectKey = '數學A'
  } else if (subject.includes('數學B') || subject === '數學B') {
    subjectKey = '數學B'
  } else if (subject.includes('國文') || subject === '國文') {
    subjectKey = '國文'
  } else if (subject.includes('英文') || subject === '英文') {
    subjectKey = '英文'
  } else if (subject.includes('社會') || subject === '社會') {
    subjectKey = '社會'
  } else if (subject.includes('自然') || subject === '自然') {
    subjectKey = '自然'
  } else {
    // 預設嘗試使用原始名稱
    subjectKey = subject
  }

  const mapping = STANDARD_SCORES[subjectKey]
  if (!mapping) {
    console.warn(`[convertStandardToScore] Unknown subject: ${subjectKey}`)
    return null
  }

  const score = mapping[standard as keyof StandardMapping]
  if (score === undefined) {
    console.warn(`[convertStandardToScore] Unknown standard: ${standard} for subject: ${subjectKey}`)
    return null
  }

  return score
}

/**
 * 轉換英聽標準（保持原樣，因為可能是 A/B/C）
 */
export function convertEnglishListeningStandard(
  standard: string | null | undefined
): string | null {
  if (!standard || standard === '--' || standard === '無') {
    return null
  }
  return standard // 保持原樣（A/B/C 或級距）
}

