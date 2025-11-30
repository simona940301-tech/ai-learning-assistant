import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { extractTextFromPDF, extractTextFromTXT, cleanText } from '@/lib/utils/text-extraction'
import { generateSummary } from '@/lib/services/rag-summary'
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
            const pdfData = await extractTextFromPDF(buffer)
            extractedText = pdfData.text
            numPages = pdfData.numPages
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

        // 7. 生成摘要和關鍵詞（異步處理）
        try {
            const { summary, keywords, theme } = await generateSummary(cleanedText, {
                numSentences: 5,
                numKeywords: 10,
            })

            // 8. 更新資料庫記錄（狀態：ready）
            // 注意：這裡我們暫時將 theme 存入 summary 欄位的前綴，或者需要 migration 添加 theme 欄位
            // 為了 MVP 快速迭代，我們先只返回給前端，資料庫欄位稍後添加
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

            // 9. 返回成功結果
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

        const { data, error } = await supabase
            .from('rag_documents')
            .select('*')
            .eq('user_id', user.id)
            .order('uploaded_at', { ascending: false })

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
