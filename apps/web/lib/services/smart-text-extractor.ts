import sharp from 'sharp'
import { extractTextFromPDFWithGemini, extractTextFromImageWithGemini } from './elite-rag-analyzer'
import { getRedisClient } from '../redis'

/**
 * 🚀 Smart Text Extractor - 智能文字提取器
 * 
 * 自動選擇最佳提取方法:
 * - 純文字: 直接讀取 (< 100ms)
 * - 文字型 PDF: pdf-parse (< 1s)
 * - 掃描型 PDF: Gemini OCR (5-10s)
 * - 圖片: 壓縮 + Gemini OCR (3-5s)
 */

export interface ExtractionResult {
    text: string
    numPages: number
    method: 'direct' | 'pdf-parse' | 'gemini-ocr' | 'cached'
    durationMs: number
}

/**
 * 智能提取文字 - 自動選擇最佳方法
 */
export async function extractTextSmart(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    fileHash?: string
): Promise<ExtractionResult> {
    const startTime = Date.now()

    // L1: 檢查快取（非阻塞，超時保護）
    if (fileHash) {
        try {
            const cached = await getCachedText(fileHash)
            if (cached) {
                console.log(`[SmartExtractor] ⚡ Cache hit for ${fileName}`)
                return {
                    ...cached,
                    method: 'cached',
                    durationMs: Date.now() - startTime
                }
            }
        } catch (cacheError) {
            console.warn(`[SmartExtractor] Cache check failed (non-critical), continuing:`, cacheError)
            // 繼續執行，不因快取失敗而中斷
        }
    }

    let result: ExtractionResult

    // 純文字檔 - 直接讀取
    if (fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        console.log(`[SmartExtractor] 📄 Direct text extraction: ${fileName}`)
        result = {
            text: fileBuffer.toString('utf-8'),
            numPages: 1,
            method: 'direct',
            durationMs: Date.now() - startTime
        }
    }
    // PDF - 智能分流
    else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        result = await extractPDFSmart(fileBuffer, fileName, startTime)
    }
    // 圖片 - 壓縮 + OCR
    else if (fileType.startsWith('image/')) {
        result = await extractImageSmart(fileBuffer, fileName, fileType, startTime)
    }
    // 其他 - 嘗試文字讀取
    else {
        console.log(`[SmartExtractor] 🔤 Attempting text read: ${fileName}`)
        result = {
            text: fileBuffer.toString('utf-8'),
            numPages: 1,
            method: 'direct',
            durationMs: Date.now() - startTime
        }
    }

    // 快取結果（非阻塞，失敗不影響主流程）
    if (fileHash && result.text.length > 50) {
        // 異步執行，不等待完成
        cacheText(fileHash, result).catch(error => {
            console.warn('[SmartExtractor] Background cache write failed (non-critical):', error)
        })
    }

    console.log(`[SmartExtractor] ✅ Extracted ${result.text.length} chars in ${result.durationMs}ms using ${result.method}`)
    return result
}

/**
 * PDF 智能提取 - 混合策略（頂尖實作）
 * 
 * 策略：
 * 1. 先用 pdf-parse 提取文字層（快速）
 * 2. 如果文字充足 (>100 chars/page)：直接使用
 * 3. 如果文字不足但有部分文字：混合模式
 *    - 保留原有文字層
 *    - 用 Gemini OCR 補充圖片內容
 * 4. 如果完全沒文字：純 OCR 模式
 */
async function extractPDFSmart(
    fileBuffer: Buffer,
    fileName: string,
    startTime: number
): Promise<ExtractionResult> {
    console.log(`[SmartExtractor] 📑 PDF smart extraction: ${fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB)`)

    try {
        // ========================================
        // Step 1: 快速文字提取 (pdf-parse)
        // ========================================
        const fastStart = Date.now()
        const PDF_PARSE_TIMEOUT = 5000 // 5 秒超時

        let pdfData: any
        try {
            // Dynamic import to handle ESM/CommonJS compatibility
            const pdfParseModule = await import('pdf-parse')
            const pdfParseFunc = (pdfParseModule as any).default || pdfParseModule

            // 使用 Promise.race 實現超時
            pdfData = await Promise.race([
                pdfParseFunc(fileBuffer),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('pdf-parse timeout')), PDF_PARSE_TIMEOUT)
                )
            ]) as any
        } catch (timeoutError) {
            console.warn(`[SmartExtractor] pdf-parse timeout, using Gemini OCR:`, timeoutError)
            const { text, numPages } = await extractTextFromPDFWithGemini(fileBuffer)
            return {
                text,
                numPages,
                method: 'gemini-ocr',
                durationMs: Date.now() - startTime
            }
        }

        const fastDuration = Date.now() - fastStart
        const extractedText = pdfData.text.trim()
        const numPages = pdfData.numpages
        const avgCharsPerPage = numPages > 0 ? extractedText.length / numPages : 0

        console.log(`[SmartExtractor] pdf-parse: ${extractedText.length} chars, ${numPages} pages in ${fastDuration}ms`)
        console.log(`[SmartExtractor] Average: ${avgCharsPerPage.toFixed(0)} chars/page`)

        // ========================================
        // Step 2: 智能判斷處理策略
        // ========================================

        // 策略 A: 文字層充足 (>100 chars/page) → 直接使用
        if (avgCharsPerPage >= 100) {
            console.log(`[SmartExtractor] ✅ Rich text layer detected, using pdf-parse only`)
            return {
                text: extractedText,
                numPages,
                method: 'pdf-parse',
                durationMs: Date.now() - startTime
            }
        }

        // 策略 B: 有部分文字 (10-100 chars/page) → 混合模式
        else if (avgCharsPerPage >= 10 && extractedText.length > 0) {
            console.log(`[SmartExtractor] 🔀 Hybrid mode: partial text (${avgCharsPerPage.toFixed(0)} chars/page) + OCR for images`)

            try {
                // 用 Gemini OCR 提取完整內容（包含圖片中的文字）
                const { text: ocrText } = await extractTextFromPDFWithGemini(fileBuffer)

                // 智能合併：如果 OCR 結果明顯更豐富，使用 OCR；否則保留原文字層
                if (ocrText.length > extractedText.length * 1.5) {
                    console.log(`[SmartExtractor] ✅ OCR provided richer content (${ocrText.length} vs ${extractedText.length} chars), using OCR`)
                    return {
                        text: ocrText,
                        numPages,
                        method: 'gemini-ocr',
                        durationMs: Date.now() - startTime
                    }
                } else {
                    console.log(`[SmartExtractor] ✅ Text layer sufficient, keeping original`)
                    return {
                        text: extractedText,
                        numPages,
                        method: 'pdf-parse',
                        durationMs: Date.now() - startTime
                    }
                }
            } catch (ocrError) {
                // OCR 失敗，退回使用原文字層
                console.warn(`[SmartExtractor] ⚠️ OCR failed in hybrid mode, using text layer:`, ocrError)
                return {
                    text: extractedText,
                    numPages,
                    method: 'pdf-parse',
                    durationMs: Date.now() - startTime
                }
            }
        }

        // 策略 C: 幾乎沒文字 (<10 chars/page) → 純 OCR
        else {
            console.log(`[SmartExtractor] 🔍 Scanned PDF detected (${avgCharsPerPage.toFixed(0)} chars/page), using pure OCR`)
            const { text, numPages: ocrPages } = await extractTextFromPDFWithGemini(fileBuffer)
            return {
                text,
                numPages: ocrPages || numPages,
                method: 'gemini-ocr',
                durationMs: Date.now() - startTime
            }
        }

    } catch (error) {
        // pdf-parse 完全失敗 - 降級到 Gemini OCR
        console.warn(`[SmartExtractor] pdf-parse failed, falling back to Gemini OCR:`, error)
        try {
            const { text, numPages } = await extractTextFromPDFWithGemini(fileBuffer)
            return {
                text,
                numPages,
                method: 'gemini-ocr',
                durationMs: Date.now() - startTime
            }
        } catch (ocrError) {
            console.error(`[SmartExtractor] ❌ Both pdf-parse and Gemini OCR failed:`, ocrError)
            throw new Error(`PDF extraction failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`)
        }
    }
}

/**
 * 圖片智能提取 - 壓縮後 OCR
 */
async function extractImageSmart(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    startTime: number
): Promise<ExtractionResult> {
    console.log(`[SmartExtractor] 🖼️ Image extraction: ${fileName}`)

    try {
        // 壓縮圖片 (減少 API 傳輸時間)
        const compressed = await sharp(fileBuffer)
            .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer()

        const compressionRatio = ((1 - compressed.length / fileBuffer.length) * 100).toFixed(1)
        console.log(`[SmartExtractor] Compressed image: ${compressionRatio}% reduction`)

        const text = await extractTextFromImageWithGemini(compressed, 'image/jpeg')
        return {
            text,
            numPages: 1,
            method: 'gemini-ocr',
            durationMs: Date.now() - startTime
        }
    } catch (error) {
        console.warn(`[SmartExtractor] Image compression failed, using original:`, error)
        const text = await extractTextFromImageWithGemini(fileBuffer, fileType)
        return {
            text,
            numPages: 1,
            method: 'gemini-ocr',
            durationMs: Date.now() - startTime
        }
    }
}

/**
 * 並行提取多個檔案
 * 優化：智能批次大小、錯誤恢復、性能追蹤
 */
export async function extractMultipleFilesSmart(
    files: Array<{ buffer: Buffer; name: string; type: string; hash?: string }>
): Promise<ExtractionResult[]> {
    const startTime = Date.now()
    console.log(`[SmartExtractor] 🚀 Parallel extraction of ${files.length} files`)

    // 動態調整並行數量：小檔案可以更多並行，大檔案減少並行
    const getMaxParallel = (fileCount: number, avgSize: number) => {
        if (fileCount <= 2) return fileCount
        if (avgSize < 1024 * 1024) return 5 // < 1MB: 5 並行
        if (avgSize < 5 * 1024 * 1024) return 3 // < 5MB: 3 並行
        return 2 // >= 5MB: 2 並行
    }

    const avgSize = files.reduce((sum, f) => sum + f.buffer.length, 0) / files.length
    const MAX_PARALLEL = getMaxParallel(files.length, avgSize)

    console.log(`[SmartExtractor] Config: ${files.length} files, avg size: ${(avgSize / 1024).toFixed(1)} KB, max parallel: ${MAX_PARALLEL}`)

    const results: ExtractionResult[] = []
    const errors: Array<{ file: string; error: string }> = []

    for (let i = 0; i < files.length; i += MAX_PARALLEL) {
        const batch = files.slice(i, i + MAX_PARALLEL)
        const batchNum = Math.floor(i / MAX_PARALLEL) + 1
        const totalBatches = Math.ceil(files.length / MAX_PARALLEL)
        console.log(`[SmartExtractor] 📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} files): ${batch.map(f => f.name).join(', ')}`)

        const batchStart = Date.now()
        let batchResults: PromiseSettledResult<ExtractionResult>[]

        try {
            batchResults = await Promise.allSettled(
                batch.map((file, idx) => {
                    console.log(`[SmartExtractor] Starting extraction ${idx + 1}/${batch.length}: ${file.name}`)
                    return extractTextSmart(file.buffer, file.name, file.type, file.hash)
                })
            )
        } catch (batchError) {
            console.error(`[SmartExtractor] ❌ Batch ${batchNum} failed:`, batchError)
            // 為每個檔案創建錯誤結果
            batchResults = batch.map(() => ({
                status: 'rejected' as const,
                reason: batchError instanceof Error ? batchError : new Error(String(batchError))
            }))
        }

        const batchTime = Date.now() - batchStart
        console.log(`[SmartExtractor] Batch ${batchNum} completed in ${batchTime}ms`)

        // 處理批次結果
        for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j]
            const fileName = batch[j].name

            if (result.status === 'fulfilled') {
                results.push(result.value)
                console.log(`[SmartExtractor] ✅ ${fileName}: ${result.value.method} (${result.value.durationMs}ms, ${result.value.text.length} chars)`)
            } else {
                const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
                const errorStack = result.reason instanceof Error ? result.reason.stack : undefined
                errors.push({ file: fileName, error: errorMsg })
                console.error(`[SmartExtractor] ❌ ${fileName} failed:`, errorMsg)
                if (errorStack) {
                    console.error(`[SmartExtractor] Error stack:`, errorStack)
                }

                // 添加錯誤結果（允許部分失敗）
                results.push({
                    text: '',
                    numPages: 0,
                    method: 'gemini-ocr',
                    durationMs: 0
                })
            }
        }
    }

    const totalTime = Date.now() - startTime
    const successCount = results.filter(r => r.text.length > 0).length
    console.log(`[SmartExtractor] ✅ Completed: ${successCount}/${files.length} files in ${totalTime}ms (avg: ${(totalTime / files.length).toFixed(0)}ms/file)`)

    if (errors.length > 0) {
        console.warn(`[SmartExtractor] ⚠️ ${errors.length} files failed:`, errors.map(e => e.file).join(', '))
    }

    return results
}

/**
 * 快取文字提取結果
 * 添加超時保護，避免阻塞主流程
 */
async function cacheText(fileHash: string, result: ExtractionResult): Promise<void> {
    try {
        const redis = getRedisClient()
        if (!redis) {
            console.log('[SmartExtractor] Redis not available, skipping cache write')
            return
        }

        const cacheKey = `text:${fileHash}`
        const cacheData = JSON.stringify({
            text: result.text,
            numPages: result.numPages,
            method: result.method
        })

        // 快取 24 小時，添加超時保護（500ms）
        await Promise.race([
            redis.setEx(cacheKey, 86400, cacheData),
            new Promise<void>((resolve) =>
                setTimeout(() => {
                    console.warn('[SmartExtractor] Cache write timeout, continuing')
                    resolve()
                }, 500)
            )
        ])

        console.log(`[SmartExtractor] 💾 Cached text extraction for ${fileHash}`)
    } catch (error) {
        console.warn('[SmartExtractor] Failed to cache text (non-critical):', error)
        // 不拋出錯誤，快取失敗不影響主流程
    }
}

/**
 * 獲取快取的文字
 * 添加超時保護，避免 Redis 連接問題導致卡住
 */
async function getCachedText(fileHash: string): Promise<Omit<ExtractionResult, 'durationMs' | 'method'> | null> {
    try {
        const redis = getRedisClient()
        if (!redis) {
            console.log('[SmartExtractor] Redis not available, skipping cache')
            return null
        }

        const cacheKey = `text:${fileHash}`

        // 添加超時保護（1秒）
        const cached = await Promise.race([
            redis.get(cacheKey),
            new Promise<null>((resolve) =>
                setTimeout(() => {
                    console.warn('[SmartExtractor] Cache lookup timeout, continuing without cache')
                    resolve(null)
                }, 1000)
            )
        ])

        if (cached) {
            return JSON.parse(cached)
        }
    } catch (error) {
        console.warn('[SmartExtractor] Failed to get cached text (non-critical):', error)
        // 不拋出錯誤，繼續執行
    }

    return null
}
