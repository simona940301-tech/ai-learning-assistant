import { SupabaseClient } from '@supabase/supabase-js'

export async function logShadowTest(
    supabase: SupabaseClient,
    userId: string,
    algorithmId: string,
    prediction: Record<string, any>,
    outcome: Record<string, any>,
    context: Record<string, any> = {}
) {
    try {
        await supabase.from('algo_shadow_logs').insert({
            user_id: userId,
            algorithm_id: algorithmId,
            prediction,
            outcome,
            context
        })
    } catch (error) {
        // Non-blocking error logging
        console.warn('[ShadowTest] Failed to log:', error)
    }
}
