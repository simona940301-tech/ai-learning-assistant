import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 錯題本記錄
 */
export interface ErrorBookEntry {
    id: string
    userId: string
    questionId?: string
    skillId: string
    skillName: string
    noteContent: string
    masteryLevel: number
    createdAt: string
    updatedAt: string
}

/**
 * 錯題本輸入
 */
export interface CreateErrorBookEntryInput {
    userId: string
    skillId: string
    skillName: string
    noteContent: string
    masteryLevel?: number
    questionId?: string
}

/**
 * Error Book Repository - 錯題本數據訪問層
 * 
 * 職責：純數據庫操作，無業務邏輯
 */
export class ErrorBookRepo {
    constructor(private db: SupabaseClient) { }

    /**
     * 創建錯題本記錄
     */
    async create(input: CreateErrorBookEntryInput): Promise<ErrorBookEntry> {
        const { data, error } = await this.db
            .from('error_book')
            .insert({
                user_id: input.userId,
                question_id: input.questionId,
                skill_id: input.skillId,
                skill_name: input.skillName,
                note_content: input.noteContent,
                mastery_level: input.masteryLevel ?? 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (error) throw error

        return {
            id: data.id,
            userId: data.user_id,
            questionId: data.question_id,
            skillId: data.skill_id,
            skillName: data.skill_name,
            noteContent: data.note_content,
            masteryLevel: data.mastery_level,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        }
    }

    /**
     * 查找使用者的特定技能記錄
     */
    async findByUserAndSkill(
        userId: string,
        skillId: string
    ): Promise<ErrorBookEntry | null> {
        const { data, error } = await this.db
            .from('error_book')
            .select('*')
            .eq('user_id', userId)
            .eq('skill_id', skillId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.warn('[ErrorBookRepo] Find error:', error)
            return null
        }

        if (!data) return null

        return {
            id: data.id,
            userId: data.user_id,
            questionId: data.question_id,
            skillId: data.skill_id,
            skillName: data.skill_name,
            noteContent: data.note_content,
            masteryLevel: data.mastery_level,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        }
    }

    /**
     * 更新錯題本記錄
     */
    async update(
        id: string,
        updates: Partial<{
            noteContent: string
            masteryLevel: number
        }>
    ): Promise<ErrorBookEntry> {
        const { data, error } = await this.db
            .from('error_book')
            .update({
                ...updates,
                note_content: updates.noteContent,
                mastery_level: updates.masteryLevel,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return {
            id: data.id,
            userId: data.user_id,
            questionId: data.question_id,
            skillId: data.skill_id,
            skillName: data.skill_name,
            noteContent: data.note_content,
            masteryLevel: data.mastery_level,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        }
    }

    /**
     * 獲取使用者的所有錯題本記錄
     */
    async findByUser(userId: string): Promise<ErrorBookEntry[]> {
        const { data, error } = await this.db
            .from('error_book')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })

        if (error) {
            console.warn('[ErrorBookRepo] Find by user error:', error)
            return []
        }

        return (data || []).map(d => ({
            id: d.id,
            userId: d.user_id,
            questionId: d.question_id,
            skillId: d.skill_id,
            skillName: d.skill_name,
            noteContent: d.note_content,
            masteryLevel: d.mastery_level,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
        }))
    }
}
