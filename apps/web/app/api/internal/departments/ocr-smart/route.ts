import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * 智慧 OCR API - 使用 Gemini Vision 辨識校系標準表格
 *
 * 輸入: 校系標準圖片 (如第三張圖的格式)
 * 輸出: 結構化的 JSON 資料,包含所有科系的檢定標準
 *
 * 🔐 認證: Middleware 已在 /api/internal/* 路徑檢查 x-internal-api-key
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: '請上傳圖片檔案' },
        { status: 400 }
      )
    }

    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: '檔案必須是圖片格式' },
        { status: 400 }
      )
    }

    // 將圖片轉換為 base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mimeType = file.type

    // 使用 Gemini Vision 辨識表格
    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash-exp' })

    const prompt = `
你是一個專業的台灣大學入學考試資料分析專家。請仔細分析這張圖片中的「校系代碼檢定標準表」。

**圖片格式說明:**
- 這是一個表格,包含多個校系(科系)的入學檢定標準
- 每一列代表一個科系
- 欄位包含: 校系代碼、性別要求、校系名稱、招生名額、國文、英文、數學A、數學B、社會、自然、英聽

**檢定標準的格式:**
- 可能是文字: "頂標"、"前標"、"均標"、"後標"、"底標"
- 可能是符號: "--" 表示不要求
- 英聽可能是: "A"、"B"、"C" 或 "--"

**你的任務:**
1. 辨識表格中的**每一列**(每個科系)
2. 提取以下欄位資訊:
   - department_code: 校系代碼 (例如: "004012")
   - department_name: 校系名稱 (例如: "中國文學系")
   - gender_requirement: 性別要求 ("無"、"男"、"女")
   - admission_quota: 招生名額 (數字)
   - requirement_chinese: 國文檢定標準
   - requirement_english: 英文檢定標準
   - requirement_math_a: 數學A檢定標準
   - requirement_math_b: 數學B檢定標準
   - requirement_social: 社會檢定標準
   - requirement_natural: 自然檢定標準
   - requirement_english_listening: 英聽檢定標準

3. 將 "--" 或空白欄位轉換為 null
4. 確保數字欄位(招生名額)是整數

**輸出格式 (純 JSON,不要任何額外文字):**
{
  "university_name": "大學名稱(如果圖片中有,否則為null)",
  "departments": [
    {
      "department_code": "004012",
      "department_name": "中國文學系",
      "gender_requirement": "無",
      "admission_quota": 8,
      "requirement_chinese": "頂標",
      "requirement_english": "均標",
      "requirement_math_a": null,
      "requirement_math_b": null,
      "requirement_social": "前標",
      "requirement_natural": null,
      "requirement_english_listening": null
    }
  ]
}

**重要提醒:**
- 只輸出 JSON,不要任何其他文字或解釋
- 確保 JSON 格式正確,可以直接被程式解析
- 如果某個欄位看不清楚,設為 null
- 仔細檢查每個科系的每個欄位
`

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ])

    const responseText = result.response.text()

    // 解析 JSON 回應
    let parsedData: any
    try {
      // 移除可能的 markdown 代碼塊標記
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      parsedData = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('[OCR Smart] Failed to parse JSON:', responseText)
      return NextResponse.json(
        {
          success: false,
          error: '無法解析 AI 回應,請重試或使用手動輸入',
          rawResponse: responseText,
        },
        { status: 500 }
      )
    }

    // 驗證資料結構
    if (!parsedData.departments || !Array.isArray(parsedData.departments)) {
      return NextResponse.json(
        {
          success: false,
          error: '辨識結果格式不正確',
          rawResponse: responseText,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
      totalDepartments: parsedData.departments.length,
    })
  } catch (error) {
    console.error('[OCR Smart] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'OCR 處理失敗',
      },
      { status: 500 }
    )
  }
}
