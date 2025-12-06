/**
 * 學測級分標準對照表 (114學年度)
 * 用於將文字標準(頂標/前標/均標/後標/底標)轉換為實際級分
 */

export interface GsatStandard {
  top: number      // 頂標
  front: number    // 前標
  average: number  // 均標
  back: number     // 後標
  bottom: number   // 底標
}

// 114學年度學測各科成績標準一覽表
export const GSAT_STANDARDS_114: Record<string, GsatStandard> = {
  chinese: {
    top: 13,
    front: 12,
    average: 10,
    back: 9,
    bottom: 7,
  },
  english: {
    top: 13,
    front: 11,
    average: 8,
    back: 4,
    bottom: 3,
  },
  math_a: {
    top: 11,
    front: 9,
    average: 6,
    back: 4,
    bottom: 3,
  },
  math_b: {
    top: 12,
    front: 10,
    average: 6,
    back: 4,
    bottom: 3,
  },
  social: {
    top: 13,
    front: 12,
    average: 10,
    back: 8,
    bottom: 7,
  },
  natural: {
    top: 13,
    front: 12,
    average: 9,
    back: 7,
    bottom: 5,
  },
}

// 英聽標準 (A/B/C/F)
export const ENGLISH_LISTENING_STANDARDS = {
  A: 'A',
  B: 'B',
  C: 'C',
  F: 'F',
}

/**
 * 將文字標準轉換為級分數值
 * @param standard 文字標準 (頂標/前標/均標/後標/底標)
 * @param subject 科目 (chinese/english/math_a/math_b/social/natural)
 * @returns 級分數值，如果無法轉換則返回 null
 */
export function convertStandardToScore(
  standard: string | null | undefined,
  subject: keyof typeof GSAT_STANDARDS_114
): number | null {
  if (!standard || standard === '--' || standard.trim() === '') {
    return null
  }

  const normalizedStandard = standard.trim()
  const standards = GSAT_STANDARDS_114[subject]

  if (!standards) {
    return null
  }

  // 標準對照
  const standardMap: Record<string, keyof GsatStandard> = {
    '頂標': 'top',
    '前標': 'front',
    '均標': 'average',
    '後標': 'back',
    '底標': 'bottom',
  }

  const key = standardMap[normalizedStandard]
  if (key) {
    return standards[key]
  }

  // 如果直接是數字，嘗試解析
  const numericValue = parseInt(normalizedStandard, 10)
  if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 15) {
    return numericValue
  }

  return null
}

/**
 * 將英聽標準轉換為標準格式
 * @param listening 英聽標準 (A/B/C/F 或文字)
 * @returns 標準化的英聽等級
 */
export function convertEnglishListening(listening: string | null | undefined): string | null {
  if (!listening || listening === '--' || listening.trim() === '') {
    return null
  }

  const normalized = listening.trim().toUpperCase()

  if (normalized === 'A' || normalized === 'B' || normalized === 'C' || normalized === 'F') {
    return normalized
  }

  return null
}

/**
 * 批次轉換校系標準資料
 * @param data 包含文字標準的校系資料
 * @returns 包含級分數值的資料
 */
export interface DepartmentStandardInput {
  university_name: string
  department_name: string
  department_code?: string
  admission_quota?: number
  gender_requirement?: string
  requirement_chinese?: string
  requirement_english?: string
  requirement_math_a?: string
  requirement_math_b?: string
  requirement_social?: string
  requirement_natural?: string
  requirement_english_listening?: string
}

export interface DepartmentStandardOutput extends DepartmentStandardInput {
  score_chinese: number | null
  score_english: number | null
  score_math_a: number | null
  score_math_b: number | null
  score_social: number | null
  score_natural: number | null
  score_english_listening: string | null
}

export function convertDepartmentStandards(
  input: DepartmentStandardInput
): DepartmentStandardOutput {
  return {
    ...input,
    score_chinese: convertStandardToScore(input.requirement_chinese, 'chinese'),
    score_english: convertStandardToScore(input.requirement_english, 'english'),
    score_math_a: convertStandardToScore(input.requirement_math_a, 'math_a'),
    score_math_b: convertStandardToScore(input.requirement_math_b, 'math_b'),
    score_social: convertStandardToScore(input.requirement_social, 'social'),
    score_natural: convertStandardToScore(input.requirement_natural, 'natural'),
    score_english_listening: convertEnglishListening(input.requirement_english_listening),
  }
}
