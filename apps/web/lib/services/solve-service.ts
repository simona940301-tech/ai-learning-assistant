import type { KeypointRepo } from '@/lib/dal/keypoint-repo'
import type { QuestionRepo } from '@/lib/dal/question-repo'
import type { SessionRepo } from '@/lib/dal/session-repo'
import type { KeypointRecord } from '@/lib/keypoint-utils'
import type { QuestionRecord } from '@/lib/dal/question-repo'
import { matchKeypointByPrompt } from '@/lib/keypoint-utils'
import { buildSolveResponse } from '@/lib/utils/solve-response-builder'

/**
 * 解題請求
 */
export interface SolveRequest {
  session_id?: string
  question_id?: string
  prompt?: string
  subject?: string
  keypoint_code?: string
  mode?: 'step' | 'fast'
}

/**
 * 解題響應
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
 * 解題服務（Service 層）
 * 
 * 職責：業務流程編排、業務規則封裝
 */
export class SolveService {
  constructor(
    private keypointRepo: KeypointRepo,
    private questionRepo: QuestionRepo,
    private sessionRepo: SessionRepo
  ) {}

  /**
   * 執行解題流程
   */
  async solve(request: SolveRequest): Promise<SolveResponse> {
    // Step 1: 載入 Session（如果提供）
    const session = request.session_id
      ? await this.sessionRepo.getById(request.session_id)
      : null

    if (request.session_id && !session) {
      throw new Error('SESSION_NOT_FOUND')
    }

    // Step 2: 解析科目
    const subjectName = (session?.subject || request.subject || '').trim()
    if (!subjectName) {
      throw new Error('SUBJECT_REQUIRED')
    }

    const subjectRecord = await this.keypointRepo.getSubjectByName(subjectName)
    if (!subjectRecord) {
      throw new Error('SUBJECT_NOT_FOUND')
    }

    // Step 3: 載入所有關鍵點
    const allKeypoints = await this.keypointRepo.getBySubjectId(subjectRecord.id)
    if (allKeypoints.length === 0) {
      throw new Error('KEYPOINTS_NOT_READY')
    }

    // Step 4: 載入題目（多種策略）
    const resolvedPrompt = session?.prompt || request.prompt || ''
    const question = await this.resolveQuestion({
      questionId: request.question_id,
      sessionQuestionId: session?.source_meta?.question_id,
      prompt: resolvedPrompt,
      subjectId: subjectRecord.id,
    })

    // Step 5: 匹配關鍵點（多種候選策略）
    const { keypoint, confidence } = await this.matchPrimaryKeypoint({
      keypointCode: request.keypoint_code,
      sessionKeypoint: session?.source_meta?.detected_keypoint,
      questionKeypoint: question?.question_keypoints?.find((kp) => kp.role === 'primary')?.keypoints?.code,
      prompt: resolvedPrompt,
      allKeypoints,
      sessionConfidence: session?.source_meta?.detection_confidence,
    })

    // Step 6: 構建響應
    return buildSolveResponse({
      subjectName,
      keypoint,
      question,
      allKeypoints,
      mode: request.mode || 'step',
      confidence,
    })
  }

  /**
   * 解析題目（多種策略）
   */
  private async resolveQuestion(options: {
    questionId?: string
    sessionQuestionId?: string
    prompt: string
    subjectId: string
  }): Promise<QuestionRecord | null> {
    const { questionId, sessionQuestionId, prompt, subjectId } = options

    // 策略 1: 使用提供的 question_id
    if (questionId) {
      const question = await this.questionRepo.getById(questionId)
      if (question) return question
    }

    // 策略 2: 使用 session 中的 question_id
    if (sessionQuestionId) {
      const question = await this.questionRepo.getById(sessionQuestionId)
      if (question) return question
    }

    // 策略 3: 根據 prompt 查找相似題目
    if (prompt) {
      const question = await this.questionRepo.findSimilarByPrompt(subjectId, prompt)
      if (question) return question
    }

    return null
  }

  /**
   * 匹配主要關鍵點（多種候選策略）
   */
  private async matchPrimaryKeypoint(options: {
    keypointCode?: string
    sessionKeypoint?: string
    questionKeypoint?: string
    prompt: string
    allKeypoints: KeypointRecord[]
    sessionConfidence?: number
  }): Promise<{ keypoint: KeypointRecord; confidence: number }> {
    const {
      keypointCode,
      sessionKeypoint,
      questionKeypoint,
      prompt,
      allKeypoints,
      sessionConfidence,
    } = options

    let primaryKeypoint: KeypointRecord | undefined
    let confidence = typeof sessionConfidence === 'number' ? sessionConfidence : 0.8

    // 候選關鍵點代碼列表（按優先級）
    const candidateCodes = [keypointCode, sessionKeypoint, questionKeypoint].filter(
      Boolean
    ) as string[]

    // 策略 1: 直接匹配候選代碼
    for (const code of candidateCodes) {
      const found = allKeypoints.find((kp) => kp.code === code)
      if (found) {
        primaryKeypoint = found
        break
      }
    }

    // 策略 2: 根據 prompt 進行語義匹配
    if (!primaryKeypoint && prompt) {
      const match = await matchKeypointByPrompt(prompt, allKeypoints)
      if (match?.keypoint) {
        primaryKeypoint = match.keypoint
        if (typeof match.similarity === 'number') {
          const similarityScore = Number(match.similarity.toFixed(2))
          confidence = Math.max(
            confidence,
            Math.min(0.99, Math.max(0.5, similarityScore || 0.85))
          )
        }
      }
    }

    // 策略 3: 降級到第一個關鍵點
    if (!primaryKeypoint) {
      primaryKeypoint = allKeypoints[0]
    }

    return {
      keypoint: primaryKeypoint,
      confidence: Number(Math.min(1, Math.max(0, confidence)).toFixed(2)),
    }
  }
}

