
import { createClient } from '@supabase/supabase-js'
import { cleanText } from '@/lib/utils/text-extraction'
import { extractTextSmart } from '@/lib/services/smart-text-extractor'
import { generateSummary, extractKeywords } from '@/lib/services/rag-summary'
import { TokenCounterService } from '@/lib/services/token-counter'
// Use dynamic imports for services that might use Node.js specific modules to avoid build issues in edge environments if used there,
// though this service is likely Node.js only.
import { GeminiContextCacheService } from '@/lib/services/gemini-context-cache'
import { GoogleFileSearchService } from '@/lib/services/google-file-search'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Constants
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role Key for background tasks

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

export interface IndexingResult {
    documentId: string
    status: 'processing' | 'ready' | 'error'
    storageType?: 'CONTEXT_CACHE' | 'FILE_SEARCH'
    tokenCount?: number
    summary?: string
    error?: string
}

export class RagIndexingService {
    /**
     * Process a file for RAG: Extract text, Index, Summary, and Link to Backpack
     */
    static async processDocument(
        fileBuffer: Buffer,
        fileName: string,
        fileType: string,
        fileSize: number,
        userId: string,
        options: {
            backpackItemId?: string
            isBackground?: boolean
        } = {}
    ): Promise<IndexingResult> {
        console.log(`[RagIndexingService] 🚀 Processing: ${fileName} (${fileSize} bytes) for User: ${userId}`)

        // 1. Text Extraction
        let cleanedText = ''
        let numPages = 0

        try {
            const extraction = await extractTextSmart(fileBuffer, fileName, fileType)
            cleanedText = cleanText(extraction.text)
            numPages = extraction.numPages || 0
            console.log(`[RagIndexingService] Text extracted: ${cleanedText.length} chars`)
        } catch (error) {
            console.error('[RagIndexingService] Extraction failed:', error)
            throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : String(error)}`)
        }

        if (cleanedText.length < 50) {
            throw new Error('Text too short for indexing')
        }

        // 2. Create Initial DB Record (or find existing)
        // Check for existing document hash/deduplication could go here

        // 2. Create Initial DB Record with ACID Transaction
        // Uses the 038_atomic_storage_sync.sql RPC function

        let dbFileType = 'txt'
        if (fileName.endsWith('.pdf')) dbFileType = 'pdf'
        else if (fileType.startsWith('image/')) dbFileType = 'image'

        const { data: atomicResult, error: rpcError } = await supabaseAdmin.rpc('upload_document_atomic', {
            p_user_id: userId,
            p_filename: fileName,
            p_file_size: fileSize,
            p_file_type: dbFileType,
            p_original_text: cleanedText,
            p_backpack_item_id: options.backpackItemId || null
        })

        if (rpcError) {
            console.error('[RagIndexingService] Atomic RPC Error:', rpcError)
            throw new Error(`Database transaction failed: ${rpcError.message}`)
        }

        // Parse result from JSONB
        const documentId = atomicResult.rag_document_id
        console.log(`[RagIndexingService] Atomic Transaction Success. RAG ID: ${documentId}, Backpack ID: ${atomicResult.backpack_item_id}`)

        // 3. Background Processing (Indexing & Summary)
        const processJob = async () => {
            try {
                // Token Counting
                const tokenCount = await TokenCounterService.countTokens(cleanedText)
                let storageType: 'CONTEXT_CACHE' | 'FILE_SEARCH' = 'CONTEXT_CACHE'
                let googleResourceId: string | null = null

                // Routing Strategy
                if (tokenCount <= TokenCounterService.THRESHOLD) {
                    // Context Cache
                    console.log(`[RagIndexingService] Routing to Context Cache (${tokenCount} tokens)`)
                    try {
                        const cacheResult = await GeminiContextCacheService.createCache(
                            cleanedText,
                            `${fileName}-${documentId}`,
                            `You are a helpful academic assistant. Answer based on document: ${fileName}`
                        )
                        googleResourceId = cacheResult.cacheName
                        storageType = 'CONTEXT_CACHE'
                    } catch (e) {
                        console.error('[RagIndexingService] Cache creation failed', e)
                    }
                } else {
                    // File Search
                    console.log(`[RagIndexingService] Routing to File Search (${tokenCount} tokens)`)
                    storageType = 'FILE_SEARCH'
                    try {
                        const tempFilePath = path.join(os.tmpdir(), `upload-${documentId}-${fileName}`)
                        await fs.promises.writeFile(tempFilePath, fileBuffer)

                        const googleFile = await GoogleFileSearchService.uploadFile(
                            tempFilePath,
                            fileType || 'text/plain',
                            fileName
                        )
                        await fs.promises.unlink(tempFilePath)
                        googleResourceId = googleFile.name

                        await GoogleFileSearchService.waitForFileActive(googleFile.name)
                        const userStore = await GoogleFileSearchService.getUserStore(userId)
                        await GoogleFileSearchService.importFileToStore(userStore.name, googleFile.name)
                    } catch (e) {
                        console.error('[RagIndexingService] File Search failed', e)
                    }
                }

                // Summary Generation
                let summary = ''
                let keywords: string[] = []
                if (cleanedText.length > 10000) {
                    const summaryResult = await generateSummary(cleanedText, { numSentences: 5, numKeywords: 10 })
                    summary = summaryResult.summary
                    keywords = summaryResult.keywords
                } else {
                    summary = cleanedText.substring(0, 200) + '...'
                    keywords = await extractKeywords(cleanedText.substring(0, 500), 5).catch(() => [])
                }

                // Update DB
                await supabaseAdmin
                    .from('rag_documents')
                    .update({
                        summary,
                        keywords,
                        storage_type: storageType,
                        google_resource_id: googleResourceId,
                        token_count: tokenCount,
                        status: 'ready',
                        processed_at: new Date().toISOString()
                    })
                    .eq('id', documentId)

                // 4. Sync done atomically by RPC
                console.log(`[RagIndexingService] ✅ Indexing Complete: ${documentId}`)

            } catch (error) {
                console.error(`[RagIndexingService] ❌ Job failed for ${documentId}:`, error)
                await supabaseAdmin
                    .from('rag_documents')
                    .update({
                        status: 'error',
                        error_message: error instanceof Error ? error.message : 'Unknown error'
                    })
                    .eq('id', documentId)
            }
        }

        if (options.isBackground) {
            // Fire and forget
            processJob()
        } else {
            // Await execution
            await processJob()
        }

        return {
            documentId,
            status: 'processing' // Initially processing if backgrounded, or checking if we awaited
        }
    }
}

