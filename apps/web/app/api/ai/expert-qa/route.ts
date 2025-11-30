import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * POST /api/ai/expert-qa
 *
 * 世界頂尖級別的 Expert Q&A 實現
 * - Server-Sent Events 流式輸出
 * - 0.2-0.5 秒首字響應
 * - ChatGPT 級別的用戶體驗
 */
export async function POST(req: NextRequest) {
    const startTime = Date.now()

    try {
        // 1. 驗證用戶
        const { supabase, user } = await getApiUser(req)
        if (!user) {
            return new Response('Unauthorized', { status: 401 })
        }

        // 2. 解析請求
        const { analysisId, question, selectedText } = await req.json()

        if (!analysisId || !question) {
            return new Response('Missing analysisId or question', { status: 400 })
        }

        console.log(`[Expert Q&A] 🔍 Question from user ${user.id}:`, question.substring(0, 100))

        // 3. 獲取分析結果（作為上下文）
        const { data: analysis, error: analysisError } = await supabase
            .from('file_analysis')
            .select('*')
            .eq('id', analysisId)
            .eq('user_id', user.id)
            .single()

        if (analysisError || !analysis) {
            console.error('[Expert Q&A] Analysis not found:', analysisError)
            return new Response('Analysis not found', { status: 404 })
        }

        console.log(`[Expert Q&A] 📚 Context loaded (${Date.now() - startTime}ms)`)

        // 4. 構建上下文增強 Prompt
        const contextPrompt = buildContextEnhancedPrompt(analysis, question, selectedText)

        console.log(`[Expert Q&A] 🤖 Starting Gemini streaming...`)

        // 5. ⭐ 創建 SSE 流式響應
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()

                try {
                    // 使用 Gemini Flash (最快的模型)
                    const model = genAI.getGenerativeModel({
                        model: 'gemini-2.0-flash-exp',
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 2048,
                        }
                    })

                    const result = await model.generateContentStream(contextPrompt)

                    let firstChunkTime: number | null = null
                    let fullResponse = ''

                    // ⭐ 逐塊發送數據
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text()
                        fullResponse += chunkText

                        if (!firstChunkTime) {
                            firstChunkTime = Date.now()
                            console.log(`[Expert Q&A] ⚡ First chunk in ${firstChunkTime - startTime}ms`)
                        }

                        // 發送 SSE 格式數據
                        const data = JSON.stringify({
                            type: 'chunk',
                            content: chunkText,
                            timestamp: Date.now()
                        })

                        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                    }

                    // 6. 提取引用來源（從完整響應中）
                    const sources = extractSourceReferences(fullResponse, analysis)

                    // 7. 生成後續問題建議
                    const followUpQuestions = generateFollowUpQuestions(question, fullResponse)

                    // 8. 發送完成訊號
                    const finalData = JSON.stringify({
                        type: 'complete',
                        sources,
                        followUpQuestions,
                        totalTime: Date.now() - startTime,
                        timestamp: Date.now()
                    })

                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))

                    console.log(`[Expert Q&A] ✅ Complete in ${Date.now() - startTime}ms`)

                    // 9. 保存對話歷史（異步，不阻塞響應）
                    saveQAHistory(supabase, {
                        user_id: user.id,
                        analysis_id: analysisId,
                        question,
                        answer: fullResponse,
                        sources,
                        response_time_ms: Date.now() - startTime
                    }).catch(err => console.error('[Expert Q&A] Save history error:', err))

                    controller.close()

                } catch (error) {
                    console.error('[Expert Q&A] Stream error:', error)

                    const errorData = JSON.stringify({
                        type: 'error',
                        message: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: Date.now()
                    })

                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
                    controller.close()
                }
            }
        })

        // 返回 SSE 流
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })

    } catch (error) {
        console.error('[Expert Q&A] Error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}

/**
 * 構建上下文增強 Prompt
 */
function buildContextEnhancedPrompt(
    analysis: any,
    question: string,
    selectedText?: string
): string {
    const contextParts = []

    // 文件摘要
    if (analysis.quick_summary) {
        contextParts.push(`## 文件摘要\n${analysis.quick_summary}`)
    }

    // 核心概念
    if (analysis.core_concepts && analysis.core_concepts.length > 0) {
        const concepts = analysis.core_concepts
            .map((c: any) => `- **${c.name}**: ${c.explanation}`)
            .join('\n')
        contextParts.push(`## 核心概念\n${concepts}`)
    }

    // 關鍵洞察
    if (analysis.key_insights && analysis.key_insights.length > 0) {
        const insights = analysis.key_insights
            .map((i: any) => `- ${i.insight}`)
            .join('\n')
        contextParts.push(`## 關鍵洞察\n${insights}`)
    }

    // 用戶選中的段落
    if (selectedText) {
        contextParts.push(`## 用戶選中段落\n> ${selectedText}`)
    }

    // 完整的結構化筆記
    if (analysis.structured_notes) {
        contextParts.push(`## 完整筆記\n${analysis.structured_notes}`)
    }

    const context = contextParts.join('\n\n')

    return `你是這份文件的專家導師，擁有深厚的學術背景和教學經驗。

${context}

---

**用戶問題**: ${question}

請提供:
1. **精準回答** (引用具體段落或概念)
2. **補充說明** (為什麼這很重要？如何理解？)
3. **實例說明** (如果適用，提供具體例子)

回答要求:
- 使用清晰、友好的語言
- 如果涉及專業術語，先解釋再使用
- 引用上述內容時，明確標註來源
- 保持簡潔（200-400 字）

請直接回答，不要包含 "根據文件" 等前綴。`
}

/**
 * 提取引用來源
 */
function extractSourceReferences(response: string, analysis: any): Array<{
    type: 'concept' | 'insight' | 'section'
    content: string
    page?: number
}> {
    const sources: Array<{ type: 'concept' | 'insight' | 'section'; content: string; page?: number }> = []

    // 從響應中提取提到的概念
    if (analysis.core_concepts) {
        analysis.core_concepts.forEach((concept: any) => {
            if (response.includes(concept.name)) {
                sources.push({
                    type: 'concept',
                    content: concept.name,
                    page: concept.pageRefs?.[0]
                })
            }
        })
    }

    // 提取洞察
    if (analysis.key_insights) {
        analysis.key_insights.forEach((insight: any) => {
            const keywords = insight.insight.split(' ').slice(0, 5).join(' ')
            if (response.includes(keywords)) {
                sources.push({
                    type: 'insight',
                    content: insight.insight.substring(0, 100),
                    page: insight.pageRefs?.[0]
                })
            }
        })
    }

    return sources.slice(0, 3) // 最多 3 個來源
}

/**
 * 生成後續問題建議
 */
function generateFollowUpQuestions(question: string, answer: string): string[] {
    // 基於問題類型的智能建議
    const questionLower = question.toLowerCase()

    if (questionLower.includes('是什麼') || questionLower.includes('定義')) {
        return [
            '這個概念有哪些實際應用？',
            '如何判斷是否理解了這個概念？',
            '這個概念與其他概念有什麼關聯？'
        ]
    }

    if (questionLower.includes('如何') || questionLower.includes('怎麼')) {
        return [
            '有沒有更簡單的方法？',
            '常見的錯誤是什麼？',
            '能否提供一個具體例子？'
        ]
    }

    if (questionLower.includes('為什麼')) {
        return [
            '有沒有例外情況？',
            '這背後的原理是什麼？',
            '如何驗證這個解釋？'
        ]
    }

    // 通用建議
    return [
        '能否舉個例子說明？',
        '這個知識點的重要性是什麼？',
        '如何在考試中應用？'
    ]
}

/**
 * 保存對話歷史（異步）
 */
async function saveQAHistory(supabase: any, data: {
    user_id: string
    analysis_id: string
    question: string
    answer: string
    sources: any[]
    response_time_ms: number
}) {
    const { error } = await supabase
        .from('expert_qa_sessions')
        .insert({
            ...data,
            created_at: new Date().toISOString()
        })

    if (error) {
        console.error('[Expert Q&A] Failed to save history:', error)
    }
}
