import { SupabaseClient } from '@supabase/supabase-js'
import { calculateNextSRSState, SRSState, INITIAL_SRS_STATE } from './algorithm'

export async function reviewNote(
    supabase: SupabaseClient,
    noteId: string,
    quality: number // 0-5
) {
    // 1. Fetch current SRS state
    const { data: note, error } = await supabase
        .from('backpack_notes')
        .select('srs_data')
        .eq('id', noteId)
        .single()

    if (error || !note) {
        throw new Error('Note not found')
    }

    const currentState: SRSState = note.srs_data || INITIAL_SRS_STATE

    // 2. Calculate next state
    const nextState = calculateNextSRSState(currentState, quality)

    // 3. Update note
    const { error: updateError } = await supabase
        .from('backpack_notes')
        .update({
            srs_data: nextState,
            updated_at: new Date().toISOString()
        })
        .eq('id', noteId)

    if (updateError) {
        throw new Error('Failed to update review')
    }

    return nextState
}

export async function getDueReviews(supabase: SupabaseClient, userId: string, limit = 20) {
    const { data, error } = await supabase.rpc('get_due_reviews', {
        p_user_id: userId,
        p_limit: limit
    })

    if (error) {
        console.error('Failed to fetch due reviews:', error)
        return []
    }

    return data
}
