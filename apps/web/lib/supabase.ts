import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabaseBrowserInstance: SupabaseClient | null = null
let serviceClient: SupabaseClient | null = null

function ensureBrowserClient(): SupabaseClient {
  if (supabaseBrowserInstance) return supabaseBrowserInstance
  if (!supabaseUrl || !supabaseAnonKey) {
    const message =
      'Supabase browser client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    console.warn(message)
    throw new Error(message)
  }
  supabaseBrowserInstance = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseBrowserInstance
}

function ensureServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient
  if (!supabaseUrl || !supabaseServiceKey) {
    const message = 'Supabase service client is not configured. Set SUPABASE_SERVICE_ROLE_KEY (and URL if missing).'
    console.warn(message)
    throw new Error(message)
  }
  serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
  return serviceClient
}

export const supabaseBrowserClient = new Proxy(
  {},
  {
    get: (_target, property) => {
      const client = ensureBrowserClient()
      // @ts-expect-error - dynamic property access passthrough
      return client[property]
    },
  },
) as SupabaseClient

export const supabaseBrowser = supabaseBrowserClient

export function getServiceSupabaseClient(): SupabaseClient {
  return ensureServiceClient()
}

export interface BackpackNoteInsert {
  user_id: string
  question: string
  canonical_skill: string
  note_md: string
  created_at?: string
}

export async function saveBackpackNote(note: BackpackNoteInsert) {
  const client = ensureServiceClient()
  const payload = { ...note, created_at: note.created_at ?? new Date().toISOString() }
  const { data, error } = await client.from('backpack_notes').insert(payload).select().single()
  if (error) {
    throw new Error(`Failed to save backpack note: ${error.message}`)
  }
  return data
}
