/**
 * Elite RAG Analyzer
 * 
 * World-class document analysis with 3-layer progressive enhancement:
 * - Layer 1: Quick Preview (3s target)
 * - Layer 2: Deep Analysis (15s target) - NotebookLM style
 * - Layer 3: Exam Prediction (30s target)
 * 
 * ⚡ Performance Optimizations:
 * - Smart text chunking (preserves structure)
 * - Parallel LLM execution
 * - Streaming output support
 * 
 * 🆕 Phase 5: Router Pattern Integration
 * - Multi-document context support
 * - Model routing via model-config
 * - Structured streaming with Vercel AI SDK
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { streamObject } from 'ai'
import { smartChunk, extractPreviewText } from '@/lib/utils/smart-chunk'
import { getModelParams } from '@/lib/config/model-config'
import { GSATAnalysisSchema } from '@/lib/schemas/gsat-analysis-schema'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
})

// ============================================
// GSAT Analysis Schema (Phase 4)
// ============================================

// ============================================
// NEW: Structured Streaming Analysis (Phase 5)
// ============================================

/**
 * Generate structured streaming analysis using Vercel AI SDK
 * 
 * Features:
 * - Supports multi-document context (primary + related)
 * - Uses model-config for centralized model selection
 * - Streams structured output based on GSATAnalysisSchema
 * - Optimized prompt (25% token reduction)
 * 
 * @param fullDocumentContext - Combined text from primary + related documents
 * @param subject - Optional subject hint from classification
 * @returns Streaming response with structured analysis
 */
export async function generateStreamedAnalysis(
    fullDocumentContext: string,
    subject?: string
) {
    console.log('[StreamAnalysis] 🚀 Starting structured analysis...')
    console.log('[StreamAnalysis] Context length:', fullDocumentContext.length, 'chars')
    if (subject) {
        console.log('[StreamAnalysis] Subject hint:', subject)
    }

    // Use smart chunking to avoid context limits
    const contextText = fullDocumentContext.substring(0, 100000)

    // Get model configuration from centralized config
    const modelParams = getModelParams('analysis-simple')

    // ⚡ OPTIMIZED PROMPT (25% token reduction)
    const systemPrompt = `台灣學測 (GSAT) 分析專家。生成學術級報告。

## RULES
Target: 學測標準，高中程度
Curriculum: 標註課綱代碼 (curriculumCode)
Format: 數A-11-1、物理(全)-Ch3、歷史(一)-Ch2
Language: 繁體中文（英文科除外）
Required: ≥1 QuestionSet（題組）

## OUTPUT

### 1. Subject & Topics
科目：國文/英文/數學A/數學B/物理/化學/生物/地科/歷史/地理/公民
單元：列出章節

### 2. Summary (Markdown)
# 核心摘要
- 主題重點（3-5點，≤40字/點）
- 專有名詞解釋

禁止：開場白、結尾語

### 3. Key Concepts
- concept: 知識點
- explanation: 定義
- importance: 高/中/低（考頻）
- curriculumCode: 課綱代碼（選填）

### 4. Exam Prediction
規則：
- 必含≥1 QuestionSet
- QuestionSet結構：
  * type: "question_set"
  * context: 情境引文（200-400字）
  * questions: 2-3子題
- 單題結構：
  * questionType: 單選/多選/填充/簡答/作圖/混合題
  * question, options, answer, analysis
  * difficulty: Easy/Medium/Hard
  * curriculumCode（選填）

品質：
- 避免死記題
- 情境素養題優先
- 詳解含邏輯，非僅答案

## EXAMPLE
{
  "type": "question_set",
  "context": "2023聯合國氣候報告指出，全球均溫已升1.1°C...",
  "questions": [{
    "questionType": "單選",
    "question": "根據上文，主因為何？",
    "options": ["A.太陽活動","B.溫室氣體","C.火山","D.洋流"],
    "answer": "B",
    "analysis": "文中明確提到溫室氣體排放...",
    "difficulty": "Easy"
  }]
}`

    const prompt = `${systemPrompt}

## CONTENT
${contextText}`

    try {
        console.log('[StreamAnalysis] 🎯 Model config:', {
            model: modelParams.model,
            temperature: modelParams.temperature,
            maxTokens: modelParams.maxTokens
        })

        // Use streamObject for structured streaming
        const result = await streamObject({
            model: google(modelParams.model),
            temperature: modelParams.temperature,
            schema: GSATAnalysisSchema,
            prompt: prompt,
        })

        console.log('[StreamAnalysis] ✅ Streaming started')

        // Return AI stream response
        const response = result.toTextStreamResponse()
        console.log('[StreamAnalysis] 📤 Response headers:', Object.fromEntries(response.headers.entries()))
        
        return response

    } catch (error) {
        console.error('[StreamAnalysis] ❌ Error:', error)

        // Return error response
        return new Response(
            JSON.stringify({
                error: 'ANALYSIS_ERROR',
                message: '分析失敗，請稍後再試',
                debug: error instanceof Error ? error.message : String(error)
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
}

// ============================================
// Type Definitions (Legacy)
// ============================================

export interface QuickPreview {
    summary: string
    subject: 'chinese' | 'english' | 'math' | 'science' | 'social' | 'other'
    topics: string[]
}

export interface CoreConcept {
    name: string
    explanation: string
    importance: number // 1-5
    pageRefs: number[]
}

export interface KeyInsight {
    insight: string
    evidence: string
    pageRefs: number[]
}

export interface SuggestedQuestion {
    question: string
    difficulty: number // 1-5
    topic: string
}

export interface DeepAnalysis {
    concepts: CoreConcept[]
    insights: KeyInsight[]
    questions: SuggestedQuestion[]
    markdown: string
}

export interface ExamQuestion {
    questionText: string
    questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'calculation'
    options?: { label: string; text: string; isCorrect: boolean }[]
    correctAnswer: string
    explanation: string
    difficulty: number // 1-5
    topicTags: string[]
    sourcePages: number[]
    confidenceScore: number
}

export interface ExamPrediction {
    questions: ExamQuestion[]
    weakPoints: { concept: string; reason: string; practiceSuggestion: string }[]
    roadmap: { phase: string; topics: string[]; estimatedHours: number }[]
}

// ============================================
// Layer 1: Quick Preview (3s target)
// ============================================

export async function generateQuickPreview(text: string): Promise<QuickPreview> {
    const startTime = Date.now()
    console.log('[QuickPreview] 🚀 Starting Layer 1 analysis...')
    console.log(`[QuickPreview] Input text length: ${text.length} characters`)

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.3,  // Lower temperature for faster, more consistent output
                maxOutputTokens: 200,  // Limit output to speed up generation
            }
        })

        // ⚡ Use even smaller preview for faster processing
        const previewText = extractPreviewText(text, 800)  // Reduced from 1500 to 800
        console.log(`[QuickPreview] Using smart preview: ${previewText.length} chars`)

        // ⚡ Simplified prompt for faster processing
        const prompt = `快速分析這份文件。僅輸出 JSON（無額外文字）：
{"summary":"一句話摘要","subject":"chinese/english/math/science/social/other","topics":["主題1","主題2","主題3"]}

文件：
${previewText}`

        console.log('[QuickPreview] 📡 Calling Gemini API...')
        const result = await model.generateContent(prompt)
        const responseText = result.response.text().trim()
        console.log(`[QuickPreview] 📥 Received response in ${Date.now() - startTime}ms`)

        // Remove markdown code blocks if present
        const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        try {
            const parsed = JSON.parse(jsonText)
            const duration = Date.now() - startTime
            console.log(`[QuickPreview] ✅ Success in ${duration}ms`)

            return {
                summary: parsed.summary || '無法生成摘要',
                subject: parsed.subject || 'other',
                topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5) : []
            }
        } catch (parseError) {
            console.error('[QuickPreview] ❌ JSON parse error:', {
                error: parseError instanceof Error ? parseError.message : String(parseError),
                responseText: responseText.substring(0, 300)
            })

            // Return fallback data
            return {
                summary: '文件分析中...',
                subject: 'other',
                topics: []
            }
        }
    } catch (error) {
        const duration = Date.now() - startTime
        console.error('[QuickPreview] ❌ API error:', {
            duration: `${duration}ms`,
            message: error instanceof Error ? error.message : String(error)
        })

        // Return fallback data
        return {
            summary: '分析失敗，請稍後再試',
            subject: 'other',
            topics: []
        }
    }
}

// ============================================
// Layer 2: Deep Analysis (15s target)
// ============================================

export async function generateDeepAnalysis(
    text: string,
    preview: QuickPreview | null
): Promise<DeepAnalysis> {
    const startTime = Date.now()
    console.log('[DeepAnalysis] 🚀 Starting Layer 2 analysis...')
    console.log(`[DeepAnalysis] Input text length: ${text.length} characters`)
    if (preview) {
        console.log(`[DeepAnalysis] Preview context:`, { subject: preview.subject, topics: preview.topics })
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.5,
                // maxOutputTokens removed to prevent truncation
            }
        })

        // ⚡ Use smart chunking with reduced size for faster processing
        // ⚡ Use smart chunking with reduced size for faster processing
        const MAX_ANALYSIS_LENGTH = 50000  // Increased to 50k for Gemini 2.0 Flash (1M context)
        const textToAnalyze = smartChunk(text, MAX_ANALYSIS_LENGTH)

        console.log(`[DeepAnalysis] Using smart chunk: ${textToAnalyze.length} characters`)

        // ⚡ Ultra-simplified prompt for reliable JSON generation
        const prompt = `分析文件，輸出 JSON。

科目: ${preview?.subject || 'chinese'}
主題: ${preview?.topics?.slice(0, 3).join('、') || '待分析'}

請嚴格遵循以下 Markdown 格式要求，並將生成的 Markdown 內容放入 JSON 的 "markdown" 欄位：

# 🟫 重點統整

## 核心概念
- 使用 bullet point 列出主要概念（每點不超過兩行）

## 定義
- 以「**定義：**」開頭，保持一行（必要時不超過兩行）

## 重點整理
- 必須依照本文分類方式整理
- 每點使用 bullet point
- 不可擅自添加無關資訊

## 學習建議
- 2–4 點
- 使用 bullet point

⚠️ 所有輸出必須：
- 僅使用 Markdown
- 段落之間空一行
- 禁止加入額外評論
- 禁止回應使用者提示本身

輸出純 JSON（不要加markdown代碼標記）：
{"concepts":[{"name":"概念1","explanation":"說明","importance":4,"pageRefs":[1]}],"insights":[{"insight":"洞察","evidence":"證據","pageRefs":[1]}],"questions":[{"question":"問題","difficulty":3,"topic":"主題"}],"markdown":"(此處填入符合上述要求的 Markdown 內容)"}

文件內容：
${textToAnalyze}`

        console.log('[DeepAnalysis] 📡 Calling Gemini API...')
        const result = await model.generateContent(prompt)
        const responseText = result.response.text().trim()
        console.log(`[DeepAnalysis] 📥 Received response (${responseText.length} chars)`)

        // ⚡ Advanced JSON cleaning
        let jsonText = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/^[^{]*/g, '')  // Remove text before first {
            .replace(/[^}]*$/g, '')  // Remove text after last }
            .trim()

        try {
            const parsed = JSON.parse(jsonText)
            const duration = Date.now() - startTime
            console.log(`[DeepAnalysis] ✅ Success in ${duration}ms`)

            return {
                concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
                insights: Array.isArray(parsed.insights) ? parsed.insights : [],
                questions: Array.isArray(parsed.questions) ? parsed.questions : [],
                markdown: parsed.markdown || '## 分析結果\n\n內容正在生成中...'
            }
        } catch (parseError) {
            console.error('[DeepAnalysis] ❌ JSON parse error:', {
                error: parseError instanceof Error ? parseError.message : String(parseError),
                firstChars: jsonText.substring(0, 200),
                lastChars: jsonText.substring(jsonText.length - 200)
            })

            // ⚡ Fallback: Use the raw text if it looks like markdown
            // This handles cases where the model outputs markdown directly instead of JSON
            if (responseText.includes('# 🟫 重點統整')) {
                return {
                    concepts: [],
                    insights: [],
                    questions: [],
                    markdown: responseText
                }
            }

            // ⚡ Fallback: Generate basic markdown from raw response
            const fallbackMarkdown = `## 重點統整\n\n${responseText.substring(0, 1000)}\n\n_註：完整分析因格式問題未能完全載入_`

            return {
                concepts: [],
                insights: [],
                questions: [],
                markdown: fallbackMarkdown
            }
        }
    } catch (error) {
        const duration = Date.now() - startTime
        console.error('[DeepAnalysis] ❌ API error:', {
            duration: `${duration}ms`,
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        })

        return {
            concepts: [],
            insights: [],
            questions: [],
            markdown: '# 分析失敗\n\n請稍後再試。'
        }
    }
}

// ============================================
// Layer 3: Exam Prediction (30s target)
// ============================================

export async function generateExamPredictions(
    text: string,
    analysis: DeepAnalysis | null
): Promise<ExamPrediction> {
    const startTime = Date.now()
    console.log('[ExamPrediction] 🚀 Starting Layer 3 analysis...')
    console.log(`[ExamPrediction] Input text length: ${text.length} characters`)
    if (analysis) {
        console.log(`[ExamPrediction] Analysis context:`, {
            concepts: analysis.concepts.length,
            insights: analysis.insights.length
        })
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        const conceptsSummary = analysis?.concepts.map(c => c.name).join(', ') || '待分析'
        const insightsSummary = analysis?.insights.map(i => i.insight).join('; ') || '待分析'

        const prompt = `你是台灣學測/指考命題委員會的資深專家，擁有 20 年命題經驗。

## 🎯 任務
基於這份學習資料，預測 **最有可能出現在考試中的題目**。

## 📋 命題原則
1. **考點覆蓋**: 每個核心概念至少出 1 題
2. **難度分層**: 
   - 40% 基礎題 (難度 1-2)
   - 40% 中等題 (難度 3)
   - 20% 挑戰題 (難度 4-5)
3. **題型多元**: 選擇題、計算題、申論題
4. **陷阱設計**: 每題至少包含 1 個常見錯誤選項

## 🔍 分析資料
**核心概念**: ${conceptsSummary}
**關鍵洞察**: ${insightsSummary}

文件內容：
文件內容：
${text.substring(0, 50000)}

## 📝 輸出格式
請生成 **3-5 題** (不要超過 5 題)，涵蓋核心概念。

對於每一題，必須提供完整的選項物件 (options)，格式如下：
- questionText: 完整題目文字
- questionType: "multiple_choice"
- options: [
    {"label": "A", "text": "選項A內容", "isCorrect": false},
    {"label": "B", "text": "選項B內容", "isCorrect": true},
    {"label": "C", "text": "選項C內容", "isCorrect": false},
    {"label": "D", "text": "選項D內容", "isCorrect": false}
  ]
- correctAnswer: "B" (必須對應正確選項的 label)
- explanation: 詳解（為什麼這是答案？常見錯誤是什麼？）
- difficulty: 1-5
- topicTags: ["主題1", "主題2"]
- sourcePages: [1]
- confidenceScore: 0.9

## 🎓 額外分析
1. **弱點預測** (weakPoints): 學生最容易在哪些地方出錯？
   - concept: 概念名稱
   - reason: 為什麼容易錯
   - practiceSuggestion: 練習建議

2. **學習路徑** (roadmap): 建議的複習順序
   - phase: "階段一：基礎概念"
   - topics: ["主題1", "主題2"]
   - estimatedHours: 預估時數

請以 JSON 格式回覆（不要包含 markdown 代碼塊）：
{
  "questions": [...],
  "weakPoints": [...],
  "roadmap": [...]
}`

        console.log('[ExamPrediction] 📡 Calling Gemini API...')
        const result = await model.generateContent(prompt)
        const responseText = result.response.text().trim()
        console.log(`[ExamPrediction] 📥 Received response (${responseText.length} chars)`)
        console.log(`[ExamPrediction] First 300 chars: ${responseText.substring(0, 300)}`)

        const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        try {
            const parsed = JSON.parse(jsonText)
            const duration = Date.now() - startTime
            console.log(`[ExamPrediction] ✅ Success in ${duration}ms`)
            console.log(`[ExamPrediction] Generated:`, {
                questions: parsed.questions?.length || 0,
                weakPoints: parsed.weakPoints?.length || 0,
                roadmap: parsed.roadmap?.length || 0
            })

            return {
                questions: parsed.questions || [],
                weakPoints: parsed.weakPoints || [],
                roadmap: parsed.roadmap || []
            }
        } catch (parseError) {
            console.error('[ExamPrediction] ❌ JSON parse error:', {
                error: parseError instanceof Error ? parseError.message : String(parseError),
                responseText: responseText.substring(0, 500),
                jsonText: jsonText.substring(0, 500)
            })

            return {
                questions: [],
                weakPoints: [],
                roadmap: []
            }
        }
    } catch (error) {
        const duration = Date.now() - startTime
        console.error('[ExamPrediction] ❌ API error:', {
            duration: `${duration}ms`,
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        })

        return {
            questions: [],
            weakPoints: [],
            roadmap: []
        }
    }
}

// ============================================
// PDF Text Extraction with Hybrid Strategy
// ============================================

export async function extractTextFromPDFWithGemini(
    pdfBuffer: Buffer
): Promise<{ text: string; numPages: number }> {
    const startTime = Date.now()
    console.log('[PDF Extract] 🚀 Starting PDF extraction...')
    console.log(`[PDF Extract] Buffer size: ${pdfBuffer.length} bytes`)

    // Validate API key first
    const apiKey = process.env.GEMINI_API_KEY
    console.log('[PDF Extract] 🔑 API Key check:', apiKey ? `Set (${apiKey.substring(0, 10)}...)` : '❌ NOT SET')

    if (!apiKey) {
        console.error('[PDF Extract] ❌ GEMINI_API_KEY is not set in environment variables')
        throw new Error('伺服器配置錯誤：缺少 GEMINI_API_KEY。請聯繫管理員。')
    }

    try {
        // ========================================
        // Strategy 1: Try native text extraction first (FAST)
        // ========================================
        console.log('[PDF Extract] 📄 Trying native text extraction (pdf-parse)...')

        try {
            // Use require for pdf-parse (CommonJS module)
            const pdfParse = require('pdf-parse')

            const pdfData = await pdfParse(pdfBuffer, {
                max: 0 // Parse all pages
            })

            const extractedText = pdfData.text.trim()
            const numPages = pdfData.numpages

            console.log(`[PDF Extract] 📊 Native extraction results:`)
            console.log(`  - Pages: ${numPages}`)
            console.log(`  - Text length: ${extractedText.length} characters`)
            console.log(`  - First 200 chars: ${extractedText.substring(0, 200)}`)

            // Check if we got sufficient text (at least 100 chars)
            if (extractedText.length >= 100) {
                const duration = Date.now() - startTime
                console.log(`[PDF Extract] ✅ Native extraction successful in ${duration}ms`)
                console.log(`[PDF Extract] 🎯 Using native text (fast path)`)

                return {
                    text: extractedText,
                    numPages: numPages
                }
            } else {
                console.log(`[PDF Extract] ⚠️ Insufficient text from native extraction (${extractedText.length} chars)`)
                console.log('[PDF Extract] 🔄 Falling back to Gemini OCR...')
            }
        } catch (nativeError) {
            console.warn('[PDF Extract] ⚠️ Native extraction failed:', {
                error: nativeError instanceof Error ? nativeError.message : String(nativeError)
            })
            console.log('[PDF Extract] 🔄 Falling back to Gemini OCR...')
        }

        // ========================================
        // Strategy 2: Gemini Vision OCR (SLOW but handles scanned PDFs)
        // ========================================
        console.log('[PDF Extract] 🤖 Using Gemini Vision API for OCR...')
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: pdfBuffer.toString('base64')
                }
            },
            {
                text: '請提取此 PDF 中的所有文字內容，保留原始結構和格式。如果是掃描檔，請使用 OCR 辨識。'
            }
        ])

        console.log('[PDF Extract] 📥 Gemini API responded')
        const text = result.response.text().trim()
        console.log(`[PDF Extract] Extracted text length: ${text.length} characters`)
        console.log(`[PDF Extract] First 200 chars: ${text.substring(0, 200)}`)

        // Check if Gemini returned sufficient text
        if (text.length < 50) {
            throw new Error(`Gemini OCR returned insufficient text (${text.length} chars)`)
        }

        // Estimate page count (rough heuristic: ~2000 chars per page)
        const estimatedPages = Math.max(1, Math.ceil(text.length / 2000))

        const duration = Date.now() - startTime
        console.log(`[PDF Extract] ✅ Gemini OCR successful in ${duration}ms`)
        console.log(`[PDF Extract] 🎯 Estimated ${estimatedPages} pages`)

        return {
            text: text,
            numPages: estimatedPages
        }

    } catch (error) {
        const duration = Date.now() - startTime
        console.error('[PDF Extract] ❌ All extraction methods failed:', {
            duration: `${duration}ms`,
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        })

        const errorMessage = error instanceof Error ? error.message : String(error)

        // Provide helpful error messages based on error type
        if (errorMessage.includes('API key') || errorMessage.includes('GEMINI')) {
            throw new Error('伺服器配置錯誤：GEMINI_API_KEY 未正確設置。請聯繫管理員。')
        }

        if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            throw new Error('API 配額已用盡，請稍後再試。')
        }

        // Generic error message
        throw new Error(`無法解析 PDF 文件。請確認文件未加密且包含可讀文字。詳細錯誤：${errorMessage}`)
    }
}

// ============================================
// Image Text Extraction
// ============================================

export async function extractTextFromImageWithGemini(
    imageBuffer: Buffer,
    mimeType: string
): Promise<string> {
    const startTime = Date.now()
    console.log(`[Image Extract] 🚀 Starting Image extraction (${mimeType})...`)

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType,
                    data: imageBuffer.toString('base64')
                }
            },
            {
                text: '請提取此圖片中的所有文字內容，保留原始結構和格式。'
            }
        ])

        const text = result.response.text().trim()
        const duration = Date.now() - startTime
        console.log(`[Image Extract] ✅ Success in ${duration}ms (${text.length} chars)`)

        return text
    } catch (error) {
        console.error('[Image Extract] ❌ Failed:', error)
        throw new Error('圖片文字提取失敗')
    }
}

// ============================================
// Smart Chunking for Long Documents
// ============================================

/**
 * Intelligently split long text into chunks while preserving structure
 */
function intelligentChunk(text: string, maxChunkSize: number = 20000): string[] {
    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/)
    const chunks: string[] = []
    let currentChunk = ''

    for (const para of paragraphs) {
        if (currentChunk.length + para.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim())
            currentChunk = para
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
    }

    return chunks.length > 0 ? chunks : [text]
}

// ============================================
// Ultimate Parallel Analysis (10s target)
// ============================================

export interface UltimateAnalysisResult {
    subject: string
    preview: string      // Quick preview markdown
    summary: string      // Full summary markdown
    questions: string    // Exam questions markdown
    fullMarkdown: string // Combined markdown
}

/**
 * Generate all three layers in parallel with unified Markdown output
 */
export async function generateUltimateAnalysis(
    text: string,
    subject: string = 'chinese'
): Promise<UltimateAnalysisResult> {
    const startTime = Date.now()
    console.log('[Ultimate] 🚀 Starting parallel analysis...')
    console.log(`[Ultimate] Text: ${text.length} chars, Subject: ${subject}`)

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.3,
            }
        })

        // Smart chunking for long documents
        const chunks = intelligentChunk(text, 20000)
        console.log(`[Ultimate] Split into ${chunks.length} chunks`)

        // ⚡ Parallel generation of all three layers
        const [preview, summary, questions] = await Promise.all([
            // Layer 1: Quick Preview (target: 2s)
            (async () => {
                const previewPrompt = `科目：${subject}

快速預覽（80字內），純 Markdown：

## 📋 快速預覽
- **主題**：
- **重點**：
- **難度**：

內容：
${chunks[0].substring(0, 3000)}`

                const result = await model.generateContent(previewPrompt)
                return result.response.text().trim()
            })(),

            // Layer 2: Summary (target: 5s)
            (async () => {
                // Process all chunks in parallel
                const chunkSummaries = await Promise.all(
                    chunks.map(async (chunk, idx) => {
                        const prompt = `請根據我上傳的《國學常識》文件內容，以「臺灣學測（學科能力測驗）」的命題趨勢為篩選標準，分析段落 ${idx + 1}/${chunks.length}。
只保留歷年學測常考、重要的核心觀念與代表性知識點；不重要、過細、或少見獨立命題的內容排除。用 Markdown bullet 條列最精華重點：
- 6-9 條要點，涵蓋定義/結論/關鍵數據或引用/因果/風險
- 每點 ≤ 40 字，無贅詞、無客套開場結尾
- 優先保留可命題的關鍵概念與關聯頁碼/證據
- 禁止使用表格

內容：
${chunk.substring(0, 15000)}`

                        const result = await model.generateContent(prompt)
                        return cleanLLMText(result.response.text())
                    })
                )

                // Merge summaries
                if (chunkSummaries.length === 1) {
                    return formatSummaryMarkdown(chunkSummaries[0])
                }

                const mergePrompt = `請合併以下段落摘要，生成「臺灣學測」命題趨勢下的重點統整，只保留歷年學測常考且重要的核心觀念與代表性知識點，排除細節與少見獨立命題內容。
使用 Markdown（禁止表格），內容充實但不灌水，去除重複與冗語，只輸出 Markdown：

${chunkSummaries.map((s, i) => `### 段落 ${i + 1}\n${s}`).join('\n\n')}

輸出格式：
## 🟫 重點統整

### 核心摘要
- 120-180 字單段落，交代最重要的結論/建議與關鍵數據

### 主題重點
- 3-5 個主題，每個主題 2-4 條 bullet
- 主題標題需粗體；每條 ≤ 40 字，盡量帶數據/證據/頁碼

### 定義與術語
- 3-6 條，格式「**術語：** 單行說明（≤ 35 字）」

### 行動建議
- 2-4 條，可操作、可驗證的建議

禁止任何開場或結尾用語（例如「以下是」、「希望對你有幫助」），只保留上述區塊，勿捏造數據。`

                const result = await model.generateContent(mergePrompt)
                return ensureSummaryMarkdownStructure(cleanLLMText(result.response.text()))
            })(),

            // Layer 3: Questions (target: 5s)
            (async () => {
                // Use first 3 chunks for questions (usually most important)
                const questionText = chunks.slice(0, 3).join('\n\n').substring(0, 30000)

                const prompt = `基於以下內容生成 3-5 題考題（Markdown），直接輸出題目區塊，禁止任何開場、結尾或額外說明文字：

## 🟦 考題預測

### 題目 1
題目內容？

**選項：** A. 選項A | B. 選項B | C. 選項C | D. 選項D

**答案：B**

**詳解**
簡潔說明正確原因，無需前綴「為什麼選」，再用一句帶過其他選項為何不選

---

內容：
${questionText}`

                const result = await model.generateContent(prompt)
                return cleanLLMText(result.response.text())
            })()
        ])

        const duration = Date.now() - startTime
        console.log(`[Ultimate] ✅ All layers complete in ${duration}ms`)

        // Combine into full markdown
        const fullMarkdown = `# 📚 ${getSubjectLabel(subject)}

${preview}

---

${summary}

---

${questions}`

        return {
            subject,
            preview,
            summary,
            questions,
            fullMarkdown
        }
    } catch (error) {
        console.error('[Ultimate] ❌ Error:', error)
        throw error
    }
}

function formatSummaryMarkdown(text: string): string {
    const cleaned = cleanLLMText(text)
    if (cleaned.includes('## 🟫 重點統整')) {
        return cleaned
    }
    return `## 🟫 重點統整\n\n${cleaned}`
}

function getSubjectLabel(subject: string): string {
    const labels: Record<string, string> = {
        chinese: '國文',
        english: '英文',
        math: '數學',
        science: '自然',
        social: '社會',
        other: '綜合'
    }
    return labels[subject] || '綜合'
}

// ============================================
// Markdown Cleaning & Structure Enforcement
// ============================================

function cleanLLMText(text: string): string {
    if (!text) return ''
    // Remove code fences and leading/trailing noise
    const withoutFences = text
        .replace(/```(?:markdown)?/gi, '')
        .replace(/```/g, '')
        .trim()

    const lines = withoutFences.split('\n')
    const preamblePatterns = [
        /^[-*\s>]*好的[，。,！!:：\s]/i,
        /^[-*\s>]*以下(是|為)/i,
        /^[-*\s>]*這是根據/i,
        /^[-*\s>]*根據您提供/i,
        /^[-*\s>]*希望(這些|這個)/i,
    ]

    while (lines.length > 0) {
        const line = lines[0].trim()
        if (!line) {
            lines.shift()
            continue
        }
        const shouldDrop = preamblePatterns.some((pattern) => pattern.test(line))
        if (!shouldDrop) break
        lines.shift()
    }

    return lines.join('\n').trim()
}

function ensureSummaryMarkdownStructure(markdown: string): string {
    let content = markdown || ''

    // Ensure base heading
    if (!content.includes('## 🟫 重點統整')) {
        content = `## 🟫 重點統整\n\n${content}`
    }

    // Ensure key sections exist
    content = ensureSection(content, '### 核心摘要', '- （缺少摘要，請重試生成）')
    content = ensureSection(content, '### 主題重點', '- （缺少主題重點，請重試生成）')
    content = ensureSection(content, '### 定義與術語', '- （缺少定義與術語，請重試生成）')
    content = ensureSection(content, '### 行動建議', '- （缺少行動建議，請重試生成）')

    return content.trim()
}

function ensureSection(markdown: string, heading: string, placeholder: string): string {
    const hasHeading = new RegExp(`^${heading}\\b`, 'm').test(markdown)
    if (hasHeading) return markdown
    return `${markdown}\n\n${heading}\n${placeholder}`
}
