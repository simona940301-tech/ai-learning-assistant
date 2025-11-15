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

const JSON_ENFORCER_MESSAGE: ChatMessage = {
  role: 'system',
  content: 'You MUST reply with a single JSON object only. No prose, no markdown, no code fences.',
}

export async function chatCompletionJSON<T>(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<T> {
  const client = getClient()
  const hasExplicitResponseFormat = Object.prototype.hasOwnProperty.call(options, 'responseFormat')

  const model = options.model ?? 'gpt-4o-mini'
  const maxTokens = options.maxOutputTokens ?? 1200
  const temperature = hasExplicitResponseFormat ? options.temperature ?? 0.2 : 0.15
  const responseFormat = hasExplicitResponseFormat ? options.responseFormat : { type: 'json_object' }

  const baseMessages = hasExplicitResponseFormat ? messages : [JSON_ENFORCER_MESSAGE, ...messages]

  const baseParams = {
    model,
    messages: baseMessages,
    temperature,
    max_tokens: maxTokens,
    response_format: responseFormat,
  }

  const primary = await client.chat.completions.create(baseParams as any)
  const primaryText = primary.choices?.[0]?.message?.content ?? ''
  const firstParse = parseJsonWithRepair<T>(primaryText)
  if (firstParse) {
    return firstParse
  }

  const repairPrompt: ChatMessage = {
    role: 'user',
    content:
      'Your last reply was invalid JSON (truncated or malformed). Return a single valid JSON object now, fixing any issues. Do NOT include explanations.',
  }

  const retryParams = {
    ...baseParams,
    messages: [...baseMessages, { role: 'assistant', content: primaryText }, repairPrompt],
  }

  const retry = await client.chat.completions.create(retryParams as any)
  const retryText = retry.choices?.[0]?.message?.content ?? ''
  const retryParse = parseJsonWithRepair<T>(retryText)
  if (retryParse) {
    return retryParse
  }

  const fallbackCandidate = sanitizeJsonCandidate(retryText || primaryText)
  const repaired = cheapRepair(fallbackCandidate)

  try {
    return JSON.parse(repaired) as T
  } catch (error) {
    const snippet = (retryText || primaryText || '').substring(0, 400)
    throw new Error(
      `Failed to parse OpenAI JSON response after retry: ${(error as Error).message}. Snippet: ${snippet}`
    )
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

function sanitizeJsonCandidate(raw: string): string {
  if (!raw) return ''
  let cleaned = raw.trim()

  cleaned = cleaned.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()

  const objectMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    return objectMatch[0]
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    return arrayMatch[0]
  }

  const firstBrace = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')
  const starts = [firstBrace, firstBracket].filter((index) => index >= 0)
  if (starts.length > 0) {
    const start = Math.min(...starts)
    cleaned = cleaned.slice(start)
  }

  return cleaned
}

function cheapRepair(input: string): string {
  let repaired = input
  repaired = repaired.replace(/```(?:json)?/gi, '').replace(/```/g, '')

  const openBraces = (repaired.match(/\{/g) ?? []).length
  const closeBraces = (repaired.match(/\}/g) ?? []).length
  if (closeBraces < openBraces) {
    repaired += '}'.repeat(openBraces - closeBraces)
  }

  const openBrackets = (repaired.match(/\[/g) ?? []).length
  const closeBrackets = (repaired.match(/]/g) ?? []).length
  if (closeBrackets < openBrackets) {
    repaired += ']'.repeat(openBrackets - closeBrackets)
  }

  return repaired
}

function parseJsonWithRepair<T>(raw: string): T | null {
  if (!raw) return null
  const candidate = sanitizeJsonCandidate(raw)
  if (!candidate) return null

  try {
    return JSON.parse(candidate) as T
  } catch {
    try {
      const repaired = cheapRepair(candidate)
      return JSON.parse(repaired) as T
    } catch {
      return null
    }
  }
}
