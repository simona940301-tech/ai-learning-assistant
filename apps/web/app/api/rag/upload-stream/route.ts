import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { createOptionsHandler } from '@/lib/api/cors'

export const OPTIONS = createOptionsHandler()
import { extractTextFromPDF, extractTextFromTXT, cleanText } from '@/lib/utils/text-extraction'
import { generateUltimateAnalysis } from '@/lib/services/elite-rag-analyzer'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 最大文件大小：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * POST /api/rag/upload-stream
 * 
 * ⚡ SSE Streaming Version of RAG Upload
 * 
 * Progressive 3-layer analysis with real-time streaming:
 * - Layer 1: Quick Preview (< 3s)
 * - Layer 2: Deep Analysis (< 15s)
 * - Layer 3: Exam Predictions (< 30s)
 * 
 * SSE Event Types:
 * - 'document_created': Document record created in DB
 * - 'layer1': Quick preview ready
 * - 'layer2': Deep analysis ready
 * - 'layer3': Exam predictions ready
 * - 'complete': All analysis complete
 * - 'error': Error occurred
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Validate user
        const { supabase, user, errorType } = await getApiUser(req)

        console.log('[RAG Stream] User:', user ? { id: user.id } : 'null')

        // Mock mode support
        const { isMockModeEnabled } = await import('@/lib/api/auth')
        const isMockMode = isMockModeEnabled()

        let finalUser = user
        if (!user && isMockMode) {
            const mockUserId = process.env.BACKPACK_DEV_USER_ID || 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
            finalUser = { id: mockUserId } as any
        }

        if (!finalUser) {
            return new Response(
                JSON.stringify({ error: 'UNAUTHORIZED', message: '需要登入' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // 2. Parse FormData
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return new Response(
                JSON.stringify({ error: 'VALIDATION_ERROR', message: '請上傳文件' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // 3. Validate file
        const fileType = file.type
        const fileName = file.name
        const fileSize = file.size

        if (fileSize > MAX_FILE_SIZE) {
            return new Response(
                JSON.stringify({ error: 'FILE_TOO_LARGE', message: '文件大小不能超過 10MB' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const isValidType =
            fileType === 'application/pdf' ||
            fileType === 'text/plain' ||
            fileName.endsWith('.pdf') ||
            fileName.endsWith('.txt')

        if (!isValidType) {
            return new Response(
                JSON.stringify({ error: 'INVALID_FILE_TYPE', message: '僅支援 PDF 和 TXT 文件' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // 4. Extract text
        const buffer = Buffer.from(await file.arrayBuffer())
        let extractedText: string
        let numPages: number | undefined

        if (fileName.endsWith('.pdf')) {
            const pdfData = await extractTextFromPDF(buffer)
            extractedText = pdfData.text
            numPages = pdfData.numPages
        } else {
            extractedText = extractTextFromTXT(buffer)
        }

        const cleanedText = cleanText(extractedText)

        console.log(`[RAG Stream] Extracted: ${cleanedText.length} chars, ${numPages || 'N/A'} pages`)

        if (cleanedText.length < 50) {
            return new Response(
                JSON.stringify({
                    error: 'TEXT_TOO_SHORT',
                    message: `文件內容太少（僅 ${cleanedText.length} 字元）`,
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // 5. ⚡ Create SSE stream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()

                // Helper to send SSE events
                const send = (type: string, data: any) => {
                    const message = `data: ${JSON.stringify({ type, ...data })}\n\n`
                    controller.enqueue(encoder.encode(message))
                }

                try {
                    // 6. Create database record
                    const { data: docRecord, error: insertError } = await supabase
                        .from('rag_documents')
                        .insert({
                            user_id: finalUser.id,
                            filename: fileName,
                            file_size: fileSize,
                            file_type: fileName.endsWith('.pdf') ? 'pdf' : 'txt',
                            original_text: cleanedText,
                            status: 'processing',
                        })
                        .select()
                        .single()

                    if (insertError) {
                        console.error('[RAG Stream] DB insert error:', insertError)
                        send('error', {
                            error: 'DATABASE_ERROR',
                            message: '資料庫錯誤',
                        })
                        controller.close()
                        return
                    }

                    console.log('[RAG Stream] Document created:', docRecord.id)

                    // Send document created event
                    send('document_created', {
                        documentId: docRecord.id,
                        filename: fileName,
                        numPages,
                    })

                    // 7. ⚡ Generate analysis with streaming (3 layers)
                    const startTime = Date.now()

                    const result = await generateUltimateAnalysis(cleanedText, 'chinese')

                    // Send Layer 1: Quick Preview
                    send('layer1', {
                        preview: result.preview,
                        elapsed: Date.now() - startTime,
                    })

                    console.log(`[RAG Stream] Layer 1 complete in ${Date.now() - startTime}ms`)

                    // Send Layer 2: Deep Analysis
                    send('layer2', {
                        summary: result.summary,
                        elapsed: Date.now() - startTime,
                    })

                    console.log(`[RAG Stream] Layer 2 complete in ${Date.now() - startTime}ms`)

                    // Send Layer 3: Exam Questions
                    send('layer3', {
                        questions: result.questions,
                        elapsed: Date.now() - startTime,
                    })

                    console.log(`[RAG Stream] Layer 3 complete in ${Date.now() - startTime}ms`)

                    // 8. Update database with results
                    const { error: updateError } = await supabase
                        .from('rag_documents')
                        .update({
                            summary: result.summary,
                            keywords: [], // Extract from summary if needed
                            status: 'ready',
                            processed_at: new Date().toISOString(),
                        })
                        .eq('id', docRecord.id)

                    if (updateError) {
                        console.error('[RAG Stream] DB update error:', updateError)
                    }

                    // Send completion event
                    send('complete', {
                        documentId: docRecord.id,
                        totalTime: Date.now() - startTime,
                        fullMarkdown: result.fullMarkdown,
                    })

                    console.log(`[RAG Stream] ✅ Complete in ${Date.now() - startTime}ms`)

                } catch (error) {
                    console.error('[RAG Stream] Error:', error)
                    send('error', {
                        error: 'ANALYSIS_ERROR',
                        message: error instanceof Error ? error.message : '分析失敗',
                    })
                } finally {
                    controller.close()
                }
            },
        })

        // Return SSE stream
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })

    } catch (error) {
        console.error('[RAG Stream] Unexpected error:', error)
        return new Response(
            JSON.stringify({
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : '未知錯誤',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
