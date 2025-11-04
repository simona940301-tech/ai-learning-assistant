import { createClient, SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

let supabaseClient: SupabaseClient | null = null
let openaiClient: OpenAI | null = null

function ensureSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient
  if (!supabaseUrl || !supabaseServiceKey) {
    const message = 'Supabase environment variables are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    console.warn(message)
    throw new Error(message)
  }
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
  return supabaseClient
}

function ensureOpenAI(): OpenAI {
  if (openaiClient) return openaiClient
  if (!openaiApiKey) {
    const message = 'OPENAI_API_KEY is not configured.'
    console.warn(message)
    throw new Error(message)
  }
  openaiClient = new OpenAI({ apiKey: openaiApiKey })
  return openaiClient
}

export const supabase = new Proxy(
  {},
  {
    get: (_target, property) => {
      const client = ensureSupabase()
      // @ts-expect-error - forward dynamic access
      return client[property]
    },
  },
) as SupabaseClient

export const openai = new Proxy(
  {},
  {
    get: (_target, property) => {
      const client = ensureOpenAI()
      // @ts-expect-error - forward dynamic access
      return client[property]
    },
  },
) as OpenAI

export async function generateEmbedding(text: string): Promise<number[]> {
  const maxRetries = 3
  let delay = 100

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ensureOpenAI().embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
      })
      
      return response.data[0].embedding
    } catch (error) {
      console.warn(`Embedding attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2
    }
  }
  
  throw new Error('Max retries exceeded')
}

export async function findSimilarConcepts(
  embedding: number[], 
  subject: string, 
  limit: number = 10
) {
  const { data, error } = await supabase.rpc('match_concepts', {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: limit,
    subject_filter: subject
  })

  if (error) {
    console.error('Error finding similar concepts:', error)
    return []
  }

  return data || []
}

export async function getConfusableConcepts(conceptId: string, subject: string) {
  const { data, error } = await supabase
    .from('concept_edges')
    .select(`
      dst_id,
      weight,
      concepts!concept_edges_dst_id_fkey(id, name)
    `)
    .eq('src_id', conceptId)
    .in('relation', ['confusable', 'nearby'])
    .order('weight', { ascending: false })

  if (error) {
    console.error('Error getting confusable concepts:', error)
    return []
  }

  return data || []
}

export async function getConceptById(conceptId: string) {
  const { data, error } = await supabase
    .from('concepts')
    .select('*')
    .eq('id', conceptId)
    .single()

  if (error) {
    console.error('Error getting concept:', error)
    return null
  }

  return data
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
