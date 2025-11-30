import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Authorization Service - 統一授權邏輯
 * 
 * 職責：
 * - 角色檢查
 * - 購買驗證
 * - 餘額檢查
 */
export class AuthorizationService {
    constructor(private db: SupabaseClient) { }

    /**
     * 檢查使用者角色
     */
    async checkRole(userId: string, requiredRole: string): Promise<boolean> {
        const { data: profile, error } = await this.db
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()

        if (error || !profile) {
            return false
        }

        return profile.role === requiredRole
    }

    /**
     * 檢查使用者是否已購買/擁有項目
     */
    async checkPurchase(userId: string, itemId: string): Promise<{
        hasPurchased: boolean
        balance?: number
        price?: number
    }> {
        // 檢查是否已下載
        const { data: existing } = await this.db
            .from('user_question_sets')
            .select('id')
            .eq('user_id', userId)
            .eq('set_id', itemId)
            .maybeSingle()

        if (existing) {
            return { hasPurchased: true }
        }

        // 獲取題本價格
        const { data: questionSet } = await this.db
            .from('question_sets')
            .select('price')
            .eq('id', itemId)
            .single()

        const price = questionSet?.price || 0

        // 獲取使用者餘額
        const { data: profile } = await this.db
            .from('profiles')
            .select('coins')
            .eq('id', userId)
            .single()

        const balance = profile?.coins || 0

        return {
            hasPurchased: false,
            balance,
            price,
        }
    }

    /**
     * 檢查使用者餘額是否足夠
     */
    async checkBalance(userId: string, requiredAmount: number): Promise<{
        sufficient: boolean
        balance: number
        required: number
    }> {
        const { data: profile } = await this.db
            .from('profiles')
            .select('coins')
            .eq('id', userId)
            .single()

        const balance = profile?.coins || 0

        return {
            sufficient: balance >= requiredAmount,
            balance,
            required: requiredAmount,
        }
    }

    /**
     * 扣除使用者餘額（購買）
     */
    async deductBalance(userId: string, amount: number): Promise<{
        success: boolean
        newBalance?: number
        error?: string
    }> {
        // 先檢查餘額
        const balanceCheck = await this.checkBalance(userId, amount)

        if (!balanceCheck.sufficient) {
            return {
                success: false,
                error: `餘額不足。需要 ${amount} 金幣，目前只有 ${balanceCheck.balance} 金幣`,
            }
        }

        // 扣除餘額
        const { data, error } = await this.db
            .from('profiles')
            .update({ coins: balanceCheck.balance - amount })
            .eq('id', userId)
            .select('coins')
            .single()

        if (error) {
            return {
                success: false,
                error: error.message,
            }
        }

        return {
            success: true,
            newBalance: data.coins,
        }
    }
}
