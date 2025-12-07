import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { cleanText } from '@/lib/utils/text-extraction'
import { extractTextSmart } from '@/lib/services/smart-text-extractor'
import { generateSummary, extractKeywords } from '@/lib/services/rag-summary'
import { createContextCache } from '@/lib/services/context-cache-service'
import { createClient } from '@supabase/supabase-js'
import { createOptionsHandler, corsJsonResponse } from '@/lib/api/cors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 最大文件大小：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * 🚀 SOTA FIX: Explicit Route-Level OPTIONS Handler
 * This is the LAST LINE OF DEFENSE against 405 errors
 * 
 * Why this is necessary:
 * - Middleware handles OPTIONS globally (Plan C)
 * - createOptionsHandler() provides dynamic origin reflection (Plan B)
 * - This explicit handler ensures OPTIONS ALWAYS returns 200 (Plan A)
 * 
 * Critical for mobile browsers which ALWAYS send CORS preflight requests
 */
export async function OPTIONS(request: Request) {
    // Dynamic origin reflection - spec-compliant with credentials
    const origin = request.headers.get('origin') || '*'

    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-API-Key',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400', // 24 hours
        },
    })
}

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
        // 🔍 DIAGNOSTIC: Log request details for mobile debugging
        console.log('[RAG Upload] ==================== REQUEST START ====================')
        console.log('[RAG Upload] Method:', req.method)
        console.log('[RAG Upload] URL:', req.url)
        console.log('[RAG Upload] User-Agent:', req.headers.get('user-agent'))
        console.log('[RAG Upload] Content-Type:', req.headers.get('content-type'))
        console.log('[RAG Upload] Has Authorization:', !!req.headers.get('authorization'))
        console.log('[RAG Upload] Origin:', req.headers.get('origin'))
        console.log('[RAG Upload] Referer:', req.headers.get('referer'))

        // 1. 驗證用戶身份
        const { supabase, user, errorType } = await getApiUser(req)

        console.log('[RAG Upload] Auth Result:', {
            hasUser: !!user,
            userId: user?.id,
            errorType
        })

        // 檢查是否為 mock mode
        const { isMockModeEnabled } = await import('@/lib/api/auth')
        const isMockMode = isMockModeEnabled()
        console.log('[RAG Upload] Mock Mode Enabled:', isMockMode)

        // 在 mock mode 下，如果沒有 user，使用 mock user ID
        let finalUser = user
        if (!user && isMockMode) {
            const mockUserId = process.env.BACKPACK_DEV_USER_ID || 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
            console.log('[RAG Upload] Using mock user ID:', mockUserId)
            finalUser = { id: mockUserId } as any
        }

        if (!finalUser) {
            return corsJsonResponse(
                {
                    error: 'UNAUTHORIZED',
                    message: errorType === 'invalid-jwt'
                        ? '登入狀態失效，請重新登入'
                        : '需要登入',
                    debug: {
                        errorType,
                        userAgent: req.headers.get('user-agent'),
                        origin: req.headers.get('origin'),
                    }
                },
                { status: 401 },
                req
            )
        }

        // 2. 解析 FormData
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        // 🚀 PHASE 3: IndexedDB cache support
        const skipExtraction = formData.get('skip_extraction') === 'true'
        const cachedText = formData.get('cached_text') as string | null
        const fileHash = formData.get('file_hash') as string | null

        if (!file) {
            return corsJsonResponse(
                { error: 'VALIDATION_ERROR', message: '請上傳文件' },
                { status: 400 },
                req
            )
        }

        // 3. 驗證文件類型和大小
        const fileType = file.type
        const fileName = file.name
        const fileSize = file.size

        if (fileSize > MAX_FILE_SIZE) {
            return corsJsonResponse(
                { error: 'FILE_TOO_LARGE', message: '文件大小不能超過 10MB' },
                { status: 400 },
                req
            )
        }

        const isValidType =
            fileType === 'application/pdf' ||
            fileType === 'text/plain' ||
            fileType.startsWith('image/') ||
            fileName.endsWith('.pdf') ||
            fileName.endsWith('.txt') ||
            fileName.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)

        if (!isValidType) {
            return corsJsonResponse(
                { error: 'INVALID_FILE_TYPE', message: '僅支援 PDF、TXT 和圖片文件 (JPG, PNG, WEBP, HEIC 等)' },
                { status: 400 },
                req
            )
        }

        // 4. 讀取文件內容 - 使用智能文字提取器
        const buffer = Buffer.from(await file.arrayBuffer())

        let extractedText: string
        let numPages: number | undefined
        let extractionMethod: string

        // 🚀 PHASE 3: Use cached text if available
        if (skipExtraction && cachedText) {
            console.log(`[RAG Upload] ⏩ Using client-side cached text for ${fileName} (${cachedText.length} chars)`)
            extractedText = cachedText
            numPages = undefined // Will be populated from metadata if needed
            extractionMethod = 'cached'
        } else {
            // Normal extraction flow
            try {
                console.log(`[RAG Upload] Starting smart text extraction for ${fileName} (${fileType})`)
                const extractionResult = await extractTextSmart(buffer, fileName, fileType, fileHash || undefined)
                extractedText = extractionResult.text
                numPages = extractionResult.numPages
                extractionMethod = extractionResult.method

                console.log(`[RAG Upload] Extraction complete: ${extractionMethod} (${extractionResult.durationMs}ms, ${extractedText.length} chars)`)
            } catch (extractError) {
                console.error('[RAG Upload] Text extraction failed:', extractError)
                const errorMsg = extractError instanceof Error ? extractError.message : String(extractError)

                // Provide specific error messages based on file type
                const fileTypeLabel = fileName.endsWith('.pdf') ? 'PDF' :
                    fileType.startsWith('image/') ? '圖片' : '文件'

                return corsJsonResponse(
                    {
                        error: 'EXTRACTION_ERROR',
                        message: `${fileTypeLabel}處理失敗: ${errorMsg}`,
                        debug: {
                            fileName,
                            fileSize,
                            fileType,
                            bufferSize: buffer.length,
                            suggestion: fileType.startsWith('image/')
                                ? '請確認圖片清晰且包含可辨識的文字內容'
                                : '請確認檔案格式正確且未損壞'
                        }
                    },
                    { status: 500 },
                    req
                )
            }
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
            return corsJsonResponse(
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
                { status: 400 },
                req
            )
        }

        // 6. 創建資料庫記錄（狀態：processing）
        console.log('[RAG Upload] 準備插入數據，user_id:', finalUser.id)

        // Determine file type for database
        let dbFileType: string
        if (fileName.endsWith('.pdf')) {
            dbFileType = 'pdf'
        } else if (fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)) {
            dbFileType = 'image'
        } else {
            dbFileType = 'txt'
        }

        // 🚀 ELITE OPTIMIZATION: Check for existing document (Deduplication)
        // If same user uploads same file (name + size), reuse existing ID to hit cache
        const { data: existingDocs, error: dupCheckError } = await supabase
            .from('rag_documents')
            .select('id, status, summary, keywords')
            .eq('user_id', finalUser.id)
            .eq('filename', fileName)
            .eq('file_size', fileSize)
            .order('created_at', { ascending: false })
            .limit(1)

        if (!dupCheckError && existingDocs && existingDocs.length > 0) {
            const existingDoc = existingDocs[0]
            console.log('[RAG Upload] ♻️ Found existing duplicate document:', existingDoc.id)
            console.log('[RAG Upload] ⏭️ Returning existing ID to trigger Cache HIT in analysis')

            return corsJsonResponse({
                success: true,
                document: {
                    id: existingDoc.id,
                    filename: fileName,
                    status: existingDoc.status, // might be 'ready'
                    numPages,
                    isDuplicate: true // Flag for frontend if needed
                },
            }, undefined, req)
        }

        const { data: docRecord, error: insertError } = await supabase
            .from('rag_documents')
            .insert({
                user_id: finalUser.id,
                filename: fileName,
                file_size: fileSize,
                file_type: dbFileType,
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
                return corsJsonResponse(
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
                    { status: 403 },
                    req
                )
            }

            return corsJsonResponse(
                {
                    error: 'DATABASE_ERROR',
                    message: '資料庫錯誤',
                    debug: {
                        code: insertError.code,
                        message: insertError.message,
                    }
                },
                { status: 500 },
                req
            )
        }

        console.log('[RAG Upload] 數據插入成功，document ID:', docRecord?.id)

        // 🚀 ELITE OPTIMIZATION: 立即返回，所有處理都在背景執行
        const documentId = docRecord.id

        // 背景任務：智能路由 (Context Cache vs File Search) + 摘要生成
        Promise.resolve().then(async () => {
            try {
                console.log(`[RAG Upload] 🚀 Starting background processing for ${documentId}...`)

                // ========================================
                // Step 1: Token Counting (Routing Decision)
                // ========================================
                const { TokenCounterService } = await import('@/lib/services/token-counter')
                const tokenCount = await TokenCounterService.countTokens(cleanedText)

                console.log(`[RAG Upload] Token count: ${tokenCount} (threshold: ${TokenCounterService.THRESHOLD})`)

                let storageType: 'CONTEXT_CACHE' | 'FILE_SEARCH'
                let googleResourceId: string | null = null

                // ========================================
                // Step 2: Intelligent Routing
                // ========================================
                if (tokenCount <= TokenCounterService.THRESHOLD) {
                    // 🎯 Small File → Context Cache (High Quality)
                    storageType = 'CONTEXT_CACHE'
                    console.log(`[RAG Upload] 📦 Routing to Context Cache (${tokenCount} tokens)`)

                    try {
                        const { GeminiContextCacheService } = await import('@/lib/services/gemini-context-cache')

                        const cacheResult = await GeminiContextCacheService.createCache(
                            cleanedText,
                            `${fileName}-${documentId}`,
                            `You are a helpful academic assistant. Answer questions based on the document "${fileName}".`
                        )

                        googleResourceId = cacheResult.cacheName
                        console.log(`[RAG Upload] ✅ Context Cache created: ${googleResourceId}`)
                        console.log(`[RAG Upload] Cache expires at: ${cacheResult.expiresAt}`)

                    } catch (cacheError) {
                        console.error('[RAG Upload] ❌ Context Cache creation failed:', cacheError)
                        // Fallback: still save as CONTEXT_CACHE but without google_resource_id
                        // The chat route will fall back to direct prompting
                    }

                } else {
                    // 🎯 Large File → File Search (High Capacity)
                    storageType = 'FILE_SEARCH'
                    console.log(`[RAG Upload] 📚 Routing to File Search (${tokenCount} tokens)`)

                    try {
                        const { GoogleFileSearchService } = await import('@/lib/services/google-file-search')
                        const fs = await import('fs')
                        const path = await import('path')
                        const os = await import('os')

                        // Create temp file
                        const tempFilePath = path.join(os.tmpdir(), `upload-${documentId}-${fileName}`)
                        await fs.promises.writeFile(tempFilePath, buffer)

                        // Upload to Google File Search
                        const googleFile = await GoogleFileSearchService.uploadFile(
                            tempFilePath,
                            fileType || 'text/plain',
                            fileName
                        )

                        // Clean up temp file
                        await fs.promises.unlink(tempFilePath)

                        googleResourceId = googleFile.name
                        console.log(`[RAG Upload] ✅ File Search upload complete: ${googleResourceId}`)

                        // Wait for file to be active
                        await GoogleFileSearchService.waitForFileActive(googleFile.name)

                        // Add to User's File Search Store
                        const userStore = await GoogleFileSearchService.getUserStore(finalUser.id)
                        await GoogleFileSearchService.importFileToStore(userStore.name, googleFile.name)

                        console.log(`[RAG Upload] ✅ Added to User Store: ${userStore.name}`)

                    } catch (fileSearchError) {
                        console.error('[RAG Upload] ❌ File Search upload failed:', fileSearchError)
                        // Don't fail the whole process, just log it
                    }
                }

                // ========================================
                // Step 3: Generate Summary (Parallel)
                // ========================================
                const isLargeFile = cleanedText.length > 10000
                let summary: string
                let keywords: string[] = []

                if (isLargeFile) {
                    const summaryResult = await generateSummary(cleanedText, {
                        numSentences: 5,
                        numKeywords: 10,
                    })
                    summary = summaryResult.summary
                    keywords = summaryResult.keywords
                } else {
                    summary = cleanedText.substring(0, 200).trim() + (cleanedText.length > 200 ? '...' : '')
                    const previewText = cleanedText.substring(0, 500)
                    const quickKeywords = await extractKeywords(previewText, 5).catch(() => [])
                    keywords = quickKeywords
                }

                // ========================================
                // Step 4: Update Database (Final State)
                // ========================================
                const { error: updateError } = await supabase
                    .from('rag_documents')
                    .update({
                        summary,
                        keywords,
                        storage_type: storageType,
                        google_resource_id: googleResourceId,
                        token_count: tokenCount,
                        status: 'ready',
                        processed_at: new Date().toISOString(),
                    })
                    .eq('id', documentId)

                if (updateError) {
                    console.error('[RAG Upload] Database update error:', updateError)
                } else {
                    console.log(`[RAG Upload] ✅ Document ready: ${documentId} (${storageType})`)
                }

            } catch (bgError) {
                console.error(`[RAG Upload] ❌ Background processing failed for ${documentId}:`, bgError)
                await supabase
                    .from('rag_documents')
                    .update({
                        status: 'error',
                        error_message: bgError instanceof Error ? bgError.message : '背景處理失敗',
                    })
                    .eq('id', documentId)
            }
        }).catch((err) => {
            console.warn(`[RAG Upload] Background task error for ${documentId}:`, err)
        })

        // 🚀 PHASE 3: Construct response with extracted text for client caching
        const TEXT_SIZE_LIMIT = 4 * 1024 * 1024 // 4MB safety limit for Vercel
        const textToSend = (cleanedText && cleanedText.length < TEXT_SIZE_LIMIT && !skipExtraction)
            ? cleanedText
            : null

        // 🚀 立即返回（不等待摘要生成和 Cache 創建）
        return corsJsonResponse({
            success: true,
            document: {
                id: documentId,
                filename: fileName,
                status: 'processing', // 狀態為 processing，摘要正在背景生成
                numPages,
            },
            // 🚀 PHASE 3: Return extracted text for client caching
            // Only return if we actually extracted (not from cache) and within size limit
            extractedText: textToSend,
            extractionMethod: extractionMethod,
            fileHash: fileHash,
        }, undefined, req)
    } catch (error) {
        console.error('[RAG Upload] Unexpected error:', error)
        return corsJsonResponse(
            {
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : '未知錯誤',
            },
            { status: 500 },
            req
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
            return corsJsonResponse(
                { error: 'UNAUTHORIZED', message: '需要登入' },
                { status: 401 },
                req
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
            return corsJsonResponse(
                { error: 'DATABASE_ERROR', message: '資料庫錯誤' },
                { status: 500 },
                req
            )
        }

        return corsJsonResponse({
            success: true,
            documents: data,
        }, undefined, req)
    } catch (error) {
        console.error('[RAG Upload] Unexpected error:', error)
        return corsJsonResponse(
            { error: 'INTERNAL_ERROR', message: '未知錯誤' },
            { status: 500 },
            req
        )
    }
}
