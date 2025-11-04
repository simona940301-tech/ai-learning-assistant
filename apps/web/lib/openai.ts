import OpenAI from 'openai'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ResponseFormat =
  | { type: 'json_object' }
  | { type: 'json_schema'; json_schema: { name: string; schema: Record<string, unknown> } }

export interface ChatCompletionOptions {
  model?: 'gpt-4o' | 'gpt-4o-mini'
  temperature?: number
  maxOutputTokens?: number
  responseFormat?: ResponseFormat
}

let cachedClient: OpenAI | null = null

function getClient(): OpenAI {
  if (cachedClient) return cachedClient

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  cachedClient = new OpenAI({ apiKey })
  return cachedClient
}

export async function chatCompletion(
  messages: ChatMessage[],
  { model = 'gpt-4o-mini', temperature = 0.2, maxOutputTokens, responseFormat }: ChatCompletionOptions = {}
): Promise<string> {
  const client = getClient()
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
    response_format: responseFormat,
  })

  const content = completion.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI chat completion returned empty content')
  }
  return content
}

export async function chatCompletionJSON<T>(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<T> {
  // If responseFormat is explicitly undefined, use text mode and parse manually
  // This allows arrays to be returned (json_object mode forces object returns)
  const useJsonObject = options.responseFormat !== undefined
  
  const raw = useJsonObject
    ? await chatCompletion(messages, { ...options, responseFormat: options.responseFormat ?? { type: 'json_object' } })
    : await chatCompletion(messages, { ...options, responseFormat: undefined })
  
  try {
    // Try to extract JSON array if wrapped in markdown or text
    let jsonStr = raw.trim()
    
    // Remove markdown code fences
    jsonStr = jsonStr.replace(/^```json\s*|\s*```$/gi, '').replace(/^```\s*|\s*```$/gi, '').trim()
    
    // Try to find JSON array in the response
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]) as T
    }
    
    // Try to find JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      return JSON.parse(objectMatch[0]) as T
    }
    
    // Fallback: parse entire string
    return JSON.parse(jsonStr) as T
  } catch (error) {
    throw new Error(`Failed to parse OpenAI JSON response: ${(error as Error).message}\nRaw: ${raw.substring(0, 500)}`)
  }
}

// 簡化的 API 調用函數，用於 tutor 端點
export async function callOpenAIResponse({ 
  input, 
  maxOutputTokens = 2048 
}: { 
  input: string
  maxOutputTokens?: number 
}): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: input
    }
  ]

  return chatCompletion(messages, { 
    model: 'gpt-4o-mini', 
    maxOutputTokens 
  })
}

/**
 * Streaming chat completion - yields text chunks as they arrive
 */
export async function* chatCompletionStream(
  messages: ChatMessage[],
  { model = 'gpt-4o-mini', temperature = 0.2, maxOutputTokens }: ChatCompletionOptions = {}
): AsyncGenerator<string, void, unknown> {
  const client = getClient()
  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
    stream: true,
  })

  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content
    if (content) {
      yield content
    }
  }
}
