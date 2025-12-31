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
  constructor(private db: SupabaseClient) { }

  /**
   * 獲取題目的答案
   *
   * ⚠️ 注意：此方法查詢 'questions' 表（舊架構）
   * 新題目應儲存在 seed_questions 表中
   * 保留此方法以維持向後相容性
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
   *
   * ⚠️ 注意：此方法查詢 'questions' 表（舊架構）
   * 新題目應儲存在 seed_questions 表中
   * 保留此方法以維持向後相容性
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
   *
   * ⚠️ 注意：此方法查詢 'questions' 表（舊架構）
   * 新題目應儲存在 seed_questions 表中
   * 保留此方法以維持向後相容性
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

  /**
   * 儲存原始題目（用於上傳流程）
   * 寫入 seed_questions 表（官方題庫）
   */
  async saveRawQuestion(data: {
    stem: string
    answer: string
    options?: string[]
    subject?: string
    tags?: string[]
    semanticHash?: string
  }): Promise<string> {
    // 將題目寫入 seed_questions 表
    const { data: inserted, error } = await this.db
      .from('seed_questions')
      .insert({
        source: 'upload',
        subject: data.subject || 'english',
        question_text: data.stem,
        option_a: data.options?.[0] || '',
        option_b: data.options?.[1] || '',
        option_c: data.options?.[2] || '',
        option_d: data.options?.[3] || '',
        correct_answer: data.answer,
        difficulty_level: 3, // 預設中等難度
        knowledge_tags: data.tags || [],
        is_official: false, // 上傳的題目標記為非官方
        is_active: true,
      })
      .select('id')
      .single()

    if (error) throw error
    return inserted.id
  }

  /**
   * 查找重複題目（基於文字相似度）
   * 在 seed_questions 表中搜尋
   */
  async findDuplicates(questionText: string): Promise<Array<{ id: string; prompt: string; semanticHash?: string }>> {
    // 使用前 50 個字元進行模糊搜尋
    const snippet = questionText.slice(0, 50)

    const { data, error } = await this.db
      .from('seed_questions')
      .select('id, question_text')
      .ilike('question_text', `%${snippet}%`)
      .limit(10)

    if (error) {
      console.warn('[QuestionRepo] Failed to find duplicates:', error)
      return []
    }

    // 轉換為統一格式
    return (data || []).map(q => ({
      id: q.id,
      prompt: q.question_text,
      semanticHash: undefined, // seed_questions 沒有 semantic_hash 欄位
    }))
  }

  /**
   * 更新題目（用於覆寫）
   * 更新 seed_questions 表
   */
  async updateQuestion(id: string, data: Partial<{
    prompt: string
    answer: string
    options: string[]
    tags: string[]
  }>): Promise<void> {
    // 轉換欄位名稱
    const updateData: any = {}
    if (data.prompt) updateData.question_text = data.prompt
    if (data.answer) updateData.correct_answer = data.answer
    if (data.options) {
      updateData.option_a = data.options[0] || ''
      updateData.option_b = data.options[1] || ''
      updateData.option_c = data.options[2] || ''
      updateData.option_d = data.options[3] || ''
    }
    if (data.tags) updateData.knowledge_tags = data.tags

    const { error } = await this.db
      .from('seed_questions')
      .update(updateData)
      .eq('id', id)

    if (error) throw error
  }
  /**
   * 創建原始題目記錄（Staging）
   */
  async createRawQuestion(source: string, rawData: any): Promise<string> {
    const { data, error } = await this.db
      .from('questions_raw')
      .insert({
        source,
        raw_data: rawData,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  /**
   * 獲取待處理的原始題目
   */
  async getPendingRawQuestions(limit: number = 10): Promise<RawQuestionRecord[]> {
    const { data, error } = await this.db
      .from('questions_raw')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.warn('[QuestionRepo] Failed to fetch pending raw questions:', error)
      return []
    }

    return (data || []).map(d => ({
      id: d.id,
      source: d.source,
      rawData: d.raw_data,
      status: d.status,
      errorMessage: d.error_message,
      processedQuestionId: d.processed_question_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))
  }

  /**
   * 更新原始題目狀態
   */
  async updateRawQuestionStatus(
    id: string,
    status: 'processing' | 'completed' | 'failed',
    updates?: { errorMessage?: string; processedQuestionId?: string }
  ): Promise<void> {
    const { error } = await this.db
      .from('questions_raw')
      .update({
        status,
        error_message: updates?.errorMessage,
        processed_question_id: updates?.processedQuestionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
  }
}

/**
 * 原始題目記錄類型
 */
export interface RawQuestionRecord {
  id: string
  source: string
  rawData: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
  processedQuestionId?: string
  createdAt: string
  updatedAt: string
}

