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
  model?:
  | 'gemini-2.5-flash'      // ⚡ NEW: Fastest TTFT, recommended for quick queries
  | 'gemini-2.5-pro'        // ⚡ NEW: Best quality for complex analysis
  | 'gemini-2.0-flash-exp'  // Legacy: Still supported
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  | 'gpt-4o-mini'
  | 'gpt-4o'
  | 'gpt-4-turbo'
  temperature?: number
  maxOutputTokens?: number
  jsonMode?: boolean
  responseFormat?: { type: 'json_object' | 'text' } // Backward compatibility with OpenAI API
  useCase?: 'quick' | 'complex' // ⚡ NEW: Auto-select optimal model
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
 * Intelligent model selection based on use case
 * - quick: Gemini 2.5 Flash (fastest TTFT, best for simple queries)
 * - complex: Gemini 2.5 Pro (best quality for multi-step reasoning)
 */
function selectOptimalModel(options: GeminiCompletionOptions): string {
  // If model explicitly specified, use it
  if (options.model) {
    return mapModelName(options.model)
  }

  // Auto-select based on use case
  if (options.useCase === 'quick') {
    return 'gemini-2.5-flash'
  }

  if (options.useCase === 'complex') {
    return 'gemini-2.5-pro'
  }

  // Default: Use 2.5 Flash (best speed/quality balance)
  return 'gemini-2.5-flash'
}

/**
 * Map model names (including OpenAI aliases) to Gemini model names
 */
function mapModelName(model: string): string {
  // Map OpenAI model names to Gemini equivalents
  if (model === 'gpt-4o-mini' || model === 'gpt-4o' || model === 'gpt-4-turbo') {
    return 'gemini-2.5-flash' // Use latest Flash for OpenAI aliases
  }

  return model
}

/**
 * Optimize system prompt based on use case
 * - quick: Simplified prompt for faster TTFT
 * - complex: Detailed prompt for better quality
 */
function optimizeSystemPrompt(content: string, useCase?: 'quick' | 'complex'): string {
  // If no use case specified or complex, return original
  if (!useCase || useCase === 'complex') {
    return content
  }

  // For quick use case, simplify if it's a verbose system prompt
  // Only simplify if the prompt is longer than 100 chars (likely verbose)
  if (content.length > 100) {
    // Extract key instructions (preserve core requirements)
    const hasMarkdown = content.includes('Markdown') || content.includes('markdown')
    const hasCitation = content.includes('引用') || content.includes('來源') || content.includes('citation')
    const hasFormat = content.includes('格式') || content.includes('format')

    let simplified = '專業助手。'
    if (hasMarkdown) simplified += '使用 Markdown。'
    if (hasCitation) simplified += '引用來源。'
    if (hasFormat) simplified += '遵循格式要求。'
    simplified += '簡潔清晰。'

    return simplified
  }

  return content
}

/**
 * Convert ChatGPT-style messages to Gemini format with conditional optimization
 */
function convertMessages(messages: ChatMessage[], options?: GeminiCompletionOptions): string {
  // Gemini doesn't have a "system" role, so we prepend system messages to user content
  const systemMessages = messages.filter(m => m.role === 'system').map(m => {
    // ⚡ Optimize system prompts for quick use case
    return optimizeSystemPrompt(m.content, options?.useCase)
  })
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
  options: GeminiCompletionOptions = {}
): Promise<string> {
  const client = getClient()

  const {
    temperature = 0.3,
    maxOutputTokens,
  } = options

  // ⚡ Intelligent model selection
  const primaryModel = selectOptimalModel(options)
  const fallbackModel = primaryModel === 'gemini-2.5-pro' ? 'gemini-2.5-flash' : 'gemini-2.5-pro'

  // ⚡ Convert messages with conditional prompt optimization
  const prompt = convertMessages(messages, options)

  const runCompletion = async (modelName: string, tempOverride?: number) => {
    const geminiModel = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: tempOverride ?? temperature,
        maxOutputTokens,
      },
    })

    const result = await geminiModel.generateContent(prompt)
    const response = result.response
    const candidate = response.candidates?.[0]

    if (candidate) {
      console.log('[Gemini] Generation finished:', {
        model: modelName,
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
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        text = candidate.content.parts.map(p => p.text).join('')
      } else {
        throw new Error(`Gemini generation blocked: ${candidate?.finishReason || 'Unknown'}`)
      }
    }

    // If text is empty, try to salvage from parts
    if (!text && candidate?.content?.parts?.length) {
      text = candidate.content.parts.map(p => p.text || '').join('').trim()
    }

    return text.trim()
  }

  // Primary attempt
  const primaryText = await runCompletion(primaryModel)
  if (primaryText) return primaryText

  // Fallback: switch model + reduce temperature to avoid empty responses
  console.warn('[Gemini] Empty content from primary model, retrying with fallback model...')
  const fallbackText = await runCompletion(fallbackModel, Math.min(temperature, 0.25))
  if (fallbackText) return fallbackText

  throw new Error('Gemini completion returned empty content (after fallback)')
}

/**
 * JSON completion (like OpenAI chatCompletionJSON)
 */
export async function geminiCompletionJSON<T>(
  messages: ChatMessage[],
  options: GeminiCompletionOptions = {}
): Promise<T> {
  const client = getClient()
  const maxTokens = options.maxOutputTokens
  const temperature = options.temperature ?? 0.2

  // ⚡ Intelligent model selection
  const geminiModelName = selectOptimalModel(options)

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
  // ⚡ Convert messages with conditional prompt optimization
  const prompt = convertMessages(promptWithJsonEnforcer, options)

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
  options: GeminiCompletionOptions = {}
): AsyncGenerator<string> {
  const client = getClient()

  const {
    temperature = 0.3,
    maxOutputTokens,
  } = options

  // ⚡ Intelligent model selection
  const geminiModelName = selectOptimalModel(options)

  const geminiModel = client.getGenerativeModel({
    model: geminiModelName,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  })

  // ⚡ Convert messages with conditional prompt optimization
  const prompt = convertMessages(messages, options)
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
