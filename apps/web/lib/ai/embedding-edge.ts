/**
 * Edge-compatible embedding function
 * Uses fetch API directly instead of OpenAI SDK for edge runtime compatibility
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings'

/**
 * Generate embedding using OpenAI API via fetch (edge-compatible)
 * @param text Text to embed
 * @returns Embedding vector (1536 dimensions)
 */
export async function embedText1536Edge(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  // ⚡ Check cache first (target: < 50ms for cache hits)
  // Use Edge-compatible cache (Web Crypto API + Upstash Redis)
  try {
    const { getCachedEmbedding, setCachedEmbedding } = await import('@/lib/cache/embedding-cache-edge')

    const cached = await getCachedEmbedding(text)
    if (cached) {
      return cached
    }

    // Cache miss - generate new embedding
    const embedding = await generateEmbedding(text)

    // Cache for future use (async, don't block)
    setCachedEmbedding(text, embedding).catch(err =>
      console.warn('[embedText1536Edge] Cache write failed:', err)
    )

    return embedding
  } catch (cacheError) {
    // If cache fails, fall back to direct generation
    console.warn('[embedText1536Edge] Cache error, using direct generation:', cacheError)
    return await generateEmbedding(text)
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const maxRetries = 3
  let delay = 100

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-large',
          input: text,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error?.message || `OpenAI API error: ${response.status}`
        )
      }

      const data = await response.json()
      const embedding = data.data?.[0]?.embedding

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response from OpenAI')
      }

      return embedding
    } catch (error) {
      console.warn(`[embedText1536Edge] Attempt ${attempt} failed:`, error)

      if (attempt === maxRetries) {
        throw error
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay *= 2
    }
  }

  throw new Error('Max retries exceeded for embedding generation')
}



