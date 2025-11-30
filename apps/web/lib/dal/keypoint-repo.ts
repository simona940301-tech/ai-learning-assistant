import type { SupabaseClient } from '@supabase/supabase-js'
import type { KeypointRecord } from '@/lib/keypoint-utils'
// 重新導出類型以保持向後兼容
export type { KeypointRecord } from '@/lib/keypoint-utils'

/**
 * 科目記錄類型
 */
export interface SubjectRecord {
  id: string
  name: string
}

/**
 * 關鍵點數據訪問層（Repo）
 * 
 * 職責：純數據庫操作，無業務邏輯
 */
export class KeypointRepo {
  constructor(private db: SupabaseClient) {}

  /**
   * 根據名稱獲取科目
   */
  async getSubjectByName(subjectName: string): Promise<SubjectRecord | null> {
    const { data, error } = await this.db
      .from('subjects')
      .select('id, name')
      .eq('name', subjectName)
      .single()

    if (error) {
      console.error('[KeypointRepo] Error getting subject:', error)
      return null
    }

    return data
  }

  /**
   * 獲取科目的所有關鍵點
   */
  async getBySubjectId(subjectId: string): Promise<KeypointRecord[]> {
    const { data, error } = await this.db
      .from('keypoints')
      .select('*')
      .eq('subject_id', subjectId)

    if (error) {
      console.error('[KeypointRepo] Error getting keypoints:', error)
      return []
    }

    return data || []
  }
}
