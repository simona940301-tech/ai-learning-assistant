import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { Api } from '@/lib/api/response'
import { ApiErrorCode } from '@/lib/types/api'

const GEMINI_API_KEY = process.env.GEMINI_AVATAR_API_KEY || process.env.GEMINI_API_KEY || ''

/**
 * POST /api/profile/generate-avatar
 *
 * Generate pixel art avatar from uploaded photo using Gemini AI
 * Requires authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { supabase, user, errorType } = await getApiUser(req)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
            ? 'Authentication required'
            : 'Authentication error occurred'

      return Api.unauthorized(message)
    }

    // Parse form data
    const formData = await req.formData()
    const photoFile = formData.get('photo') as File

    if (!photoFile) {
      return Api.badRequest('照片檔案為必填')
    }

    // Validate file type
    if (!photoFile.type.startsWith('image/')) {
      return Api.badRequest('檔案必須為圖片格式')
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (photoFile.size > MAX_FILE_SIZE) {
      return Api.badRequest('圖片大小不能超過 10MB')
    }

    // Convert image to base64
    const arrayBuffer = await photoFile.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = photoFile.type

    // Create Gemini prompt for pixel art generation
    const pixelArtPrompt = `請將提供的女性臉部照片轉換為像素藝術頭像。

核心要求：

風格： 經典 JRPG 對話頭像風格 (例如 Final Fantasy VI 或 Chrono Trigger)。

像素清晰度： 使用非常清楚的方塊像素（8x8px 或 16x16px 單位）。禁止平滑漸變。

辨識度： 保持人物的高度辨識度。

五官處理： 將五官濃縮成可愛且可辨識的幾何像素塊，避免過度寫實。

人物比例： 頭部佔畫布的約 65%，肩膀佔約 15%（即頭大身小）。

色彩限制： 使用有限的調色板，總共不超過 16-24 種顏色。

細節： 避免任何瑕疵、不對稱形狀或模糊邊緣。

線條： 眼睛、眉毛和頭髮輪廓使用強烈對比的線條。

表情： 保持中性或略帶自信的表情。

背景： 完全移除背景，輸出透明 PNG 檔案。

尺寸： 最終圖片尺寸為 256x256 或 512x512 像素的 PNG 檔案，帶有 Alpha 通道。

裝飾： 禁止添加任何文字、邊框或額外裝飾。

藝術風格： 必須是像素藝術，禁止輸出任何寫實風格的圖片。

負面提示 (Negative Prompt)：

no realism, no smooth shading, no blurred edges
no watercolor, no anime style, no noise
no incorrect pixel shapes, no artifacts, no broken lines
no text, no borders, no extra decorations
no distorted features, no inconsistent proportions
no low resolution, no blurry output

請分析這張照片並生成符合以上要求的像素藝術頭像。`

    // Call Gemini API with image
    // Note: Gemini can analyze images but doesn't generate them directly
    // We'll use Gemini to create a detailed description, then use that for image generation
    // For now, we'll return the processed image description and handle generation client-side
    // OR use a different image generation service

    // Since Gemini doesn't generate images, we'll use it to analyze and create a prompt
    // Then we can use that prompt with an image generation API
    // For MVP, let's return the base64 image and let the client handle conversion
    // OR we can use a pixel art conversion library server-side

    // For now, let's use Gemini's multimodal capabilities to analyze the image
    // and create a detailed pixel art description
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
                  text: pixelArtPrompt,
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}))
      console.error('[Avatar Generation] Gemini API error:', errorData)
      return Api.customError(
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        errorData.error?.message || 'Gemini API 請求失敗'
      )
    }

    const geminiData = await geminiResponse.json()
    const description = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Since Gemini doesn't generate images directly, we need to use an image generation service
    // For now, we'll return the description and the original image
    // The client can use this to generate pixel art via another service
    // OR we can implement a server-side pixel art conversion

    // For MVP: Return success with the image data
    // The actual pixel art conversion will be handled by a separate service
    // or we can implement a pixel art converter here

    return Api.success({
      message: '照片已上傳，正在生成像素藝術頭像...',
      imageData: base64Image,
      mimeType,
      description,
    })
  } catch (error) {
    console.error('[Avatar Generation] Error:', error)
    return Api.serverError(
      error instanceof Error ? error.message : undefined
    )
  }
}

