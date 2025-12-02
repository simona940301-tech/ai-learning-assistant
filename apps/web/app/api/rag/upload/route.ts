import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { extractTextFromPDF, extractTextFromTXT, cleanText } from '@/lib/utils/text-extraction'
import { generateSummary, extractKeywords } from '@/lib/services/rag-summary'
import { createContextCache } from '@/lib/services/context-cache-service'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 最大文件大小：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * POST /api/rag/upload
 * 
 * 上傳文件並生成摘要
 * 
 * 流程：
 * 1. 接收文件上傳
 * 2. 提取文本內容
 * 3. 生成摘要和關鍵詞
 * 4. 儲存到資料庫
 */
export async function POST(req: NextRequest) {
    try {
        // 1. 驗證用戶身份
        const { supabase, user, errorType } = await getApiUser(req)

        // 🔍 診斷日誌：檢查認證狀態
        console.log('[RAG Upload] ===== 認證診斷 =====')
        console.log('[RAG Upload] User from getApiUser:', user ? { id: user.id, email: user.email } : 'null')
        console.log('[RAG Upload] Error Type:', errorType)

        // 測試 Supabase client 的認證狀態
        const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser()
        console.log('[RAG Upload] Supabase Auth User:', supabaseUser ? { id: supabaseUser.id } : 'null')
        console.log('[RAG Upload] Supabase Auth Error:', authError?.message || 'none')

        // 檢查是否為 mock mode
        const { isMockModeEnabled } = await import('@/lib/api/auth')
        const isMockMode = isMockModeEnabled()
        console.log('[RAG Upload] Mock Mode Enabled:', isMockMode)
        console.log('[RAG Upload] ====================')

        // 在 mock mode 下，如果沒有 user，使用 mock user ID
        let finalUser = user
        if (!user && isMockMode) {
            const mockUserId = process.env.BACKPACK_DEV_USER_ID || 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
            console.log('[RAG Upload] Using mock user ID:', mockUserId)
            finalUser = { id: mockUserId } as any
        }

        if (!finalUser) {
            return NextResponse.json(
                {
                    error: 'UNAUTHORIZED',
                    message: errorType === 'invalid-jwt'
                        ? '登入狀態失效，請重新登入'
                        : '需要登入',
                    debug: {
                        errorType,
                        supabaseUser: supabaseUser ? { id: supabaseUser.id } : null,
                        authError: authError?.message,
                        isMockMode,
                    }
                },
                { status: 401 }
            )
        }

        // 2. 解析 FormData
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: '請上傳文件' },
                { status: 400 }
            )
        }

        // 3. 驗證文件類型和大小
        const fileType = file.type
        const fileName = file.name
        const fileSize = file.size

        if (fileSize > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'FILE_TOO_LARGE', message: '文件大小不能超過 10MB' },
                { status: 400 }
            )
        }

        const isValidType =
            fileType === 'application/pdf' ||
            fileType === 'text/plain' ||
            fileName.endsWith('.pdf') ||
            fileName.endsWith('.txt')

        if (!isValidType) {
            return NextResponse.json(
                { error: 'INVALID_FILE_TYPE', message: '僅支援 PDF 和 TXT 文件' },
                { status: 400 }
            )
        }

        // 4. 讀取文件內容
        const buffer = Buffer.from(await file.arrayBuffer())

        let extractedText: string
        let numPages: number | undefined

        if (fileName.endsWith('.pdf')) {
            try {
                const pdfData = await extractTextFromPDF(buffer)
                extractedText = pdfData.text
                numPages = pdfData.numPages
            } catch (pdfError) {
                console.error('[RAG Upload] PDF extraction failed:', pdfError)
                const errorMsg = pdfError instanceof Error ? pdfError.message : String(pdfError)
                return NextResponse.json(
                    {
                        error: 'PDF_PARSE_ERROR',
                        message: `PDF 解析失敗: ${errorMsg}`,
                        debug: {
                            fileName,
                            fileSize,
                            bufferSize: buffer.length,
                            suggestion: '請確認檔案是有效的 PDF 格式，而非損壞或加密的文件'
                        }
                    },
                    { status: 400 }
                )
            }
        } else {
            extractedText = extractTextFromTXT(buffer)
        }

        // 5. 清理文本
        const cleanedText = cleanText(extractedText)

        console.log(`[RAG Upload] Extracted text length: ${cleanedText.length} characters`)
        console.log(`[RAG Upload] File: ${fileName}, Size: ${fileSize} bytes, Pages: ${numPages || 'N/A'}`)

        if (cleanedText.length > 0) {
            console.log(`[RAG Upload] First 200 chars: ${cleanedText.substring(0, 200)}`)
        }

        // 降低門檻從 100 到 50 字元，更寬容
        if (cleanedText.length < 50) {
            console.warn(`[RAG Upload] Text too short: ${cleanedText.length} characters`)
            return NextResponse.json(
                {
                    error: 'TEXT_TOO_SHORT',
                    message: `文件內容太少（僅 ${cleanedText.length} 字元），無法生成摘要。請確認 PDF 包含可提取的文字內容，而非純圖片掃描檔。`,
                    debug: {
                        extractedLength: cleanedText.length,
                        fileName: fileName,
                        fileSize: fileSize,
                        numPages: numPages,
                        suggestion: cleanedText.length === 0
                            ? '此 PDF 可能是掃描的圖片檔，需要 OCR 處理'
                            : '請嘗試上傳包含更多文字內容的文件'
                    }
                },
                { status: 400 }
            )
        }

        // 6. 創建資料庫記錄（狀態：processing）
        console.log('[RAG Upload] 準備插入數據，user_id:', finalUser.id)
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
            console.error('[RAG Upload] Database insert error:', insertError)
            console.error('[RAG Upload] Error details:', {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
            })

            // 如果是 RLS 相關錯誤，提供更詳細的訊息
            if (insertError.code === '42501' || insertError.message?.includes('policy')) {
                return NextResponse.json(
                    {
                        error: 'RLS_POLICY_ERROR',
                        message: '權限錯誤：RLS 政策拒絕了此操作',
                        debug: {
                            errorCode: insertError.code,
                            errorMessage: insertError.message,
                            userId: user?.id || 'unknown',
                            suggestion: '請檢查 RLS 政策是否正確配置，以及 Supabase client 是否有正確的認證上下文'
                        }
                    },
                    { status: 403 }
                )
            }

            return NextResponse.json(
                {
                    error: 'DATABASE_ERROR',
                    message: '資料庫錯誤',
                    debug: {
                        code: insertError.code,
                        message: insertError.message,
                    }
                },
                { status: 500 }
            )
        }

        console.log('[RAG Upload] 數據插入成功，document ID:', docRecord?.id)

        // 7. 🚀 優化：對於小文件，使用快速摘要策略
        // 對於大文件（> 10KB），使用完整摘要；小文件使用簡單提取
        const isLargeFile = cleanedText.length > 10000
        let summary: string
        let keywords: string[] = []
        let theme: string = ''

        try {
            if (isLargeFile) {
                // 大文件：使用完整摘要生成
                const summaryResult = await generateSummary(cleanedText, {
                    numSentences: 5,
                    numKeywords: 10,
                })
                summary = summaryResult.summary
                keywords = summaryResult.keywords
                theme = summaryResult.theme
            } else {
                // 🚀 小文件：快速策略（提取前 200 字作為摘要）
                summary = cleanedText.substring(0, 200).trim() + (cleanedText.length > 200 ? '...' : '')
                // 簡單關鍵詞提取（從前 500 字提取）
                const previewText = cleanedText.substring(0, 500)
                const quickKeywords = await extractKeywords(previewText, 5).catch(() => [])
                keywords = quickKeywords
                theme = previewText.substring(0, 30).trim() + '...'
                console.log('[RAG Upload] ⚡ Using fast summary strategy for small file')
            }

            // 8. 更新資料庫記錄（狀態：ready）
            const { error: updateError } = await supabase
                .from('rag_documents')
                .update({
                    summary,
                    keywords,
                    status: 'ready',
                    processed_at: new Date().toISOString(),
                })
                .eq('id', docRecord.id)

            if (updateError) {
                console.error('[RAG Upload] Database update error:', updateError)
            }

            // 9. 🚀 優化：在背景創建 Context Cache（非阻塞）
            // 這樣可以立即返回給用戶，Cache 在背景創建
            Promise.resolve().then(async () => {
                try {
                    console.log('[RAG Upload] 🚀 Creating Context Cache in background...');
                    const cacheResult = await createContextCache(
                        docRecord.id,
                        cleanedText,
                        `${fileName}-${docRecord.id}`
                    );

                    if (cacheResult.success && cacheResult.cacheName) {
                        // 更新資料庫記錄 Cache 資訊
                        await supabase
                            .from('rag_documents')
                            .update({
                                cache_name: cacheResult.cacheName,
                                cache_expires_at: cacheResult.expiresAt?.toISOString(),
                            })
                            .eq('id', docRecord.id);

                        console.log('[RAG Upload] ✅ Context Cache created in background:', cacheResult.cacheName);
                    } else {
                        console.log('[RAG Upload] ⚠️ Context Cache skipped:', cacheResult.error);
                    }
                } catch (cacheError) {
                    // Cache 創建失敗不影響上傳流程
                    console.warn('[RAG Upload] ⚠️ Context Cache creation failed (non-blocking):', cacheError);
                }
            }).catch((err) => {
                // 完全忽略背景任務錯誤
                console.warn('[RAG Upload] Background cache task error (ignored):', err);
            });

            // 10. 立即返回成功結果（不等待 Cache 創建）
            return NextResponse.json({
                success: true,
                document: {
                    id: docRecord.id,
                    filename: fileName,
                    summary,
                    keywords,
                    theme, // 新增主題
                    numPages,
                    status: 'ready',
                    // 注意：cacheName 會在背景創建後更新到資料庫
                },
            })
        } catch (summaryError) {
            // 摘要生成失敗，更新狀態為 error
            console.error('[RAG Upload] Summary generation error:', summaryError)

            await supabase
                .from('rag_documents')
                .update({
                    status: 'error',
                    error_message: summaryError instanceof Error ? summaryError.message : '摘要生成失敗',
                })
                .eq('id', docRecord.id)

            return NextResponse.json(
                {
                    error: 'SUMMARY_GENERATION_ERROR',
                    message: '摘要生成失敗，請稍後再試',
                },
                { status: 500 }
            )
        }
    } catch (error) {
        console.error('[RAG Upload] Unexpected error:', error)
        return NextResponse.json(
            {
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : '未知錯誤',
            },
            { status: 500 }
        )
    }
}

/**
 * GET /api/rag/upload
 * 
 * 獲取用戶的所有上傳文件
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user, errorType } = await getApiUser(req)

        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: '需要登入' },
                { status: 401 }
            )
        }

        // 🎯 NEW: Support hours parameter for 24-hour history filtering
        // 🎯 NEW: Support ids parameter for fetching specific documents
        const { searchParams } = new URL(req.url)
        const hoursParam = searchParams.get('hours')
        const idsParam = searchParams.get('ids')

        let query = supabase
            .from('rag_documents')
            .select('*')
            .eq('user_id', user.id)

        // Filter by specific IDs if provided
        if (idsParam) {
            const ids = idsParam.split(',').filter(Boolean)
            if (ids.length > 0) {
                query = query.in('id', ids)
                console.log(`[RAG Upload] Fetching specific documents:`, ids)
            }
        }
        // Otherwise filter by time if hours parameter provided
        else if (hoursParam) {
            const hours = parseInt(hoursParam)
            const cutoffTime = new Date()
            cutoffTime.setHours(cutoffTime.getHours() - hours)

            query = query.gte('uploaded_at', cutoffTime.toISOString())
            console.log(`[RAG Upload] Filtering documents from last ${hours} hours (since ${cutoffTime.toISOString()})`)
        }

        const { data, error } = await query.order('uploaded_at', { ascending: false })

        if (error) {
            console.error('[RAG Upload] Database query error:', error)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: '資料庫錯誤' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            documents: data,
        })
    } catch (error) {
        console.error('[RAG Upload] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: '未知錯誤' },
            { status: 500 }
        )
    }
}
