/**
 * Unified Gemini API Client
 *
 * 統一的 Gemini API 客戶端，替換 OpenAI
 * 支持 text completion 和 JSON mode
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GeminiCompletionOptions {
  model?: 'gemini-2.0-flash-exp' | 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo'
  temperature?: number
  maxOutputTokens?: number
  jsonMode?: boolean
  responseFormat?: { type: 'json_object' | 'text' } // Backward compatibility with OpenAI API
}

let cachedClient: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  cachedClient = new GoogleGenerativeAI(apiKey)
  return cachedClient
}

/**
 * Convert ChatGPT-style messages to Gemini format
 */
function convertMessages(messages: ChatMessage[]): string {
  // Gemini doesn't have a "system" role, so we prepend system messages to user content
  const systemMessages = messages.filter(m => m.role === 'system').map(m => m.content)
  const conversationMessages = messages.filter(m => m.role !== 'system')

  let prompt = ''

  // Add system context at the beginning
  if (systemMessages.length > 0) {
    prompt += systemMessages.join('\n\n') + '\n\n'
  }

  // Add conversation
  for (const msg of conversationMessages) {
    if (msg.role === 'user') {
      prompt += msg.content + '\n\n'
    } else if (msg.role === 'assistant') {
      // For now, we mainly use single-turn requests, so this is for future multi-turn support
      prompt += `[Previous response: ${msg.content}]\n\n`
    }
  }

  return prompt.trim()
}

/**
 * Text completion (like OpenAI chatCompletion)
 */
export async function geminiCompletion(
  messages: ChatMessage[],
  {
    model = 'gemini-2.0-flash-exp',
    temperature = 0.3,
    maxOutputTokens, // Remove default 8192
  }: GeminiCompletionOptions = {}
): Promise<string> {
  const client = getClient()

  // Map OpenAI model names to Gemini equivalents
  let geminiModelName = model
  if (model === 'gpt-4o-mini' || model === 'gpt-4o' || model === 'gpt-4-turbo') {
    geminiModelName = 'gemini-2.0-flash-exp'
  }

  const geminiModel = client.getGenerativeModel({
    model: geminiModelName,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  })

  const prompt = convertMessages(messages)
  const result = await geminiModel.generateContent(prompt)
  const response = result.response

  // Log finish reason for debugging truncation issues
  const candidate = response.candidates?.[0]
  if (candidate) {
    console.log('[Gemini] Generation finished:', {
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings?.map(r => ({ category: r.category, probability: r.probability })),
      tokenCount: response.usageMetadata?.totalTokenCount
    })
  }

  let text = ''
  try {
    text = response.text()
  } catch (e) {
    console.error('[Gemini] Failed to get text from response (likely safety block):', e)
    // If blocked, try to get parts if available, or return a safety message
    if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
      text = candidate.content.parts.map(p => p.text).join('')
    } else {
      throw new Error(`Gemini generation blocked: ${candidate?.finishReason || 'Unknown'}`)
    }
  }

  if (!text) {
    throw new Error('Gemini completion returned empty content')
  }

  return text
}

/**
 * JSON completion (like OpenAI chatCompletionJSON)
 */
export async function geminiCompletionJSON<T>(
  messages: ChatMessage[],
  options: GeminiCompletionOptions = {}
): Promise<T> {
  const client = getClient()
  const modelName = options.model ?? 'gemini-2.0-flash-exp'
  const maxTokens = options.maxOutputTokens // Remove default 8192
  const temperature = options.temperature ?? 0.2

  // Map OpenAI model names to Gemini equivalents
  let geminiModelName = modelName
  if (modelName === 'gpt-4o-mini' || modelName === 'gpt-4o' || modelName === 'gpt-4-turbo') {
    geminiModelName = 'gemini-2.0-flash-exp'
  }

  const geminiModel = client.getGenerativeModel({
    model: geminiModelName,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json', // Enable JSON mode
    },
  })

  // Add JSON instruction to the prompt
  const jsonEnforcer: ChatMessage = {
    role: 'system',
    content: 'You MUST reply with a single valid JSON object only. No prose, no markdown, no code fences.',
  }

  const promptWithJsonEnforcer = [jsonEnforcer, ...messages]
  const prompt = convertMessages(promptWithJsonEnforcer)

  const result = await geminiModel.generateContent(prompt)
  const response = result.response
  const text = response.text()

  if (!text) {
    throw new Error('Gemini JSON completion returned empty content')
  }

  // Parse JSON
  try {
    return JSON.parse(text) as T
  } catch (error) {
    console.error('[Gemini] Failed to parse JSON response:', text.substring(0, 200))
    throw new Error('Gemini returned invalid JSON')
  }
}

/**
 * Alias for backward compatibility with OpenAI code
 */
export const chatCompletion = geminiCompletion
export const chatCompletionJSON = geminiCompletionJSON

/**
 * Streaming completion (like OpenAI streaming)
 */
export async function* geminiCompletionStream(
  messages: ChatMessage[],
  {
    model = 'gemini-2.0-flash-exp',
    temperature = 0.3,
    maxOutputTokens,
  }: GeminiCompletionOptions = {}
): AsyncGenerator<string> {
  const client = getClient()

  // Map OpenAI model names to Gemini equivalents
  let geminiModelName = model
  if (model === 'gpt-4o-mini' || model === 'gpt-4o' || model === 'gpt-4-turbo') {
    geminiModelName = 'gemini-2.0-flash-exp'
  }

  const geminiModel = client.getGenerativeModel({
    model: geminiModelName,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  })

  const prompt = convertMessages(messages)
  const result = await geminiModel.generateContentStream(prompt)

  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) {
      yield text
    }
  }
}

/**
 * Alias for backward compatibility
 */
export const chatCompletionStream = geminiCompletionStream
