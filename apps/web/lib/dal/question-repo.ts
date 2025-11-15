import type { SupabaseClient } from '@supabase/supabase-js'
import type { KeypointRecord } from './keypoint-repo'

/**
 * 題目記錄類型
 */
export interface QuestionRecord {
  id: string
  prompt: string
  solution?: {
    outline?: string[]
    steps?: Array<{ title?: string; detail?: string }>
  } | null
  question_keypoints?: Array<{
    role: 'primary' | 'aux'
    keypoints: KeypointRecord
  }>
}

/**
 * 題目數據訪問層（Repo）
 * 
 * 職責：純數據庫操作，無業務邏輯
 */
export class QuestionRepo {
  constructor(private db: SupabaseClient) {}

  /**
   * 獲取題目的答案
   */
  async getAnswerById(questionId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('questions')
      .select('answer')
      .eq('id', questionId)
      .maybeSingle()

    if (error) {
      console.warn('[QuestionRepo] Unable to load question answer:', error)
      return null
    }

    const answer = data?.answer
    if (!answer) return null

    if (typeof answer === 'string') return answer
    if (Array.isArray(answer)) return answer.join(',')
    return null
  }

  /**
   * 根據 ID 載入題目
   */
  async getById(questionId: string): Promise<QuestionRecord | null> {
    const { data, error } = await this.db
      .from('questions')
      .select(
        `
        id,
        prompt,
        solution,
        question_keypoints (
          role,
          keypoints (
            id,
            code,
            name,
            description,
            category,
            strategy_template,
            error_patterns,
            related_points,
            embedding
          )
        )
      `
      )
      .eq('id', questionId)
      .maybeSingle()

    if (error) {
      console.warn('[QuestionRepo] Failed to load question:', error)
      return null
    }

    if (!data) return null

    return this.normalizeQuestionRecord(data)
  }

  /**
   * 根據 prompt 查找相似題目
   */
  async findSimilarByPrompt(subjectId: string, prompt: string): Promise<QuestionRecord | null> {
    const snippet = prompt.slice(0, 40)
    const { data, error } = await this.db
      .from('questions')
      .select(
        `
        id,
        prompt,
        solution,
        exams!inner(subject_id),
        question_keypoints (
          role,
          keypoints (
            id,
            code,
            name,
            description,
            category,
            strategy_template,
            error_patterns,
            related_points,
            embedding
          )
        )
      `
      )
      .eq('exams.subject_id', subjectId)
      .ilike('prompt', `%${snippet}%`)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('[QuestionRepo] Failed to find similar question:', error)
      return null
    }

    if (!data) return null

    return this.normalizeQuestionRecord(data)
  }

  /**
   * 正規化題目記錄（數據格式轉換）
   */
  private normalizeQuestionRecord(data: any): QuestionRecord {
    const normalizedKeypoints =
      (data.question_keypoints || [])
        .map((item: any) => {
          const kp = Array.isArray(item.keypoints) ? item.keypoints[0] : item.keypoints
          if (!kp) return null
          return {
            role: item.role,
            keypoints: kp as KeypointRecord,
          }
        })
        .filter(
          (item: any): item is { role: 'primary' | 'aux'; keypoints: KeypointRecord } =>
            Boolean(item)
        ) || []

    return {
      id: data.id,
      prompt: data.prompt,
      solution: data.solution,
      question_keypoints: normalizedKeypoints,
    }
  }
}

