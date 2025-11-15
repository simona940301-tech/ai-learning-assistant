import type { KeypointRecord } from '@/lib/keypoint-utils'
import type { QuestionRecord } from '@/lib/dal/question-repo'
import { pickDistractorKeypoints } from '@/lib/keypoint-utils'

/**
 * 構建解題響應的選項
 */
export interface BuildSolveResponseOptions {
  subjectName: string
  keypoint: KeypointRecord
  question: QuestionRecord | null
  allKeypoints: KeypointRecord[]
  mode: 'step' | 'fast'
  confidence: number
}

/**
 * 解題響應類型
 */
export interface SolveResponse {
  subject: string
  confidence: number
  detected_keypoint: string
  phase: 'solve'
  summary: string
  steps: string[]
  checks: string[]
  error_hints: string[]
  extensions: string[]
}

/**
 * 構建摘要
 */
export function buildSummary(keypoint: KeypointRecord, mode: 'step' | 'fast'): string {
  const description = keypoint.description ?? keypoint.name
  const firstCheck = keypoint.strategy_template?.checks?.[0]
  const firstStep = keypoint.strategy_template?.steps?.[0]

  if (mode === 'fast') {
    if (firstCheck) return `${description}，關鍵是在${firstCheck}。`
    if (firstStep) return `${description}，採用：${firstStep}。`
    return description
  }

  const segments = [description]
  if (firstStep) segments.push(firstStep)
  if (firstCheck) segments.push(firstCheck)
  return segments.filter(Boolean).join('；')
}

/**
 * 構建步驟列表
 */
export function buildSteps(
  keypoint: KeypointRecord,
  question: QuestionRecord | null,
  mode: 'step' | 'fast'
): string[] {
  if (mode === 'fast') return []

  const steps: string[] = []

  const solutionSteps = question?.solution?.steps
    ?.map((step) => step.detail || step.title)
    ?.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  if (solutionSteps && solutionSteps.length > 0) {
    steps.push(...solutionSteps)
  }

  const templateSteps = keypoint.strategy_template?.steps || []
  templateSteps.forEach((step) => {
    if (step && !steps.includes(step)) {
      steps.push(step)
    }
  })

  return steps.slice(0, 5)
}

/**
 * 構建檢查點列表
 */
export function buildChecks(keypoint: KeypointRecord, question: QuestionRecord | null): string[] {
  const checks = new Set<string>()
  keypoint.strategy_template?.checks?.forEach((check) => {
    if (check) checks.add(check)
  })
  question?.solution?.outline?.forEach((item) => {
    if (item) checks.add(item)
  })
  return Array.from(checks)
}

/**
 * 構建錯誤提示列表
 */
export function buildErrorHints(keypoint: KeypointRecord): string[] {
  const patterns = keypoint.error_patterns || []
  if (patterns.length === 0) return []

  return patterns.map(({ pattern, note }) => {
    if (note) {
      return `常見錯法：${pattern}。提示：${note}`
    }
    return `常見錯法：${pattern}`
  })
}

/**
 * 構建擴展關鍵點列表
 */
export function buildExtensions(primary: KeypointRecord, allKeypoints: KeypointRecord[]): string[] {
  if (primary.related_points && primary.related_points.length > 0) {
    return primary.related_points.slice(0, 2)
  }

  const recommendations = pickDistractorKeypoints(allKeypoints, primary, 2)
  return recommendations.map((kp) => kp.code)
}

/**
 * 構建解題響應（純函數）
 */
export function buildSolveResponse(options: BuildSolveResponseOptions): SolveResponse {
  const { subjectName, keypoint, question, allKeypoints, mode, confidence } = options

  const summary = buildSummary(keypoint, mode)
  const steps = buildSteps(keypoint, question, mode)
  const checks = buildChecks(keypoint, question)
  const errorHints = buildErrorHints(keypoint)
  const extensions = buildExtensions(keypoint, allKeypoints)

  return {
    subject: subjectName,
    confidence,
    detected_keypoint: keypoint.code,
    phase: 'solve',
    summary,
    steps,
    checks,
    error_hints: errorHints,
    extensions,
  }
}

