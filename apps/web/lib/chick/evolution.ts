import { SupabaseClient } from '@supabase/supabase-js'

export type EvolutionStage = 0 | 1 | 2 | 3
export type EvolutionVariant = 'default' | 'math' | 'english' | 'balanced'

interface Profile {
    id: string
    chick_intimacy: number
    chick_evolution_stage: number
    chick_evolution_variant: string
    skill_mastery_json: Record<string, any>
}

// Evolution Requirements
const REQUIREMENTS: Record<number, { intimacy: number; battles: number }> = {
    0: { intimacy: 0, battles: 0 }, // Initial stage, no requirements
    1: { intimacy: 100, battles: 0 },    // Egg -> Baby
    2: { intimacy: 500, battles: 50 },   // Baby -> Child
    3: { intimacy: 2000, battles: 200 }, // Child -> Teen
}

export async function checkEvolution(
    supabase: SupabaseClient,
    userId: string
): Promise<{ evolved: boolean; newStage?: number; newVariant?: string }> {
    // Fetch profile and battle stats
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, chick_intimacy, chick_evolution_stage, chick_evolution_variant, skill_mastery_json')
        .eq('id', userId)
        .single()

    if (error || !profile) return { evolved: false }

    const { count: battleCount } = await supabase
        .from('match_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

    const currentStage = profile.chick_evolution_stage as EvolutionStage
    const nextStage = (currentStage + 1) as EvolutionStage

    // Check if max stage
    if (currentStage >= 3) return { evolved: false }

    const req = REQUIREMENTS[nextStage]

    // Check requirements
    if (profile.chick_intimacy >= req.intimacy && (battleCount || 0) >= req.battles) {
        let variant = profile.chick_evolution_variant

        // Determine variant at Stage 2 (Baby -> Child)
        if (nextStage === 2) {
            const mastery = profile.skill_mastery_json || {}
            const mathScore = mastery['math']?.score || 0
            const englishScore = mastery['english']?.score || 0

            if (mathScore > englishScore + 10) variant = 'math'
            else if (englishScore > mathScore + 10) variant = 'english'
            else variant = 'balanced'
        }

        // Update profile
        await supabase
            .from('profiles')
            .update({
                chick_evolution_stage: nextStage,
                chick_evolution_variant: variant,
            })
            .eq('id', userId)

        return { evolved: true, newStage: nextStage, newVariant: variant }
    }

    return { evolved: false }
}
