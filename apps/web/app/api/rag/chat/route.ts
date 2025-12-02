import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamText, CoreMessage } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
})

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { messages, contextFileIds } = body

        // 🎯 轉換 UIMessage 格式為 CoreMessage 格式
        const coreMessages: CoreMessage[] = (messages || []).map((msg: any) => {
            // 如果已經是 CoreMessage 格式（有 content），直接使用
            if (msg.content) {
                return {
                    role: msg.role,
                    content: msg.content
                } as CoreMessage
            }
            // 如果是 UIMessage 格式（有 parts），提取文字內容
            if (msg.parts && Array.isArray(msg.parts)) {
                const textParts = msg.parts.filter((p: any) => p.type === 'text')
                const content = textParts.map((p: any) => p.text).join('')
                return {
                    role: msg.role,
                    content: content
                } as CoreMessage
            }
            // 默認情況
            return {
                role: msg.role,
                content: ''
            } as CoreMessage
        })

        // 1. Retrieve context and cache info from selected files
        let contextText = ''
        let validCacheName: string | null = null

        if (contextFileIds && contextFileIds.length > 0) {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('rag_documents')
                .select('original_text, filename, cache_name, cache_expires_at')
                .in('id', contextFileIds)

            if (!error && data) {
                contextText = data.map(doc => `--- File: ${doc.filename} ---\n${doc.original_text}`).join('\n\n')

                // 檢查是否有有效的 Context Cache（單一文件且未過期）
                if (data.length === 1 && data[0].cache_name && data[0].cache_expires_at) {
                    const expiresAt = new Date(data[0].cache_expires_at)
                    if (expiresAt > new Date()) {
                        validCacheName = data[0].cache_name
                        console.log('[Chat] 🚀 Using Context Cache:', validCacheName)
                    } else {
                        console.log('[Chat] ⚠️ Cache expired, using fallback')
                    }
                }
            }
        }

        // 2. 如果有有效 Cache，使用 Cache 進行串流
        if (validCacheName) {
            try {
                const cacheManager = genAI.cacheManager
                const cache = await cacheManager.get(validCacheName)

                if (cache) {
                    const model = genAI.getGenerativeModelFromCachedContent(cache)

                    // 構建對話歷史
                    const history = coreMessages.slice(0, -1).map((msg: CoreMessage) => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content as string }]
                    }))

                    const chat = model.startChat({ history })
                    const lastMessage = coreMessages[coreMessages.length - 1]?.content as string || ''

                    // 串流回應
                    const result = await chat.sendMessageStream(lastMessage)

                    // 創建 ReadableStream
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
                            'X-Cache-Status': 'HIT'
                        }
                    })
                }
            } catch (cacheError) {
                console.warn('[Chat] ⚠️ Cache retrieval failed, falling back:', cacheError)
            }
        }

        // 3. Fallback: 使用標準 Vercel AI SDK（無 Cache）
        console.log('[Chat] 📝 Using standard mode (no cache)')

        // 🎯 檢查是否有文件內容（但允許繼續，讓 AI 告知用戶）
        // 注意：我們不直接返回錯誤，而是讓 AI 告知用戶需要選擇文件
        // 這樣可以保持 streaming 回應的一致性

        // 🎯 檢測是否為「統整重點」相關指令
        const lastMessage = coreMessages[coreMessages.length - 1]?.content as string || ''
        const isSummaryRequest = /統整|重點|摘要|整理|總結/i.test(lastMessage)

        const systemPrompt = `你是一位專業的學術助教，專門協助學生理解文件內容。
請根據以下文件內容回答問題。

## 文件內容：
${contextText || '**尚未提供文件內容**'}

## 重要提醒：
${!contextText ? `
⚠️ **目前沒有選擇任何文件**。如果用戶要求「統整重點」或「摘要」，請明確告知：
「請先上傳並選擇文件，我才能為您整理重點。請點擊上方的「分析新文件」按鈕上傳文件。」
` : ''}

## 回答規則：
${isSummaryRequest && contextText ? `
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

        const result = await streamText({
            model: google('gemini-1.5-flash'), // ⚡ Corrected: gemini-1.5-flash
            system: systemPrompt,
            messages: coreMessages,
        })

        return result.toTextStreamResponse()

    } catch (error) {
        console.error('[Chat] Error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
