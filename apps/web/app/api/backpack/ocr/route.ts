import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

interface OCRBoundingBox {
  x: number
  y: number
  width: number
  height: number
  text: string
  confidence?: number
}

interface OCRResult {
  text: string
  bboxes: OCRBoundingBox[]
}

/**
 * Process PDF page image with GPT-4o Vision API for OCR
 * Returns structured text with bounding boxes
 */
async function processPageWithOCR(
  imageBuffer: ArrayBuffer,
  mimeType: string
): Promise<OCRResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  // Convert image to base64
  const base64Image = btoa(
    String.fromCharCode(...new Uint8Array(imageBuffer))
  )
  const dataUrl = `data:${mimeType};base64,${base64Image}`

  // Call GPT-4o Vision API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an OCR expert. Extract all text from the image and return a JSON object with:
{
  "text": "full text content",
  "bboxes": [
    {
      "x": 0-1 normalized x position,
      "y": 0-1 normalized y position,
      "width": 0-1 normalized width,
      "height": 0-1 normalized height,
      "text": "text content",
      "confidence": 0-1
    }
  ]
}
All coordinates must be normalized (0-1) relative to image dimensions.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
                detail: 'high', // High detail for accurate OCR
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1, // Low temperature for consistent OCR
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content returned from OpenAI API')
  }

  // Parse JSON response (may be wrapped in markdown code blocks)
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/```$/, '')
  }

  try {
    const result = JSON.parse(jsonStr) as OCRResult
    return result
  } catch (e) {
    // Fallback: extract text only if JSON parsing fails
    return {
      text: content,
      bboxes: [],
    }
  }
}

/**
 * POST /api/backpack/ocr
 * Process a PDF page image with OCR
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const fileId = formData.get('file_id') as string
    const pageNumber = parseInt(formData.get('page_number') as string, 10)
    const imageFile = formData.get('image') as File

    if (!fileId || !pageNumber || !imageFile) {
      return NextResponse.json(
        { error: 'Missing required fields: file_id, page_number, image' },
        { status: 400 }
      )
    }

    // Verify file ownership
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('id, user_id')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Process image with OCR
    const imageBuffer = await imageFile.arrayBuffer()
    const ocrResult = await processPageWithOCR(imageBuffer, imageFile.type)

    // Save OCR result to file_pages table
    const { data: pageData, error: saveError } = await supabase
      .from('file_pages')
      .upsert({
        file_id: fileId,
        page_no: pageNumber,
        text: ocrResult.text,
        bbox_json: ocrResult.bboxes,
      }, {
        onConflict: 'file_id,page_no',
      })
      .select()
      .single()

    if (saveError) {
      console.error('[OCR] Failed to save OCR result:', saveError)
      return NextResponse.json(
        { error: 'Failed to save OCR result', details: saveError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      page: pageData,
      text: ocrResult.text,
      bboxes: ocrResult.bboxes,
    })
  } catch (error) {
    console.error('[OCR] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

