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

        // Calculate combined hash
        let combinedBuffer = Buffer.alloc(0)
        for (const file of validFiles) {
            const buf = Buffer.from(await file.arrayBuffer())
            combinedBuffer = Buffer.concat([combinedBuffer, buf])
        }

        const fileHash = calculateFileHash(combinedBuffer)
        const telemetry = new RagTelemetry()
        // telemetry.recordFile will be called after extraction

        console.log(`[Elite Upload] File hash: ${fileHash.substring(0, 16)}...`)

        // 5. ⚡ Cache disabled for testing
        // 6. ⚡ Database cache also disabled for testing

        // 6. ⭐ ChatGPT-style: 只在內存中處理，不存儲文件
        // 優勢：零配置、更快、更簡單
        const fileId = randomUUID() // Still used for background processing

        // 8. 創建 analysis record（存儲文件名，方便顯示）
        const analysisId = randomUUID()
        const { error: analysisError } = await supabase
            .from('file_analysis')
            .insert({
                id: analysisId,
                // file_id: null,  // ⭐ Not inserted - no files table dependency
                user_id: user.id,
                file_name: mainFileName,  // ⭐ 直接存文件名
                status: 'pending'
                // Note: cache_hit removed - not in original schema
            })

        if (analysisError) {
            console.error('[Elite Upload] Analysis insert error:', analysisError)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: '分析記錄創建失敗' },
                { status: 500 }
            )
        }

        console.log(`[Elite Upload] ✅ Analysis record created (${Date.now() - startTime}ms)`)

        // 9. ⭐ IMMEDIATELY return to client (< 1 second!)
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

        // 10. ⭐ Trigger background processing (PDF extraction + 3-layer analysis)
        // This runs AFTER the response is sent to the client
        processCompleteAnalysisInBackground(
            fileId,
            analysisId,
            validFiles, // Pass array of files
            mainFileName,
            user.id,
            supabase,
            telemetry,
            fileHash
        ).catch(error => {
            console.error('[Elite Upload] Background processing error:', error)
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
    fileHash: string
) {
    const startTime = Date.now()

    try {
        console.log(`[Background] 🚀 Starting complete analysis for file ${fileId}`)

        // ========================================
        // Step 0: Extract PDF text (this was blocking before!)
        // ========================================
        // ========================================
        // Step 0: Extract text from ALL files
        // ========================================
        console.log(`[Background] 📄 Extracting text from ${files.length} files...`)
        const endExtraction = telemetry.startStage('text_extraction')

        let extractedText = ''
        let totalPages = 0

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer())
            const type = file.type
            const name = file.name.toLowerCase()

            try {
                if (type === 'application/pdf' || name.endsWith('.pdf')) {
                    const pdfData = await extractTextFromPDFWithGemini(buffer)
                    extractedText += `\n\n--- File: ${file.name} ---\n\n` + pdfData.text
                    totalPages += pdfData.numPages
                } else if (type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif)$/)) {
                    const text = await extractTextFromImageWithGemini(buffer, type || 'image/jpeg')
                    extractedText += `\n\n--- Image: ${file.name} ---\n\n` + text
                    totalPages += 1
                } else {
                    // TXT
                    const text = buffer.toString('utf-8').trim()
                    extractedText += `\n\n--- File: ${file.name} ---\n\n` + text
                    totalPages += 1
                }
            } catch (err) {
                console.error(`[Background] Failed to extract ${file.name}:`, err)
                extractedText += `\n\n--- File: ${file.name} (Extraction Failed) ---\n\n`
            }
        }

        endExtraction()
        // telemetry.recordFile(buffer.length, extractedText.length) // TODO: Update telemetry for multi-file

        console.log(`[Background] ✅ Extracted total ${extractedText.length} characters (${totalPages} pages)`)

        // Validate text length
        if (extractedText.length < 50) {
            throw new Error(`文件內容太少（僅 ${extractedText.length} 字元），無法生成分析。`)
        }

        // Update analysis status to processing
        await supabase
            .from('file_analysis')
            .update({
                status: 'processing',
                page_count: totalPages  // 存頁數到 analysis 表
            })
            .eq('id', analysisId)

        console.log(`[Background] 📊 PDF extraction complete in ${Date.now() - startTime}ms`)

        // ========================================
        // ⚡ ULTIMATE PARALLEL ANALYSIS (10s target)
        // All three layers (preview, summary, questions) run in parallel
        // ========================================
        console.log('[Background] 🚀 Starting ultimate parallel analysis...')

        // Detect subject first
        const endSubjectDetect = telemetry.startStage('subject_detection')
        const quickPreview = await generateQuickPreview(extractedText)
        endSubjectDetect()

        const subject = quickPreview.subject
        console.log(`[Background] Detected subject: ${subject}`)

        // Update with quick preview immediately
        await supabase
            .from('file_analysis')
            .update({
                quick_summary: quickPreview.summary,
                detected_subject: subject,
                detected_topics: quickPreview.topics,
                processing_time_ms: Date.now() - startTime
            })
            .eq('id', analysisId)

        // Run ultimate analysis (all three layers in parallel)
        const endUltimateAnalysis = telemetry.startStage('ultimate_analysis')
        const ultimateResult = await generateUltimateAnalysis(extractedText, subject)
        endUltimateAnalysis()

        console.log(`[Background] ✅ Ultimate analysis complete in ${Date.now() - startTime}ms`)

        // Update with all results
        await supabase
            .from('file_analysis')
            .update({
                structured_notes: ultimateResult.fullMarkdown,
                // Store individual parts for backward compatibility
                core_concepts: [{ name: 'Preview', explanation: ultimateResult.preview }],
                exam_predictions: [],  // Will be parsed from markdown
                status: 'prediction_ready',
                processing_time_ms: Date.now() - startTime
            })
            .eq('id', analysisId)


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

            if (completedAnalysis && fileHash) {
                await setCachedAnalysis(fileHash, {
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
