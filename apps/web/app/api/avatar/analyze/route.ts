import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { Api } from '@/lib/api/response'
import { ApiErrorCode } from '@/lib/types/api'

const GEMINI_API_KEY = process.env.GEMINI_AVATAR_API_KEY || process.env.GEMINI_API_KEY || ''

/**
 * POST /api/avatar/analyze
 *
 * Use Gemini to analyze a photo and create a pixel art prompt
 * This is the CORRECT way to use Gemini (analysis, not generation)
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { user, errorType } = await getApiUser(req)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入'
          : 'Authentication required'

      return Api.unauthorized(message)
    }

    // Parse request
    const body = await req.json()
    const { image, mimeType, prompt } = body

    if (!image || !mimeType) {
      return Api.badRequest('圖片資料為必填')
    }

    // Call Gemini API for image analysis
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json', // Request JSON response
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}))
      console.error('[Avatar Analyze] Gemini API error:', errorData)
      return Api.customError(
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        errorData.error?.message || 'Gemini 分析失敗'
      )
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'

    // Parse Gemini's JSON response
    let analysis
    try {
      analysis = JSON.parse(responseText)
    } catch (e) {
      console.error('[Avatar Analyze] Failed to parse Gemini response:', responseText)
      // Fallback: Create basic analysis
      analysis = {
        description: '照片分析',
        features: ['人物照片'],
        pixelArtPrompt: 'Create a JRPG-style 64x64 pixel art avatar portrait with clean pixel blocks',
        colorPalette: [
          '#FFE4C4',
          '#8B4513',
          '#2F4F4F',
          '#FF6347',
          '#4682B4',
          '#32CD32',
        ],
      }
    }

    return Api.success({ analysis })
  } catch (error) {
    console.error('[Avatar Analyze] Error:', error)
    return Api.serverError(
      error instanceof Error ? error.message : undefined
    )
  }
}
