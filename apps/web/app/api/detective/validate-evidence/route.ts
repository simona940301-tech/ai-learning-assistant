
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { generateEmbedding } from '@/lib/services/elite-rag-analyzer'

/**
 * Three-Tier Evidence Validation System
 * 
 * Architecture:
 * Layer 1: Exact Match (Fastest, 100% precision)
 * Layer 2: Semantic Similarity (Fast, ~95% precision)
 * Layer 3: AI Reasoning (Slowest, Context-aware)
 */

interface ValidationRequest {
    question: string
    userHighlight: string
    passage: string
    standardEvidence: string[]
}

interface EvidenceValidationResult {
    isValid: boolean
    validationType: 'exact' | 'semantic' | 'ai_reasoning' | 'invalid'
    confidence: number
    feedback: string
    suggestedEvidence?: string
}

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ============================================
// Layer 1: Exact Match Helper
// ============================================
function normalizeText(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[，。！？；：]/g, match => {
            const map: Record<string, string> = {
                '，': ',', '。': '.', '！': '!',
                '？': '?', '；': ';', '：': ':'
            }
            return map[match] || match
        })
}

// ============================================
// Layer 2: Semantic Helpers
// ============================================
function cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
}

// ============================================
// Layer 3: AI Reasoning Helper
// ============================================
async function aiReasoningValidation(
    question: string,
    userHighlight: string,
    passage: string
): Promise<{ isRelevant: boolean; reasoning: string; confidence: number; suggestedEvidence?: string }> {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.2, // Low temperature for consistency
                responseMimeType: "application/json"
            }
        })

        const prompt = `你是閱讀理解專家。請判斷用戶高亮的證據是否能回答問題。

## 問題
${question}

## 用戶高亮的證據
"${userHighlight}"

## 完整文章
${passage}

## 判斷標準
1. 證據必須**直接相關**於問題
2. 證據必須包含**關鍵信息**來支持答案
3. 不要接受**無關**或**過於籠統**的證據

請以純 JSON 格式回覆，包含以下欄位：
- isRelevant: boolean
- reasoning: string (為什麼這個證據相關/不相關？)
- confidence: number (0.0-1.0)
- suggestedEvidence: string (如果不相關，建議高亮文章中的哪段文字？)
`

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        const parsed = JSON.parse(responseText)

        return {
            isRelevant: parsed.isRelevant,
            reasoning: parsed.reasoning,
            confidence: parsed.confidence,
            suggestedEvidence: parsed.suggestedEvidence
        }
    } catch (error) {
        console.error('[AI Reasoning] Validation failed:', error)
        // Fallback to avoid blocking user
        return {
            isRelevant: false,
            reasoning: '無法驗證證據關聯性',
            confidence: 0
        }
    }
}

export async function POST(req: NextRequest) {
    try {
        const body: ValidationRequest = await req.json()
        const { question, userHighlight, passage, standardEvidence } = body

        if (!userHighlight || !standardEvidence || standardEvidence.length === 0) {
            return NextResponse.json({
                isValid: false,
                validationType: 'invalid',
                confidence: 0,
                feedback: '無效的請求參數'
            } as EvidenceValidationResult)
        }

        // ============================================
        // Layer 1: Exact Match (Fastest)
        // ============================================
        const normalizedHighlight = normalizeText(userHighlight)
        const isExactMatch = standardEvidence.some(ev =>
            normalizeText(ev).includes(normalizedHighlight) ||
            normalizedHighlight.includes(normalizeText(ev))
        )

        if (isExactMatch) {
            return NextResponse.json({
                isValid: true,
                validationType: 'exact',
                confidence: 1.0,
                feedback: '✅ 完美！這正是關鍵證據。'
            } as EvidenceValidationResult)
        }

        // ============================================
        // Layer 2: Semantic Similarity (Fast)
        // ============================================
        try {
            const userEmbedding = await generateEmbedding(userHighlight)

            let maxSimilarity = 0
            let matchedEvidence = null

            // Check against all standard evidence
            for (const ev of standardEvidence) {
                const evEmbedding = await generateEmbedding(ev)
                const similarity = cosineSimilarity(userEmbedding, evEmbedding)

                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity
                    matchedEvidence = ev
                }
            }

            // Threshold 0.90 for high confidence semantic match
            if (maxSimilarity >= 0.90) {
                return NextResponse.json({
                    isValid: true,
                    validationType: 'semantic',
                    confidence: maxSimilarity,
                    feedback: `✅ 很好！這段證據與標準答案語義相近 (${(maxSimilarity * 100).toFixed(0)}% 相似度)。`
                } as EvidenceValidationResult)
            }
        } catch (error) {
            console.warn('[Validation] Semantic layer failed, falling back to AI:', error)
            // Continue to Layer 3
        }

        // ============================================
        // Layer 3: AI Reasoning (Most Robust)
        // ============================================
        const aiResult = await aiReasoningValidation(question, userHighlight, passage)

        if (aiResult.isRelevant && aiResult.confidence >= 0.75) {
            return NextResponse.json({
                isValid: true,
                validationType: 'ai_reasoning',
                confidence: aiResult.confidence,
                feedback: `✅ ${aiResult.reasoning}`
            } as EvidenceValidationResult)
        }

        // ============================================
        // Validation Failed
        // ============================================
        return NextResponse.json({
            isValid: false,
            validationType: 'invalid',
            confidence: aiResult?.confidence || 0,
            feedback: aiResult?.reasoning || '證據關聯性不足',
            suggestedEvidence: aiResult?.suggestedEvidence
        } as EvidenceValidationResult)

    } catch (error) {
        console.error('[Evidence Validation] API Error:', error)
        return NextResponse.json({
            error: 'Internal Server Error'
        }, { status: 500 })
    }
}
