import type { KeypointRepo } from '@/lib/dal/keypoint-repo'
import type { SessionRepo } from '@/lib/dal/session-repo'
import type { KeypointRecord } from '@/lib/keypoint-utils'
import { classifySubject } from '@/lib/subject-classifier'
import { matchKeypointByPrompt, pickDistractorKeypoints } from '@/lib/keypoint-utils'

/**
 * 生成測驗請求
 */
export interface GenerateQuizRequest {
  prompt: string
  subject?: string
  detected_keypoint?: string
}

/**
 * 測驗選項
 */
export interface QuizOption {
  label: string
  keypoint_code: string
  is_correct: boolean
}

/**
 * 測驗響應
 */
export interface QuizResponse {
  phase: 'warmup'
  subject: string
  confidence: number
  detected_keypoint: string
  session_id: string
  stem: string
  options: Array<{
    option_id: string
    label: string
  }>
}

/**
 * 測驗生成結果
 */
export interface QuizGenerationResult {
  success: boolean
  quiz?: QuizResponse
  error?: string
  phase?: string
  message?: string
  subject?: string
  confidence?: number
}

/**
 * 測驗生成服務（Service 層）
 * 
 * 職責：業務流程編排、業務規則封裝
 */
export class QuizGenerationService {
  constructor(
    private keypointRepo: KeypointRepo,
    private sessionRepo: SessionRepo
  ) {}

  /**
   * 生成關鍵點 MCQ
   */
  async generateKeypointMCQ(request: GenerateQuizRequest): Promise<QuizGenerationResult> {
    const { prompt, subject: subjectInput, detected_keypoint } = request

    // Step 1: 檢測或使用提供的科目
    let subjectName = subjectInput
    let detectionConfidence = subjectInput ? 0.95 : 0

    if (!subjectName) {
      const detection = await classifySubject(prompt)
      subjectName = detection.subject !== 'unknown' ? detection.subject : undefined
      detectionConfidence = detection.confidence
    }

    if (!subjectName) {
      return {
        success: false,
        error: 'subject_required',
        phase: 'warmup',
        subject: 'unknown',
        confidence: detectionConfidence,
        message: '需手動確認學科',
      }
    }

    // Step 2: 獲取科目記錄
    const subjectRecord = await this.keypointRepo.getSubjectByName(subjectName)
    if (!subjectRecord) {
      return {
        success: false,
        error: 'subject_not_found',
        message: `科目 ${subjectName} 不存在`,
      }
    }

    // Step 3: 獲取關鍵點
    const keypoints = await this.keypointRepo.getBySubjectId(subjectRecord.id)
    if (!keypoints || keypoints.length < 4) {
      return {
        success: false,
        error: 'insufficient_keypoints',
        message: `科目 ${subjectName} 的關鍵點不足（需要至少 4 個）`,
      }
    }

    // Step 4: 匹配主要關鍵點
    const { primaryKeypoint, similarityScore } = await this.matchPrimaryKeypoint(
      prompt,
      detected_keypoint,
      keypoints
    )

    // Step 5: 生成干擾選項
    const distractors = pickDistractorKeypoints(keypoints, primaryKeypoint, 3)
    if (distractors.length < 3) {
      return {
        success: false,
        error: 'insufficient_distractors',
        message: '無法生成足夠的干擾選項',
      }
    }

    // Step 6: 構建選項
    const options: QuizOption[] = [
      {
        label: this.createCorrectStatement(primaryKeypoint),
        keypoint_code: primaryKeypoint.code,
        is_correct: true,
      },
      ...distractors.map((kp) => ({
        label: this.createDistractorStatement(kp),
        keypoint_code: kp.code,
        is_correct: false,
      })),
    ]

    // Step 7: 打亂選項
    const shuffled = this.shuffleArray(options)
    const answerIndex = shuffled.findIndex((opt) => opt.is_correct)

    // Step 8: 創建 Session
    const responseConfidence = Number(Math.min(1, Math.max(0, detectionConfidence)).toFixed(2))
    const sessionId = await this.createWarmupSession(
      subjectName,
      prompt,
      primaryKeypoint,
      similarityScore,
      shuffled,
      answerIndex,
      responseConfidence
    )

    if (!sessionId) {
      return {
        success: false,
        error: 'session_creation_failed',
        message: '無法創建測驗會話',
      }
    }

    // Step 9: 創建選項記錄
    const optionIds = await this.createOptionRecords(sessionId, shuffled)
    if (!optionIds) {
      return {
        success: false,
        error: 'options_creation_failed',
        message: '無法創建選項記錄',
      }
    }

    // Step 10: 構建響應
    return {
      success: true,
      quiz: {
        phase: 'warmup',
        subject: subjectName,
        confidence: responseConfidence,
        detected_keypoint: primaryKeypoint.code,
        session_id: sessionId,
        stem: this.createStem(primaryKeypoint),
        options: optionIds.map((id, index) => ({
          option_id: id,
          label: shuffled[index].label,
        })),
      },
    }
  }

  /**
   * 匹配主要關鍵點
   */
  private async matchPrimaryKeypoint(
    prompt: string,
    detectedKeypoint: string | undefined,
    keypoints: KeypointRecord[]
  ): Promise<{ primaryKeypoint: KeypointRecord; similarityScore?: number }> {
    let primaryKeypoint: KeypointRecord | undefined
    let similarityScore: number | undefined

    // 策略 1: 使用提供的 detected_keypoint
    if (detectedKeypoint) {
      primaryKeypoint = keypoints.find((kp) => kp.code === detectedKeypoint)
    }

    // 策略 2: 根據 prompt 進行語義匹配
    if (!primaryKeypoint) {
      const match = await matchKeypointByPrompt(prompt, keypoints)
      if (match?.keypoint) {
        primaryKeypoint = match.keypoint
        similarityScore = match.similarity
      }
    }

    // 策略 3: 降級匹配（名稱或描述包含）
    if (!primaryKeypoint) {
      const fallback = keypoints.find((kp) => {
        if (prompt.includes(kp.name)) return true
        if (kp.description && prompt.includes(kp.description.split('：')[0] ?? '')) return true
        return false
      })
      primaryKeypoint = fallback
    }

    // 策略 4: 使用第一個關鍵點
    if (!primaryKeypoint) {
      primaryKeypoint = keypoints[0]
    }

    return { primaryKeypoint, similarityScore }
  }

  /**
   * 創建題幹
   */
  private createStem(primaryKeypoint: KeypointRecord): string {
    return `下列哪一個描述最符合「${primaryKeypoint.name}」？`
  }

  /**
   * 創建正確選項描述
   */
  private createCorrectStatement(keypoint: KeypointRecord): string {
    if (keypoint.description) return keypoint.description
    const primaryStep = keypoint.strategy_template?.steps?.[0]
    if (primaryStep) {
      return `${keypoint.name}：${primaryStep}`
    }
    return `${keypoint.name} 的核心做法。`
  }

  /**
   * 創建干擾選項描述
   */
  private createDistractorStatement(distractor: KeypointRecord): string {
    const pattern = distractor.error_patterns?.[0]?.pattern
    const note = distractor.error_patterns?.[0]?.note
    if (pattern && note) {
      return `常見誤解：「${pattern}」，忽略了 ${note}`
    }
    if (pattern) {
      return `常見誤解：「${pattern}」`
    }
    if (note) {
      return `常見提醒：${note}`
    }
    return `${distractor.name}：容易和主考點混淆`
  }

  /**
   * 創建測驗會話
   */
  private async createWarmupSession(
    subjectName: string,
    prompt: string,
    primaryKeypoint: KeypointRecord,
    similarityScore: number | undefined,
    shuffledOptions: QuizOption[],
    answerIndex: number,
    responseConfidence: number
  ): Promise<string | null> {
    return await this.sessionRepo.createWarmupSession({
      subject: subjectName,
      prompt,
      source_meta: {
        phase: 'warmup',
        detected_keypoint: primaryKeypoint.code,
        similarity: similarityScore,
        options: shuffledOptions.map((option, index) => ({
          index: index + 1,
          label: option.label,
          keypoint_code: option.keypoint_code,
          is_correct: option.is_correct,
        })),
        answer_index: answerIndex + 1,
        detection_confidence: responseConfidence,
      },
    })
  }

  /**
   * 創建選項記錄
   */
  private async createOptionRecords(sessionId: string, shuffledOptions: QuizOption[]): Promise<string[] | null> {
    const options = shuffledOptions.map((option, index) => ({
      concept_id: null,
      label: option.label,
      is_answer: option.is_correct,
      rank: index,
      score: option.is_correct ? 1 : 0,
    }))

    return await this.sessionRepo.createOptions(sessionId, options)
  }

  /**
   * 打亂數組
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}

