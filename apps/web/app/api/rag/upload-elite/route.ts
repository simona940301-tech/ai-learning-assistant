import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { randomUUID } from 'crypto'
import {
    extractTextFromPDFWithGemini,
    extractTextFromImageWithGemini,
    generateQuickPreview,
    generateUltimateAnalysis,
    type QuickPreview,
    type UltimateAnalysisResult
} from '@/lib/services/elite-rag-analyzer'
import { calculateFileHash, RagTelemetry } from '@/lib/utils/rag-telemetry'
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/cache/redis-cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for background processing

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

/**
 * POST /api/rag/upload-elite
 * 
 * Elite RAG upload with 3-layer progressive analysis:
 * 1. Immediate response with fileId and analysisId
 * 2. Background processing:
 *    - Layer 1: Quick Preview (3s)
 *    - Layer 2: Deep Analysis (15s)
 *    - Layer 3: Exam Prediction (30s)
 */
export async function POST(req: NextRequest) {
    const startTime = Date.now()

    try {
        // 1. Authenticate user
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: '需要登入' },
                { status: 401 }
            )
        }

        // 2. Parse FormData
        const formData = await req.formData()
        // 3. Validate files
        const files = formData.getAll('file') as File[]
        if (files.length === 0) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: '請上傳文件' },
                { status: 400 }
            )
        }

        const validFiles = files.filter(file => {
            const type = file.type
            const name = file.name.toLowerCase()
            return type === 'application/pdf' ||
                type === 'text/plain' ||
                type.startsWith('image/') ||
                name.endsWith('.pdf') ||
                name.endsWith('.txt') ||
                name.match(/\.(jpg|jpeg|png|gif)$/)
        })

        if (validFiles.length === 0) {
            return NextResponse.json(
                { error: 'INVALID_FILE_TYPE', message: '僅支援 PDF、TXT 和圖片文件' },
                { status: 400 }
            )
        }

        // Use the first file's name as the main name, or a combined name
        const mainFileName = validFiles[0].name + (validFiles.length > 1 ? ` 等 ${validFiles.length} 個文件` : '')

        // ⚡ OPTIMIZATION: Calculate hash and check cache BEFORE processing
        console.log('[Elite Upload] 📊 Calculating file hash for cache lookup...')
        let combinedBuffer = Buffer.alloc(0)
        for (const file of validFiles) {
            const buffer = Buffer.from(await file.arrayBuffer())
            combinedBuffer = Buffer.concat([combinedBuffer, buffer])
        }

        const fileHash = calculateFileHash(combinedBuffer)
        console.log(`[Elite Upload] 🔑 File hash: ${fileHash.substring(0, 16)}...`)

        const cacheResult = await getCachedAnalysis(fileHash)

        if (cacheResult.data) {
            console.log(`[Elite Upload] ✅ Cache hit! Source: ${cacheResult.source}`)
            console.log('[Elite Upload] 🚀 Returning cached analysis (< 100ms)')

            // Cache hit - return immediately with cached data
            return NextResponse.json({
                success: true,
                fileId: cacheResult.data.fileId,
                analysisId: cacheResult.data.analysisId,
                fileName: cacheResult.data.fileName,
                numPages: cacheResult.data.numPages,
                status: cacheResult.data.status,
                message: '檔案已分析過，從快取載入',
                cached: true
            })
        }

        console.log('[Elite Upload] ❌ Cache miss - proceeding with full analysis')

        // ⚡ Performance: Calculate hash in background to avoid blocking response
        // Hash calculation will be done in background processing
        const fileId = randomUUID()
        const analysisId = randomUUID()
        const telemetry = new RagTelemetry()

        // 8. Create analysis record immediately (fast DB insert)
        const { error: analysisError } = await supabase
            .from('file_analysis')
            .insert({
                id: analysisId,
                user_id: user.id,
                file_name: mainFileName,
                status: 'pending'
            })

        if (analysisError) {
            console.error('[Elite Upload] Analysis insert error:', analysisError)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: '分析記錄創建失敗' },
                { status: 500 }
            )
        }

        const responseTime = Date.now() - startTime
        console.log(`[Elite Upload] ✅ Analysis record created (${responseTime}ms)`)

        // 9. ⭐ IMMEDIATELY return to client (< 1 second! Same speed as ask page)
        const response = NextResponse.json({
            success: true,
            fileId,
            analysisId,
            fileName: mainFileName,
            numPages: 0, // Unknown at this point
            status: 'pending',
            message: '檔案上傳成功，正在提取內容...',
            cached: false
        })

        // 10. ⭐ Trigger background processing (hash calculation + PDF extraction + 3-layer analysis)
        // This runs AFTER the response is sent to the client
        processCompleteAnalysisInBackground(
            fileId,
            analysisId,
            validFiles, // Pass array of files
            mainFileName,
            user.id,
            supabase,
            telemetry,
            fileHash // Pass the calculated hash for caching
        ).catch(async (error) => {
            console.error('[Elite Upload] ❌ Background processing error:', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                analysisId,
                fileId
            })

            // ⚡ 確保錯誤狀態被更新到資料庫，讓前端能看到錯誤
            try {
                await supabase
                    .from('file_analysis')
                    .update({
                        status: 'failed',
                        error_message: error instanceof Error ? error.message : '處理失敗',
                        processing_time_ms: Date.now() - startTime
                    })
                    .eq('id', analysisId)
                console.log('[Elite Upload] ✅ Error status updated in database')
            } catch (dbError) {
                console.error('[Elite Upload] ❌ Failed to update error status:', dbError)
            }
        })

        return response
    } catch (error) {
        console.error('[Elite Upload] Unexpected error:', error)
        return NextResponse.json(
            {
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : '未知錯誤'
            },
            { status: 500 }
        )
    }
}

/**
 * Complete background processing (PDF extraction + 3-layer analysis)
 * Runs asynchronously after the response is sent to client
 */
async function processCompleteAnalysisInBackground(
    fileId: string,
    analysisId: string,
    files: File[],
    fileName: string,
    userId: string,
    supabase: any,
    telemetry: RagTelemetry,
    fileHash: string | null // Hash calculated in background if null
) {
    const startTime = Date.now()
    console.log(`[Background] 🚀 Starting complete analysis for file ${fileId} (analysisId: ${analysisId})`)

    try {
        // ⚡ CRITICAL: Immediately update status to 'processing' with error handling
        console.log('[Background] 📝 Step 1: Updating status to processing...')
        const initialUpdate = await supabase
            .from('file_analysis')
            .update({ status: 'processing' })
            .eq('id', analysisId)

        if (initialUpdate.error) {
            console.error('[Background] ❌ CRITICAL: Failed to update initial status:', {
                error: initialUpdate.error,
                analysisId,
                errorDetails: JSON.stringify(initialUpdate.error)
            })
            throw new Error(`Database update failed: ${initialUpdate.error.message}`)
        }

        console.log('[Background] ✅ Status successfully updated to processing')

        // ⚡ Verify the update was successful
        const { data: verifyData, error: verifyError } = await supabase
            .from('file_analysis')
            .select('status')
            .eq('id', analysisId)
            .single()

        if (verifyError) {
            console.error('[Background] ❌ Failed to verify status update:', verifyError)
        } else {
            console.log('[Background] ✅ Verified status in DB:', verifyData.status)
        }

        // Calculate hash in background if not provided
        let calculatedHash = fileHash
        if (!calculatedHash) {
            console.log(`[Background] 📊 Calculating file hash...`)
            let combinedBuffer = Buffer.alloc(0)
            for (const file of files) {
                const buf = Buffer.from(await file.arrayBuffer())
                combinedBuffer = Buffer.concat([combinedBuffer, buf])
            }
            calculatedHash = calculateFileHash(combinedBuffer)
            console.log(`[Background] ✅ File hash: ${calculatedHash.substring(0, 16)}...`)
        } else {
            console.log(`[Background] ✅ Using pre-calculated hash: ${calculatedHash.substring(0, 16)}...`)
        }

        // ========================================
        // Step 2: Extract text from ALL files
        // ========================================
        console.log(`[Background] 📝 Step 2: Extracting text from ${files.length} files...`)
        const endExtraction = telemetry.startStage('text_extraction')

        let extractedText = ''
        let totalPages = 0

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            console.log(`[Background] 📄 Processing file ${i + 1}/${files.length}: ${file.name} (${file.size} bytes)`)

            try {
                const buffer = Buffer.from(await file.arrayBuffer())
                const type = file.type
                const name = file.name.toLowerCase()

                if (type === 'application/pdf' || name.endsWith('.pdf')) {
                    console.log(`[Background] 🔍 Extracting PDF: ${file.name}...`)
                    const pdfData = await extractTextFromPDFWithGemini(buffer)
                    extractedText += `\n\n--- File: ${file.name} ---\n\n` + pdfData.text
                    totalPages += pdfData.numPages
                    console.log(`[Background] ✅ PDF extracted: ${pdfData.text.length} chars, ${pdfData.numPages} pages`)
                } else if (type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif)$/)) {
                    console.log(`[Background] 🖼️ Extracting image: ${file.name}...`)
                    const text = await extractTextFromImageWithGemini(buffer, type || 'image/jpeg')
                    extractedText += `\n\n--- Image: ${file.name} ---\n\n` + text
                    totalPages += 1
                    console.log(`[Background] ✅ Image extracted: ${text.length} chars`)
                } else {
                    console.log(`[Background] 📝 Reading text file: ${file.name}...`)
                    const text = buffer.toString('utf-8').trim()
                    extractedText += `\n\n--- File: ${file.name} ---\n\n` + text
                    totalPages += 1
                    console.log(`[Background] ✅ Text file read: ${text.length} chars`)
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err)
                console.error(`[Background] ❌ Failed to extract ${file.name}:`, {
                    error: errorMsg,
                    stack: err instanceof Error ? err.stack : undefined
                })
                extractedText += `\n\n--- File: ${file.name} (Extraction Failed: ${errorMsg}) ---\n\n`
            }
        }

        endExtraction()
        console.log(`[Background] ✅ Step 2 complete: Extracted ${extractedText.length} characters from ${totalPages} pages in ${Date.now() - startTime}ms`)

        // Validate text length
        if (extractedText.length < 50) {
            const error = `文件內容太少（僅 ${extractedText.length} 字元），無法生成分析。請確認文件包含可讀文字。`
            console.error(`[Background] ❌ Validation failed:`, error)
            throw new Error(error)
        }

        // Update page count in database
        console.log('[Background] 📝 Step 3: Updating page count in database...')
        const pageCountUpdate = await supabase
            .from('file_analysis')
            .update({ page_count: totalPages })
            .eq('id', analysisId)

        if (pageCountUpdate.error) {
            console.error('[Background] ⚠️ Failed to update page count:', pageCountUpdate.error)
        } else {
            console.log(`[Background] ✅ Page count updated: ${totalPages}`)
        }

        // ========================================
        // Step 4: ULTIMATE PARALLEL ANALYSIS
        // ========================================
        console.log('[Background] 📝 Step 4: Starting parallel AI analysis...')
        console.log('[Background] 🚀 Running QuickPreview + UltimateAnalysis in parallel...')

        const endSubjectDetect = telemetry.startStage('subject_detection')
        const endUltimateAnalysis = telemetry.startStage('ultimate_analysis')

        let quickPreview: QuickPreview
        let ultimateResult: UltimateAnalysisResult

        try {
            console.log('[Background] 📡 Calling Gemini API for parallel analysis...')
            const analysisStartTime = Date.now()

            [quickPreview, ultimateResult] = await Promise.all([
                generateQuickPreview(extractedText).catch(err => {
                    console.error('[Background] ❌ QuickPreview failed:', {
                        error: err instanceof Error ? err.message : String(err),
                        stack: err instanceof Error ? err.stack : undefined
                    })
                    throw new Error(`快速預覽生成失敗: ${err instanceof Error ? err.message : String(err)}`)
                }),
                generateUltimateAnalysis(extractedText, null).catch(err => {
                    console.error('[Background] ❌ UltimateAnalysis failed:', {
                        error: err instanceof Error ? err.message : String(err),
                        stack: err instanceof Error ? err.stack : undefined
                    })
                    throw new Error(`完整分析生成失敗: ${err instanceof Error ? err.message : String(err)}`)
                })
            ])

            const analysisDuration = Date.now() - analysisStartTime
            console.log(`[Background] ✅ Parallel analysis completed in ${analysisDuration}ms`)
            console.log(`[Background] 📊 Results:`, {
                subject: quickPreview.subject,
                summaryLength: quickPreview.summary.length,
                topicsCount: quickPreview.topics.length,
                fullMarkdownLength: ultimateResult.fullMarkdown.length
            })
        } catch (parallelError) {
            console.error('[Background] ❌ CRITICAL: Parallel analysis failed:', {
                error: parallelError instanceof Error ? parallelError.message : String(parallelError),
                stack: parallelError instanceof Error ? parallelError.stack : undefined,
                duration: `${Date.now() - startTime}ms`
            })
            throw parallelError
        }

        endSubjectDetect()
        endUltimateAnalysis()

        const subject = quickPreview.subject
        console.log(`[Background] ✅ Step 4 complete: Subject detected as "${subject}" in ${Date.now() - startTime}ms`)

        // Step 5: Update with quick preview
        console.log('[Background] 📝 Step 5: Saving quick preview to database...')
        const previewUpdate = await supabase
            .from('file_analysis')
            .update({
                quick_summary: quickPreview.summary,
                detected_subject: subject,
                detected_topics: quickPreview.topics,
                processing_time_ms: Date.now() - startTime
            })
            .eq('id', analysisId)

        if (previewUpdate.error) {
            console.error('[Background] ❌ Failed to save quick preview:', previewUpdate.error)
            throw new Error(`資料庫更新失敗: ${previewUpdate.error.message}`)
        }

        console.log('[Background] ✅ Step 5 complete: Quick preview saved')

        // Step 6: Update with full analysis results
        console.log('[Background] 📝 Step 6: Saving full analysis to database...')
        const finalUpdate = await supabase
            .from('file_analysis')
            .update({
                structured_notes: ultimateResult.fullMarkdown,
                core_concepts: [{ name: 'Preview', explanation: ultimateResult.preview }],
                exam_predictions: [],
                status: 'prediction_ready',
                processing_time_ms: Date.now() - startTime
            })
            .eq('id', analysisId)

        if (finalUpdate.error) {
            console.error('[Background] ❌ CRITICAL: Failed to save final analysis:', finalUpdate.error)
            throw new Error(`最終結果儲存失敗: ${finalUpdate.error.message}`)
        }

        console.log(`[Background] ✅ Step 6 complete: Full analysis saved`)
        console.log(`[Background] 🎉 Analysis complete! Status: prediction_ready (${Date.now() - startTime}ms)`)

        // ========================================
        // Save exam questions to question bank
        // ========================================
        const { data: finalAnalysis } = await supabase
            .from('file_analysis')
            .select('exam_predictions')
            .eq('id', analysisId)
            .single()

        if (finalAnalysis?.exam_predictions && finalAnalysis.exam_predictions.length > 0) {
            const questionRecords = finalAnalysis.exam_predictions.map((q: any) => ({
                file_id: fileId,
                user_id: userId,
                analysis_id: analysisId,
                question_text: q.questionText,
                question_type: q.questionType,
                options: q.options || null,
                correct_answer: q.correctAnswer,
                explanation: q.explanation,
                difficulty: q.difficulty,
                topic_tags: q.topicTags,
                source_pages: q.sourcePages,
                confidence_score: q.confidenceScore
            }))

            const { error: questionsError } = await supabase
                .from('exam_question_bank')
                .insert(questionRecords)

            if (questionsError) {
                console.error('[Background] Failed to save questions:', questionsError)
            } else {
                console.log(`[Background] ✅ Saved ${questionRecords.length} questions to bank`)
            }
        }

        // Record final telemetry
        const totalDuration = Date.now() - startTime
        telemetry.log() // Log to console for development
        console.log(`[Background] 🎉 Analysis complete! Total time: ${totalDuration}ms`)

        const telemetryData = telemetry.getMetrics()
        const { error: telemetryError } = await supabase
            .from('rag_telemetry')
            .insert({
                analysis_id: analysisId,
                user_id: userId,
                ...telemetryData
            })

        if (telemetryError) {
            console.error('[Background] Failed to save telemetry:', telemetryError)
        } else {
            console.log('[Background] ✅ Telemetry saved')
        }

        // ========================================
        // Write to cache for future requests
        // ========================================
        try {
            const { data: completedAnalysis } = await supabase
                .from('file_analysis')
                .select('*')
                .eq('id', analysisId)
                .single()

            if (completedAnalysis && calculatedHash) {
                await setCachedAnalysis(calculatedHash, {
                    fileId,
                    analysisId,
                    fileName,
                    numPages: totalPages,
                    status: completedAnalysis.status,
                    quickSummary: completedAnalysis.quick_summary,
                    detectedSubject: completedAnalysis.detected_subject,
                    detectedTopics: completedAnalysis.detected_topics,
                    structuredNotes: completedAnalysis.structured_notes,
                    examPredictions: completedAnalysis.exam_predictions,
                    processingTimeMs: completedAnalysis.processing_time_ms
                })
                console.log(`[Background] ✅ Cached analysis for future requests`)
            }
        } catch (cacheError) {
            console.error('[Background] Failed to cache analysis:', cacheError)
            // Don't fail the entire process if caching fails
        }
    } catch (error) {
        console.error('[Background] ❌ Analysis failed:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            fileId,
            analysisId,
            duration: `${Date.now() - startTime}ms`
        })

        const errorMessage = error instanceof Error ? error.message : '分析失敗'
        const errorDetails = {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        }

        await supabase
            .from('file_analysis')
            .update({
                status: 'failed',
                error_message: errorMessage,
                error_details: JSON.stringify(errorDetails),
                processing_time_ms: Date.now() - startTime
            })
            .eq('id', analysisId)

        telemetry.recordError('background', errorMessage)

        // Save telemetry even on failure
        const telemetryData = telemetry.getMetrics()
        await supabase
            .from('rag_telemetry')
            .insert({
                analysis_id: analysisId,
                user_id: userId,
                ...telemetryData
            })
            .catch((err: any) => console.error('[Background] Failed to save error telemetry:', err))
    }
}

/**
 * GET /api/rag/upload-elite?analysisId=xxx
 * 
 * Poll for analysis status and results
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return NextResponse.json(
                { error: 'UNAUTHORIZED', message: '需要登入' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(req.url)
        const analysisId = searchParams.get('analysisId')

        if (!analysisId) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: '缺少 analysisId 參數' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('file_analysis')
            .select('*')
            .eq('id', analysisId)
            .eq('user_id', user.id)
            .single()

        if (error || !data) {
            return NextResponse.json(
                { error: 'NOT_FOUND', message: '找不到分析記錄' },
                { status: 404 }
            )
        }

        // Transform snake_case to camelCase for frontend
        const transformedAnalysis = {
            id: data.id,
            status: data.status,
            processingTimeMs: data.processing_time_ms,
            // Layer 1
            quickSummary: data.quick_summary,
            detectedSubject: data.detected_subject,
            detectedTopics: data.detected_topics,
            // Layer 2
            coreConcepts: data.core_concepts,
            keyInsights: data.key_insights,
            suggestedQuestions: data.suggested_questions,
            structuredNotes: data.structured_notes,
            // Layer 3
            examPredictions: data.exam_predictions,
            weakPoints: data.weak_points,
            studyRoadmap: data.study_roadmap,
            errorMessage: data.error_message
        }

        return NextResponse.json({
            success: true,
            analysis: transformedAnalysis
        })
    } catch (error) {
        console.error('[Elite Upload GET] Error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: '未知錯誤' },
            { status: 500 }
        )
    }
}
