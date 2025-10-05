import { NextRequest, NextResponse } from 'next/server'
import { AttachedFile } from '@/lib/types'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

interface SimplifyRequest {
  prompt: string
  attachments: AttachedFile[]
  sourceMode: 'backpack' | 'backpack_academic'
  moreBasic?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, attachments, sourceMode, moreBasic = false }: SimplifyRequest = await request.json()

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const attachmentInfo = attachments.map((file, index) =>
      `[A${index + 1}] ${file.name}${file.content ? `\n內容：${file.content.substring(0, 1200)}` : ''}`
    ).join('\n\n')

    const tone = 'Tone: calm, intelligent, mentor-like. Mature, not childish.'
    const lenRule = 'Each section ≤ 8 lines; bullet sentences ≤ 60 chars.'
    const basicness = moreBasic ? 'Regenerate with even simpler language (ELI10, mature tone), keep structure.' : 'Use ELI10 clarity with mature tone.'

    const promptText = `You are an English test tutor for GSAT/AST/school exams. ${tone}\n${lenRule}\n${basicness}\n\nInput question/passage:\n${prompt}\n\n${attachmentInfo ? `Attachments:\n${attachmentInfo}\n` : ''}\n\nModule 1 — Simplify & Visualize:\n1) One-sentence explanation (plain, mature, natural).\n2) ASCII visualization: sentence breakdown + key grammatical relation + highlighted structure.\n3) Contextual bridge (formal/real-world use).\n4) Detect difficulty level (Beginner/Intermediate/Advanced).\n\nOutput JSON with keys: oneLine, visualization, contextBridge, difficulty.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Gemini request failed')
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    let parsed: any
    try { parsed = JSON.parse(text) } catch { parsed = { oneLine: text, visualization: '', contextBridge: '', difficulty: 'Intermediate' } }

    return NextResponse.json({
      oneLine: parsed.oneLine || '',
      visualization: parsed.visualization || '',
      contextBridge: parsed.contextBridge || '',
      difficulty: parsed.difficulty || 'Intermediate',
      sourceMode,
    })
  } catch (error) {
    console.error('Tutor Simplify Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}

