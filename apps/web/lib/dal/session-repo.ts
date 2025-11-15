import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Session 記錄類型
 */
export interface SessionRecord {
  id: string
  subject: string
  prompt: string
  source_meta?: Record<string, any> | null
}

/**
 * Session 數據訪問層（Repo）
 * 
 * 職責：純數據庫操作，無業務邏輯
 */
export class SessionRepo {
  constructor(private db: SupabaseClient) {}

  /**
   * 根據 ID 獲取 Session
   */
  async getById(sessionId: string): Promise<SessionRecord | null> {
    const { data, error } = await this.db
      .from('solve_sessions')
      .select('id, subject, prompt, source_meta')
      .eq('id', sessionId)
      .maybeSingle()

    if (error) {
      console.error('[SessionRepo] Error getting session:', error)
      return null
    }

    return data
  }

  /**
   * 創建測驗會話
   */
  async createWarmupSession(data: {
    subject: string
    prompt: string
    source_meta: Record<string, any>
  }): Promise<string | null> {
    const { data: session, error: sessionError } = await this.db
      .from('solve_sessions')
      .insert(data)
      .select('id')
      .single()

    if (sessionError || !session) {
      console.error('[SessionRepo] Failed to create solve session:', sessionError)
      return null
    }

    return session.id
  }

  /**
   * 創建選項記錄
   */
  async createOptions(sessionId: string, options: Array<{
    concept_id: string | null
    label: string
    is_answer: boolean
    rank: number
    score: number
  }>): Promise<string[] | null> {
    const optionRows = options.map((option) => ({
      session_id: sessionId,
      ...option,
    }))

    const { data: insertedOptions, error: optionsError } = await this.db
      .from('solve_options')
      .insert(optionRows)
      .select('id, label, is_answer, rank')

    if (optionsError || !insertedOptions) {
      console.error('[SessionRepo] Failed to insert warmup options:', optionsError)
      return null
    }

    return insertedOptions.map((opt: any) => opt.id)
  }
}

