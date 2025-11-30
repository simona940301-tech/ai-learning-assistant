import crypto from 'crypto'

/**
 * Calculate SHA-256 hash of a file buffer
 * Used for deduplication and caching
 */
export function calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
}

/**
 * Telemetry tracker for RAG pipeline
 */
export class RagTelemetry {
    private startTime: number
    private metrics: {
        uploadDurationMs?: number
        textExtractionMs?: number
        chunkingMs?: number
        embeddingMs?: number
        llmPreviewMs?: number
        llmAnalysisMs?: number
        llmPredictionMs?: number
        fileSizeBytes?: number
        extractedChars?: number
        numChunks?: number
        numEmbeddings?: number
        previewTokensIn?: number
        previewTokensOut?: number
        analysisTokensIn?: number
        analysisTokensOut?: number
        predictionTokensIn?: number
        predictionTokensOut?: number
        wasCached?: boolean
        cacheSourceId?: string
        errorStage?: string
        errorMessage?: string
    }

    constructor() {
        this.startTime = Date.now()
        this.metrics = {}
    }

    /**
     * Start timing a specific stage
     */
    startStage(stage: string): () => void {
        const stageStart = Date.now()
        return () => {
            const duration = Date.now() - stageStart
            switch (stage) {
                case 'upload':
                    this.metrics.uploadDurationMs = duration
                    break
                case 'text_extraction':
                    this.metrics.textExtractionMs = duration
                    break
                case 'chunking':
                    this.metrics.chunkingMs = duration
                    break
                case 'embedding':
                    this.metrics.embeddingMs = duration
                    break
                case 'llm_preview':
                    this.metrics.llmPreviewMs = duration
                    break
                case 'llm_analysis':
                    this.metrics.llmAnalysisMs = duration
                    break
                case 'llm_prediction':
                    this.metrics.llmPredictionMs = duration
                    break
            }
        }
    }

    /**
     * Record file metrics
     */
    recordFile(sizeBytes: number, extractedChars: number) {
        this.metrics.fileSizeBytes = sizeBytes
        this.metrics.extractedChars = extractedChars
    }

    /**
     * Record chunking metrics
     */
    recordChunking(numChunks: number) {
        this.metrics.numChunks = numChunks
    }

    /**
     * Record embedding metrics
     */
    recordEmbedding(numEmbeddings: number) {
        this.metrics.numEmbeddings = numEmbeddings
    }

    /**
     * Record LLM token usage
     */
    recordLlmTokens(
        stage: 'preview' | 'analysis' | 'prediction',
        tokensIn: number,
        tokensOut: number
    ) {
        switch (stage) {
            case 'preview':
                this.metrics.previewTokensIn = tokensIn
                this.metrics.previewTokensOut = tokensOut
                break
            case 'analysis':
                this.metrics.analysisTokensIn = tokensIn
                this.metrics.analysisTokensOut = tokensOut
                break
            case 'prediction':
                this.metrics.predictionTokensIn = tokensIn
                this.metrics.predictionTokensOut = tokensOut
                break
        }
    }

    /**
     * Record cache hit
     */
    recordCacheHit(sourceAnalysisId: string) {
        this.metrics.wasCached = true
        this.metrics.cacheSourceId = sourceAnalysisId
    }

    /**
     * Record error
     */
    recordError(stage: string, message: string) {
        this.metrics.errorStage = stage
        this.metrics.errorMessage = message
    }

    /**
     * Get final telemetry data for database insertion
     */
    getMetrics() {
        const totalDuration = Date.now() - this.startTime

        const totalTokens =
            (this.metrics.previewTokensIn || 0) +
            (this.metrics.previewTokensOut || 0) +
            (this.metrics.analysisTokensIn || 0) +
            (this.metrics.analysisTokensOut || 0) +
            (this.metrics.predictionTokensIn || 0) +
            (this.metrics.predictionTokensOut || 0)

        return {
            upload_duration_ms: this.metrics.uploadDurationMs,
            text_extraction_ms: this.metrics.textExtractionMs,
            chunking_ms: this.metrics.chunkingMs,
            embedding_ms: this.metrics.embeddingMs,
            llm_preview_ms: this.metrics.llmPreviewMs,
            llm_analysis_ms: this.metrics.llmAnalysisMs,
            llm_prediction_ms: this.metrics.llmPredictionMs,
            total_duration_ms: totalDuration,
            file_size_bytes: this.metrics.fileSizeBytes,
            extracted_chars: this.metrics.extractedChars,
            num_chunks: this.metrics.numChunks,
            num_embeddings: this.metrics.numEmbeddings,
            preview_tokens_in: this.metrics.previewTokensIn,
            preview_tokens_out: this.metrics.previewTokensOut,
            analysis_tokens_in: this.metrics.analysisTokensIn,
            analysis_tokens_out: this.metrics.analysisTokensOut,
            prediction_tokens_in: this.metrics.predictionTokensIn,
            prediction_tokens_out: this.metrics.predictionTokensOut,
            total_tokens: totalTokens,
            was_cached: this.metrics.wasCached || false,
            cache_source_id: this.metrics.cacheSourceId,
            error_stage: this.metrics.errorStage,
            error_message: this.metrics.errorMessage
        }
    }

    /**
     * Log metrics to console (for development)
     */
    log() {
        const metrics = this.getMetrics()
        console.log('[RAG Telemetry]', {
            totalDuration: `${metrics.total_duration_ms}ms`,
            stages: {
                textExtraction: `${metrics.text_extraction_ms || 0}ms`,
                llmPreview: `${metrics.llm_preview_ms || 0}ms`,
                llmAnalysis: `${metrics.llm_analysis_ms || 0}ms`,
                llmPrediction: `${metrics.llm_prediction_ms || 0}ms`
            },
            resources: {
                fileSize: `${((metrics.file_size_bytes || 0) / 1024).toFixed(1)} KB`,
                extractedChars: metrics.extracted_chars,
                chunks: metrics.num_chunks
            },
            tokens: {
                total: metrics.total_tokens,
                preview: (metrics.preview_tokens_in || 0) + (metrics.preview_tokens_out || 0),
                analysis: (metrics.analysis_tokens_in || 0) + (metrics.analysis_tokens_out || 0),
                prediction: (metrics.prediction_tokens_in || 0) + (metrics.prediction_tokens_out || 0)
            },
            cached: metrics.was_cached
        })
    }
}
