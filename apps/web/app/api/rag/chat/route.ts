import { NextRequest } from 'next/server'
// Force rebuild: 2025-12-04 v3
import { createClient } from '@/lib/supabase/server'
import { streamText, CoreMessage } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getApiUser, isMockModeEnabled } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
})

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { messages, contextFileIds } = body

        // 🎯 Convert UIMessage format to CoreMessage format
        const coreMessages: CoreMessage[] = (messages || []).map((msg: any) => {
            if (msg.content) {
                return {
                    role: msg.role,
                    content: msg.content
                } as CoreMessage
            }
            if (msg.parts && Array.isArray(msg.parts)) {
                const textParts = msg.parts.filter((p: any) => p.type === 'text')
                const content = textParts.map((p: any) => p.text).join('')
                return {
                    role: msg.role,
                    content: content
                } as CoreMessage
            }
            return {
                role: msg.role,
                content: ''
            } as CoreMessage
        })

        const lastMessage = coreMessages[coreMessages.length - 1]?.content as string || ''

        // ========================================
        // Step 1: Retrieve Files and Group by Storage Type
        // ========================================
        if (!contextFileIds || contextFileIds.length === 0) {
            return new Response('Please select at least one document', { status: 400 })
        }

        // 1. 驗證用戶身份 (Consistent with Upload Route)
        const { supabase, user } = await getApiUser(req)

        // Check for Mock Mode
        const isMockMode = isMockModeEnabled()
        let finalUser = user

        if (!user && isMockMode) {
            const mockUserId = process.env.BACKPACK_DEV_USER_ID || 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
            console.log('[Chat] Using mock user ID:', mockUserId)
            finalUser = { id: mockUserId } as any
        }

        // Note: If using Mock Mode without a real user, RLS might still block queries 
        // unless the Supabase client is configured to bypass RLS or RLS allows anon.
        // However, we assume consistency with Upload route is the key.

        const { data: files, error } = await supabase
            .from('rag_documents')
            .select('id, filename, original_text, storage_type, google_resource_id, token_count')
            .in('id', contextFileIds)

        if (error) {
            console.error('[Chat] Failed to retrieve files:', error)
            return new Response(`Failed to retrieve documents: ${error.message}`, { status: 500 })
        }

        if (!files || files.length === 0) {
            console.error('[Chat] No files found for IDs:', contextFileIds)
            // Diagnostic log
            console.log('[Chat] Auth Context:', {
                hasUser: !!user,
                isMockMode,
                finalUserId: finalUser?.id,
                requestedIds: contextFileIds
            })
            return new Response('No documents found', { status: 404 })
        }


        // Group files by storage type (treat NULL as legacy CONTEXT_CACHE)
        const contextCacheFiles = files.filter(f => !f.storage_type || f.storage_type === 'CONTEXT_CACHE')
        const fileSearchFiles = files.filter(f => f.storage_type === 'FILE_SEARCH')

        console.log(`[Chat] Files grouped: ${contextCacheFiles.length} Context Cache, ${fileSearchFiles.length} File Search`)


        // ========================================
        // Step 2: Route to Appropriate Strategy
        // ========================================

        // Strategy 1: Context Cache (Highest Quality)
        if (contextCacheFiles.length > 0 && fileSearchFiles.length === 0) {
            console.log('[Chat] 🎯 Using Context Cache Strategy')
            return await handleContextCacheStrategy(contextCacheFiles, coreMessages, lastMessage)
        }

        // Strategy 2: File Search (High Capacity)
        if (fileSearchFiles.length > 0) {
            console.log('[Chat] 🎯 Using File Search Strategy')
            return await handleFileSearchStrategy(fileSearchFiles, contextCacheFiles, coreMessages, lastMessage)
        }

        // Fallback: Direct prompting (no Google resources)
        console.log('[Chat] 🎯 Using Direct Prompting (Fallback)')
        return await handleDirectPromptingStrategy(files, coreMessages, lastMessage)

    } catch (error) {
        console.error('[Chat] Error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}

/**
 * Strategy 1: Context Cache
 * Uses pre-cached document content for maximum quality and speed
 */
async function handleContextCacheStrategy(
    files: any[],
    coreMessages: CoreMessage[],
    lastMessage: string
) {
    try {
        console.log(`[Chat] Handling Context Cache Strategy for ${files.length} files`)

        // If single file with valid cache, use it
        if (files.length === 1 && files[0].google_resource_id) {
            const cacheName = files[0].google_resource_id
            console.log(`[Chat] Using single cache: ${cacheName}`)

            const cacheManager = (genAI as any).cacheManager
            const cache = await cacheManager.get(cacheName)

            if (cache) {
                const model = genAI.getGenerativeModelFromCachedContent(cache)

                const history = coreMessages.slice(0, -1).map((msg: CoreMessage) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content as string }]
                }))

                const chat = model.startChat({ history })
                const result = await chat.sendMessageStream(lastMessage)

                const stream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of result.stream) {
                                const text = chunk.text()
                                if (text) {
                                    controller.enqueue(new TextEncoder().encode(text))
                                }
                            }
                            controller.close()
                        } catch (err) {
                            controller.error(err)
                        }
                    }
                })

                return new Response(stream, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'X-Strategy': 'CONTEXT_CACHE'
                    }
                })
            }
        }

        // Multiple files or no cache: fall back to direct prompting
        console.log('[Chat] Multiple Context Cache files or no cache, using direct prompting')
        return await handleDirectPromptingStrategy(files, coreMessages, lastMessage)

    } catch (error) {
        console.error('[Chat] Context Cache strategy failed:', error)
        return await handleDirectPromptingStrategy(files, coreMessages, lastMessage)
    }
}

/**
 * Strategy 2: File Search (RAG)
 * Uses Google File Search for large documents
 */
async function handleFileSearchStrategy(
    fileSearchFiles: any[],
    contextCacheFiles: any[],
    coreMessages: CoreMessage[],
    lastMessage: string
) {
    try {
        // Note: This is a placeholder implementation
        // The actual File Search API integration requires:
        // 1. Getting the user's File Search Store
        // 2. Ensuring all files are in the store
        // 3. Using the fileSearch tool with metadata filters

        console.warn('[Chat] File Search strategy not yet fully implemented')

        // For now, fall back to direct prompting
        return await handleDirectPromptingStrategy([...fileSearchFiles, ...contextCacheFiles], coreMessages, lastMessage)

    } catch (error) {
        console.error('[Chat] File Search strategy failed:', error)
        return await handleDirectPromptingStrategy([...fileSearchFiles, ...contextCacheFiles], coreMessages, lastMessage)
    }
}

/**
 * Fallback Strategy: Direct Prompting
 * Uses full document text in the prompt
 */
async function handleDirectPromptingStrategy(
    files: any[],
    coreMessages: CoreMessage[],
    lastMessage: string
) {
    console.log('[Chat] Starting Direct Prompting Strategy')

    if (!process.env.GEMINI_API_KEY) {
        console.error('[Chat] GEMINI_API_KEY is missing!')
        throw new Error('GEMINI_API_KEY is not set')
    }

    const contextText = files
        .map(doc => {
            const text = doc.original_text || ''
            return `--- File: ${doc.filename} ---\n${text.length > 0 ? text : '(No text content found)'}`
        })
        .join('\n\n')

    console.log(`[Chat] Context text length: ${contextText.length}`)

    const isSummaryRequest = /統整|重點|摘要|整理|總結/i.test(lastMessage)

    const systemPrompt = `你是一位專業的學術助教，專門協助學生理解文件內容。
請根據以下文件內容回答問題。

## 文件內容：
${contextText}

## 回答規則：
${isSummaryRequest && contextText.length > 100 ? `
**重點統整模式**：
- 生成結構化的重點統整，包含：
  1. 一頁摘要（100-200字）
  2. 分節要點（使用 H2/H3 標題 + bullet points）
  3. 考點/常錯警示（條列式）
  4. 快速複習卡（Q → A 格式，5-10條）
- 使用 Markdown 格式（## 標題、- 列表、**粗體**）
- 確保內容基於文件內容，不要編造資訊
` : `
- 主要根據文件內容回答
- 如果答案不在文件中，使用通用知識但需說明
- 使用 Markdown 格式（粗體、列表、程式碼區塊）
- 如果用戶要求摘要，提供結構化摘要
- 如果用戶要求測驗，生成多選題
`}

語氣：專業、鼓勵、學術`

    console.log('[Chat] Calling streamText with gemini-2.0-flash-exp')

    try {
        const result = await streamText({
            model: google('gemini-2.0-flash-exp'),
            system: systemPrompt,
            messages: coreMessages,
            onFinish: (event) => {
                console.log('[Chat] streamText finished. Usage:', event.usage)
            },
            onError: (error) => {
                console.error('[Chat] streamText error callback:', error)
            },
        })

        console.log('[Chat] streamText initiated successfully')
        return result.toTextStreamResponse()
    } catch (streamError) {
        console.error('[Chat] streamText failed:', streamError)
        throw streamError
    }
}
