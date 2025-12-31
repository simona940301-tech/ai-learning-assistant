import { embedText1536 } from '@/lib/ai/embedding'
import { getServiceSupabaseClient } from '@/lib/supabase'

type DocChunkRow = {
  id: string
  file_id: string
  page_no: number
  chunk_idx: number
  content: string
  anchor: string
  similarity: number
}

type UserFileRow = {
  id: string
}

export async function get_scoped_context(args: {
  userId: string
  packId: string
  query: string
}): Promise<{ ok: boolean; context?: unknown; error?: string }> {
  try {
    return {
      ok: false,
      error: 'NOT_IMPLEMENTED_YET:get_scoped_context',
    }
  } catch (err) {
    console.error('MCP:get_scoped_context', err)
    return { ok: false, error: 'FAILED_GET_SCOPED_CONTEXT' }
  }
}

export async function init_backpack_file_upload(args: {
  userId: string
  fileMeta: unknown
}): Promise<{
  ok: boolean
  fileId?: string
  uploadUrl?: string
  error?: string
}> {
  try {
    return {
      ok: false,
      error: 'NOT_IMPLEMENTED_YET:init_backpack_file_upload',
    }
  } catch (err) {
    console.error('MCP:init_backpack_file_upload', err)
    return { ok: false, error: 'FAILED_INIT_BACKPACK_FILE_UPLOAD' }
  }
}

export async function retrieve_doc_chunks(args: {
  userId: string
  query: string
  topK?: number
}): Promise<{ ok: boolean; chunks?: unknown[]; error?: string }> {
  try {
    if (!args.userId || !args.query?.trim()) {
      return { ok: false, error: 'INVALID_INPUT:retrieve_doc_chunks' }
    }

    const supabase = getServiceSupabaseClient()
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('id')
      .eq('user_id', args.userId)

    if (filesError) {
      console.error('MCP:retrieve_doc_chunks:files', filesError)
      throw filesError
    }

    if (!files || files.length === 0) {
      return { ok: true, chunks: [] }
    }

    const embedding = await embedText1536(args.query)
    const { data, error } = await supabase.rpc('search_doc_chunks', {
      query_embedding: embedding,
      match_count: args.topK ?? 6,
      match_threshold: 0.2,
    })

    if (error) {
      console.error('MCP:retrieve_doc_chunks:rpc', error)
      throw error
    }

    const allowedIds = new Set((files as UserFileRow[]).map((file) => file.id))
    const filtered =
      (data as DocChunkRow[] | null)?.filter((chunk) => allowedIds.has(chunk.file_id)) ?? []

    return {
      ok: true,
      chunks: filtered,
    }
  } catch (err) {
    console.error('MCP:retrieve_doc_chunks', err)
    return { ok: false, error: 'FAILED_RETRIEVE_DOC_CHUNKS' }
  }
}


