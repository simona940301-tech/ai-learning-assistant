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
  const raw = await chatCompletion(messages, { ...options, responseFormat: options.responseFormat ?? { type: 'json_object' } })
  try {
    return JSON.parse(raw) as T
  } catch (error) {
    throw new Error(`Failed to parse OpenAI JSON response: ${(error as Error).message}\nRaw: ${raw}`)
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
