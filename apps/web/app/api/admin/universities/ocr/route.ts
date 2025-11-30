import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/**
 * POST /api/admin/universities/ocr
 * 
 * 使用 OCR 識別截圖中的大學和科系資料
 * 專門用於管理頁面匯入大學科系資料
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // 驗證用戶身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
    }

    // 檢查管理員權限
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '權限不足，僅管理員可訪問此功能' },
        { status: 403 }
      )
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'GEMINI_API_KEY not configured',
        },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type

    // 專門用於識別大學和科系資料的提示詞
    const prompt = `請仔細辨識這張圖片中的大學和科系資料。

如果圖片中包含：
1. 大學列表（例如：國立台灣大學、國立清華大學等）
2. 科系列表（例如：資訊工程學系、電機工程學系等）
3. 大學與科系的對應關係

請以 JSON 格式輸出，格式如下：
{
  "universities": [
    {
      "name": "大學名稱",
      "departments": ["科系1", "科系2", "科系3"]
    }
  ]
}

如果圖片中只有大學名稱列表（沒有科系），請輸出：
{
  "universities": [
    {
      "name": "大學名稱1",
      "departments": []
    },
    {
      "name": "大學名稱2",
      "departments": []
    }
  ]
}

如果圖片中只有科系列表（沒有大學），請輸出：
{
  "universities": [],
  "departments": ["科系1", "科系2", "科系3"]
}

請確保：
- 大學名稱完整且準確
- 科系名稱完整且準確
- 如果無法識別，請返回空陣列
- 只輸出 JSON，不要有其他文字說明`

    // Call Gemini Vision API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[OCR Universities] Gemini API error:', errorData)
      return NextResponse.json(
        {
          success: false,
          error: errorData.error?.message || 'OCR processing failed',
        },
        { status: 500 }
      )
    }

    const data = await response.json()
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!extractedText) {
      return NextResponse.json(
        {
          success: false,
          error: 'No text extracted from image',
        },
        { status: 400 }
      )
    }

    // 嘗試解析 JSON
    let parsedData
    try {
      // 移除可能的 markdown 代碼塊標記
      const cleanedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsedData = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('[OCR Universities] JSON parse error:', parseError)
      // 如果解析失敗，返回原始文字
      return NextResponse.json({
        success: true,
        text: extractedText,
        parsed: null,
        error: '無法解析為 JSON 格式，請手動處理',
      })
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      parsed: parsedData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[OCR Universities] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'OCR processing failed',
      },
      { status: 500 }
    )
  }
}






