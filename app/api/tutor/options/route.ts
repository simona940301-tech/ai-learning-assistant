import { NextRequest, NextResponse } from 'next/server'
import { AttachedFile } from '@/lib/types'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

interface OptionsRequest {
  prompt: string
  attachments: AttachedFile[]
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, attachments }: OptionsRequest = await request.json()

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const attachmentInfo = attachments.map((file, index) =>
      `[A${index + 1}] ${file.name}${file.content ? `\n內容：${file.content.substring(0, 800)}` : ''}`
    ).join('\n\n')

    const promptText = `You are an English exam tutor. Generate 5 possible test points (2–3 correct, 2–3 plausible distractors). Do not mark correctness. Output only a JSON array string of 5 items.\n\nQuestion:\n${prompt}\n\n${attachmentInfo ? `Attachments:\n${attachmentInfo}\n` : ''}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Gemini request failed')
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    let options: string[]
    try { options = JSON.parse(text) } catch { options = [] }
    if (!Array.isArray(options)) options = []
    options = options.slice(0, 5)
    return NextResponse.json({ options })
  } catch (error) {
    console.error('Tutor Options Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}

