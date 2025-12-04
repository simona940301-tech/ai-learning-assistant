import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getApiUser } from '@/lib/api/auth'
import { Api } from '@/lib/api/response'

/**
 * OCR API - Extract text from images using Gemini 2.5 Flash Vision
 * 
 * POST /api/ai/ocr
 * 
 * Request body:
 * - image: base64-encoded image data (with data URL prefix)
 * 
 * Response:
 * - text: extracted text from image
 * - confidence: confidence score (0-1)
 */

interface OcrRequestBody {
    image: string // base64 data URL (e.g., "data:image/jpeg;base64,...")
}

interface OcrResponseBody {
    text: string
    confidence: number
}

export async function POST(request: NextRequest) {
    try {
        const { user, errorType } = await getApiUser(request)

        if (!user) {
            const message =
                errorType === 'invalid-jwt'
                    ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
                    : errorType === 'unauthenticated'
                        ? 'Authentication required'
                        : 'Authentication error occurred'

            return Api.unauthorized(message)
        }

        const body: OcrRequestBody = await request.json()

        if (!body.image) {
            return Api.badRequest('image is required')
        }

        // Validate base64 data URL format
        if (!body.image.startsWith('data:image/')) {
            return Api.badRequest('image must be a valid base64 data URL (e.g., data:image/jpeg;base64,...)')
        }

        // Extract MIME type and base64 data
        const matches = body.image.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/)
        if (!matches) {
            return Api.badRequest('Invalid image format')
        }

        const [, mimeType, base64Data] = matches
        const supportedTypes = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'heic', 'heif']

        if (!supportedTypes.includes(mimeType.toLowerCase())) {
            return Api.badRequest(`Unsupported image type: ${mimeType}. Supported types: ${supportedTypes.join(', ')}`)
        }

        // Initialize Gemini client
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            console.error('[OCR API] GEMINI_API_KEY not configured')
            return Api.serverError('OCR service not configured')
        }

        const genAI = new GoogleGenerativeAI(apiKey)

        // Use Gemini 2.0 Flash Exp for reliable OCR (2.5 Flash may not be fully available yet)
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
        })

        // Optimized prompt for academic question OCR (支援多題目識別)
        const prompt = `請精確辨識這張圖片中的所有文字內容。

**重要指示：**
1. 保留原始格式和排版（包括換行、縮排）
2. 如果是選擇題，請保留選項格式（例如 (A)、(B)、(C)、(D)）
3. 如果有數學公式或特殊符號，請盡可能準確轉錄
4. **重要**：如果圖片包含多個題目，請：
   - 保留每個題目的題號（無論是「1.」、「1)」、「(1)」、「題1」等任何格式）
   - 在題目之間保留空行以便區分
   - 確保每個題目的完整內容（題幹、選項、子題）都被識別
5. 不要添加任何解釋或註解，只輸出圖片中的文字

請直接輸出辨識結果：`

        console.log('[OCR API] Starting OCR with Gemini 2.0 Flash Vision', {
            imageSize: base64Data.length,
            mimeType: `image/${mimeType}`,
        })
        const startTime = Date.now()

        // Generate content with vision
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: `image/${mimeType}`,
                    data: base64Data,
                },
            },
        ])

        const response = result.response

        // Check for safety blocks or other issues
        const candidate = response.candidates?.[0]
        if (candidate) {
            console.log('[OCR API] Response candidate:', {
                finishReason: candidate.finishReason,
                safetyRatings: candidate.safetyRatings?.map(r => ({
                    category: r.category,
                    probability: r.probability
                })),
                hasContent: !!candidate.content,
                partsCount: candidate.content?.parts?.length || 0,
            })

            // Handle safety blocks
            if (candidate.finishReason === 'SAFETY') {
                return Api.badRequest('圖片內容被安全過濾器阻擋，請上傳其他圖片')
            }
            if (candidate.finishReason === 'RECITATION') {
                return Api.badRequest('圖片內容涉及版權問題，請上傳其他圖片')
            }
            if (candidate.finishReason === 'MAX_TOKENS') {
                return Api.badRequest('圖片文字內容過長，請上傳較小的圖片')
            }
        }

        let text = ''
        try {
            text = response.text()
            console.log('[OCR API] Extracted text via response.text():', {
                length: text.length,
                preview: text.substring(0, 100),
            })
        } catch (e) {
            console.error('[OCR API] Failed to extract text from response:', e)
            // Try to get text from parts
            if (candidate?.content?.parts) {
                const parts = candidate.content.parts
                console.log('[OCR API] Trying to extract from parts:', {
                    partsCount: parts.length,
                    partTypes: parts.map(p => typeof p.text),
                })
                text = parts.map(p => p.text || '').join('').trim()
                console.log('[OCR API] Extracted text from parts:', {
                    length: text.length,
                    preview: text.substring(0, 100),
                })
            }
        }

        const duration = Date.now() - startTime
        console.log('[OCR API] OCR completed', {
            duration: `${duration}ms`,
            textLength: text.length,
            userId: user.id,
            isEmpty: !text || text.trim().length === 0,
        })

        if (!text || text.trim().length === 0) {
            console.error('[OCR API] Empty text result', {
                hasResponse: !!response,
                hasCandidate: !!candidate,
                finishReason: candidate?.finishReason,
                contentParts: candidate?.content?.parts?.length || 0,
            })
            return Api.badRequest('無法從圖片中提取文字，請確保圖片清晰且包含文字內容')
        }

        // Calculate confidence based on response quality
        // Higher confidence if text is longer and well-structured
        const confidence = Math.min(0.95, 0.7 + (Math.min(text.length, 500) / 1000))

        const responseBody: OcrResponseBody = {
            text: text.trim(),
            confidence,
        }

        return Api.success(responseBody)
    } catch (error) {
        console.error('[OCR API] Error:', error)

        // Log detailed error information for debugging
        if (error instanceof Error) {
            console.error('[OCR API] Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 3).join('\n'),
            })
        }

        // Handle specific error types
        if (error instanceof Error) {
            // Gemini API errors
            if (error.message.includes('API key') || error.message.includes('API_KEY')) {
                return Api.serverError('OCR service configuration error')
            }
            if (error.message.includes('quota') || error.message.includes('QUOTA')) {
                return Api.serverError('OCR service quota exceeded, please try again later')
            }
            if (error.message.includes('SAFETY') || error.message.includes('blocked')) {
                return Api.badRequest('圖片內容被安全過濾器阻擋，請上傳其他圖片')
            }
            if (error.message.includes('RECITATION')) {
                return Api.badRequest('圖片內容涉及版權問題，請上傳其他圖片')
            }

            // Return the actual error message for debugging
            return Api.serverError(`OCR processing failed: ${error.message}`)
        }

        return Api.serverError('OCR processing failed')
    }
}
