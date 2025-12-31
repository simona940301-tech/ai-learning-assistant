import { getServiceSupabaseClient } from '@/lib/supabase'

export async function create_wrongbook_entry(args: {
  userId: string
  questionId: string
  explanation: unknown
}): Promise<{ ok: boolean; entryId?: string; error?: string }> {
  try {
    if (!args.userId || !args.questionId) {
      return { ok: false, error: 'INVALID_INPUT:create_wrongbook_entry' }
    }

    const supabase = getServiceSupabaseClient()

    const { data: existing, error: existingError } = await supabase
      .from('error_book')
      .select('id')
      .eq('user_id', args.userId)
      .eq('question_id', args.questionId)
      .eq('status', 'active')
      .maybeSingle()

    if (existingError) {
      console.error('MCP:create_wrongbook_entry:select', existingError)
      throw existingError
    }

    const nowIso = new Date().toISOString()

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('error_book')
        .update({ last_attempted_at: nowIso })
        .eq('id', existing.id)

      if (updateError) {
        console.error('MCP:create_wrongbook_entry:update', updateError)
        throw updateError
      }

      return { ok: true, entryId: existing.id }
    }

    const { data, error: insertError } = await supabase
      .from('error_book')
      .insert({
        user_id: args.userId,
        question_id: args.questionId,
        status: 'active',
        last_attempted_at: nowIso,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('MCP:create_wrongbook_entry:insert', insertError)
      throw insertError
    }

    return { ok: true, entryId: data?.id }
  } catch (err) {
    console.error('MCP:create_wrongbook_entry', err)
    return { ok: false, error: 'FAILED_CREATE_WRONGBOOK_ENTRY' }
  }
}


