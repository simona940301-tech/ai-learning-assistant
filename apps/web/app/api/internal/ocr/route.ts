import { NextRequest, NextResponse } from 'next/server';
import { withInternalAuth, unauthorizedResponse } from '@/lib/auth-middleware';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * POST /api/internal/ocr
 * 
 * Extract text from image using Gemini Vision API
 * For admin use only - importing questions from photos
 */
export async function POST(req: NextRequest) {
  const authResult = await withInternalAuth(req);
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error || 'Unauthorized');
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error: 'GEMINI_API_KEY not configured',
      },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type;

    // Call Gemini Vision API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, // ⚡ Use 2.5 Flash for OCR
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
                  text: '請仔細辨識這張圖片中的題目內容，包括題幹、選項（A、B、C、D）和答案。請以清晰的格式輸出，保留所有文字內容。如果是數學題目，請保留所有公式和符號。',
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
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[OCR] Gemini API error:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.error?.message || 'OCR processing failed',
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!extractedText) {
      return NextResponse.json(
        {
          success: false,
          error: 'No text extracted from image',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[OCR] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'OCR processing failed',
      },
      { status: 500 }
    );
  }
}


