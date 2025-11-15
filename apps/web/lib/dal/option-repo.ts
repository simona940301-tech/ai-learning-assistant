import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Option 記錄類型
 */
export interface OptionRecord {
  id: string
  session_id: string | null
  label: string | null
  is_answer: boolean | null
  concept_id: string | null
}

/**
 * Option 數據訪問層（Repo）
 * 
 * 職責：純數據庫操作，無業務邏輯
 */
export class OptionRepo {
  constructor(private db: SupabaseClient) {}

  /**
   * 根據 ID 獲取 Option
   */
  async getById(optionId: string): Promise<OptionRecord | null> {
    const { data, error } = await this.db
      .from('solve_options')
      .select('id, session_id, label, is_answer, concept_id')
      .eq('id', optionId)
      .maybeSingle()

    if (error) {
      console.error('[OptionRepo] Error getting option:', error)
      return null
    }

    return data
  }

  /**
   * 獲取 Session 的正確答案 Option
   */
  async getCorrectAnswerBySessionId(sessionId: string): Promise<OptionRecord | null> {
    const { data, error } = await this.db
      .from('solve_options')
      .select('concept_id, label')
      .eq('session_id', sessionId)
      .eq('is_answer', true)
      .maybeSingle()

    if (error) {
      console.error('[OptionRepo] Error getting correct answer:', error)
      return null
    }

    return data
  }

  /**
   * 創建 Solve Response
   */
  async createResponse(data: {
    session_id: string
    option_id: string
    selected_concept_id: string | null
    is_correct: boolean
    latency_ms: number | null
    feedback: { rationale: string } | null
  }): Promise<void> {
    const { error } = await this.db.from('solve_responses').insert(data)

    if (error) {
      console.error('[OptionRepo] Error creating response:', error)
      throw error
    }
  }
}

