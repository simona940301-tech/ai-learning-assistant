import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Concept 記錄類型
 */
export interface ConceptRecord {
  id: string
  name: string
  ai_hint?: string | null
  recognition_cues?: string[] | null
}

/**
 * Concept 數據訪問層（Repo）
 * 
 * 職責：純數據庫操作，無業務邏輯
 */
export class ConceptRepo {
  constructor(private db: SupabaseClient) {}

  /**
   * 根據 ID 獲取 Concept
   */
  async getById(conceptId: string): Promise<ConceptRecord | null> {
    const { data, error } = await this.db
      .from('concepts')
      .select('id, name, ai_hint, recognition_cues')
      .eq('id', conceptId)
      .maybeSingle()

    if (error) {
      console.error('[ConceptRepo] Error getting concept:', error)
      return null
    }

    return data
  }

  /**
   * 根據 Keypoint ID 或 Code 映射到 Concept ID
   */
  async mapKeypointToConceptId(keypointId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('keypoint_concepts')
      .select('concept_id')
      .or(`keypoint_id.eq.${keypointId},keypoint_code.eq.${keypointId}`)
      .maybeSingle()

    if (error) {
      console.warn('[ConceptRepo] Unable to map keypoint to concept:', error)
      return null
    }

    return data?.concept_id ?? null
  }
}

