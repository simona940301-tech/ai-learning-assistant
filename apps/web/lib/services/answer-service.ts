import type { OptionRepo, OptionRecord } from '@/lib/dal/option-repo'
import type { QuestionRepo } from '@/lib/dal/question-repo'
import type { ConceptRepo } from '@/lib/dal/concept-repo'
import type { TutorAnswerRequest, TutorAnswerResponse } from '@/src/schemas/answer'

/**
 * 答案服務（Service 層）
 * 
 * 職責：業務流程編排、業務規則封裝
 */
export class AnswerService {
  constructor(
    private optionRepo: OptionRepo,
    private questionRepo: QuestionRepo,
    private conceptRepo: ConceptRepo
  ) {}

  /**
   * 處理答案請求
   */
  async processAnswer(input: TutorAnswerRequest): Promise<TutorAnswerResponse> {
    const { questionId, userAnswer, option_id: optionId, session_id: sessionIdOverride, concept_id, keypoint_id } = input

    // Step 1: 解析 Concept ID（多種策略）
    let conceptId: string | null = concept_id ?? null
    let optionRecord = await this.resolveOption(optionId, conceptId)
    conceptId = conceptId ?? optionRecord?.concept_id ?? null

    if (!conceptId && keypoint_id) {
      conceptId = await this.conceptRepo.mapKeypointToConceptId(keypoint_id)
    }

    // Step 2: 解析 Session ID
    const sessionId = optionRecord?.session_id ?? sessionIdOverride ?? null

    // Step 3: 解析預期答案（多種策略）
    let expectedAnswer: string | null = null
    if (questionId && this.isValidUUID(questionId)) {
      expectedAnswer = await this.resolveExpectedAnswer(questionId, sessionId, optionRecord?.label ?? null)
    }

    if (!expectedAnswer && optionRecord?.is_answer) {
      expectedAnswer = optionRecord.label ?? null
    }

    if (!conceptId && sessionId && this.isValidUUID(sessionId)) {
      const correctOption = await this.optionRepo.getCorrectAnswerBySessionId(sessionId)
      if (correctOption) {
        conceptId = correctOption.concept_id ?? conceptId
        expectedAnswer = expectedAnswer ?? (correctOption.label ?? null)
      }
    }

    // Step 4: 判斷正確性
    const correct = this.deriveCorrectness(userAnswer, expectedAnswer, optionRecord?.is_answer ?? null)

    // Step 5: 獲取解析說明
    const rationale = await this.fetchRationale(conceptId, questionId || 'unknown')

    // Step 6: 記錄響應（如果有效）
    if (sessionId && optionId && this.isValidUUID(sessionId) && this.isValidUUID(optionId)) {
      try {
        await this.optionRepo.createResponse({
          session_id: sessionId,
          option_id: optionId,
          selected_concept_id: conceptId,
          is_correct: correct,
          latency_ms: null,
          feedback: rationale ? { rationale } : null,
        })
      } catch (error) {
        console.warn('[AnswerService] Failed to record solve response:', error)
      }
    }

    // Step 7: 返回結果
    return {
      correct,
      expected: expectedAnswer ?? null,
      concept_id: conceptId,
      rationale,
    }
  }

  /**
   * 解析 Option（如果提供 optionId）
   */
  private async resolveOption(
    optionId: string | undefined,
    existingConceptId: string | null
  ): Promise<OptionRecord | null> {
    if (!existingConceptId && optionId && this.isValidUUID(optionId)) {
      return await this.optionRepo.getById(optionId)
    }
    return null
  }

  /**
   * 解析預期答案（多種策略）
   */
  private async resolveExpectedAnswer(
    questionId: string,
    sessionId: string | null,
    optionLabel: string | null
  ): Promise<string | null> {
    // 策略 1: 從 Session 的正確答案獲取
    if (sessionId) {
      const correctOption = await this.optionRepo.getCorrectAnswerBySessionId(sessionId)
      if (correctOption?.label) {
        return correctOption.label
      }
    }

    // 策略 2: 從 Question 獲取答案
    const answer = await this.questionRepo.getAnswerById(questionId)
    if (answer) {
      return answer
    }

    return optionLabel
  }

  /**
   * 獲取解析說明
   */
  private async fetchRationale(conceptId: string | null, questionId: string): Promise<string | null> {
    if (!conceptId) return null

    try {
      const concept = await this.conceptRepo.getById(conceptId)
      if (!concept) return null

      if (concept.ai_hint) return concept.ai_hint
      if (Array.isArray(concept.recognition_cues) && concept.recognition_cues.length > 0) {
        return `考點提示：${concept.recognition_cues[0]}`
      }

      return `考點 ${concept.name} 與題目 ${questionId} 相關。`
    } catch (error) {
      console.warn('[AnswerService] Failed to fetch concept rationale:', error)
      return null
    }
  }

  /**
   * 判斷正確性
   */
  private deriveCorrectness(
    userAnswer: string,
    expectedAnswer: string | null,
    optionIsCorrect: boolean | null
  ): boolean {
    if (expectedAnswer) {
      return this.normalize(userAnswer) === this.normalize(expectedAnswer)
    }
    if (typeof optionIsCorrect === 'boolean') {
      return optionIsCorrect
    }
    return false
  }

  /**
   * 正規化答案字符串
   */
  private normalize(input: string | null | undefined): string {
    return (input ?? '').trim().toUpperCase()
  }

  /**
   * 驗證 UUID 格式
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
    return uuidRegex.test(str)
  }
}

