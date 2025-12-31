
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { generateQuickPreview, generateUltimateAnalysis, generateStreamedAnalysis } from '@/lib/services/elite-rag-analyzer'
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/cache/redis-cache'
import { calculateFileHash, RagTelemetry } from '@/lib/utils/rag-telemetry'
import { extractTextFromPDFWithGemini, extractTextFromImageWithGemini } from '@/lib/services/elite-rag-analyzer'

// Use Node.js runtime (Edge Runtime doesn't support Buffer, crypto, pdf-parse, Redis)
export const dynamic = 'force-dynamic'

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))

            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt)
                console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
    }

    throw lastError || new Error('Retry failed')
}

/**
 * Safe database operation with retry
 */
async function safeDbOperation<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    operationName: string
): Promise<T> {
    try {
        const result = await retryWithBackoff(operation, 3, 500)

        if (result.error) {
            console.error(`[DB] ${operationName} error: `, result.error)
            throw new Error(`${operationName} failed: ${result.error.message} `)
        }

        if (!result.data) {
            throw new Error(`${operationName} returned no data`)
        }

        return result.data
    } catch (error) {
        console.error(`[DB] ${operationName} failed after retries: `, error)
        throw error
    }
}

/**
 * POST /api/rag/analyze-stream
 * 
 * ⚡ SSE Streaming Version of RAG Analysis
 * 
 * Streams the analysis generation in real-time for instant feedback.
 * 
 * SSE Event Types:
 * - 'progress': Progress update with message and percentage
 * - 'preview': Quick preview ready
 * - 'complete': Full analysis complete
 * - 'error': Error occurred
 */
export async function POST(request: NextRequest) {
    try {
        // ⚡ Edge-compatible authentication
        const authHeader = request.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(
                JSON.stringify({ error: 'UNAUTHORIZED', message: 'Authentication required' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Parse multipart form data
        const formData = await request.formData()
        const files = formData.getAll('file') as File[]

        if (!files || files.length === 0) {
            return new Response(
                JSON.stringify({ error: 'VALIDATION_ERROR', message: 'No files provided' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Extract text from files (using existing logic)
        // We'll reuse the smart extractor logic but simplify the flow
        const { extractMultipleFilesSmart } = await import('@/lib/services/smart-text-extractor')

        const fileData = await Promise.all(
            files.map(async (file) => ({
                buffer: Buffer.from(await file.arrayBuffer()),
                name: file.name,
                type: file.type,
                hash: '' // Hash calculation skipped for speed in this MVP step
            }))
        )

        console.log('[RAG Stream] 🚀 Starting text extraction for', files.length, 'files')
        const results = await extractMultipleFilesSmart(fileData)
        const extractedText = results.map(r => r.text).join('\n\n')

        if (extractedText.length < 50) {
            return new Response(
                JSON.stringify({ error: 'VALIDATION_ERROR', message: 'File content too short or empty' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        console.log('[RAG Stream] ✅ Extraction complete, starting AI stream...')

        // Call the new Vercel AI SDK streaming function
        return generateStreamedAnalysis(extractedText)

    } catch (error) {
        console.error('[RAG Stream] ❌ Error:', error)
        return new Response(
            JSON.stringify({
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
