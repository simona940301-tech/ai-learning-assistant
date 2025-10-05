import { NextRequest, NextResponse } from 'next/server'
import { AttachedFile } from '@/lib/types'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

interface ExplainRequest {
  prompt: string
  attachments: AttachedFile[]
  selected: string
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, attachments, selected }: ExplainRequest = await request.json()

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const attachmentInfo = attachments.map((file, index) =>
      `[A${index + 1}] ${file.name}${file.content ? `\n內容：${file.content.substring(0, 1200)}` : ''}`
    ).join('\n\n')

    const promptText = `You are an English exam tutor. Evaluate whether the selected test point is correct given the question. If correct: output a concise explanation block per the following sections (each ≤ 8 lines, bullets ≤ 60 chars, mature tone):\n- title: \"Preposition + Relative Pronoun (whom)\" or exact test point name\n- patternFormula (English)\n- keyPoint (1–2 lines)\n- examples (2 bullets, bilingual acceptable)\n- commonMistakes (1–2 bullets)\n- relatedPastExams (2 bullets)\nIf incorrect: output a coaching message explaining the miscue and hint toward the correct focus (Munger principle).\n\nReturn JSON:\n{\n  \"correct\": boolean,\n  \"feedback\": string, // coaching if incorrect, short confirmation if correct\n  \"block\": {\n    \"title\": string,\n    \"patternFormula\": string,\n    \"keyPoint\": string,\n    \"examples\": string[],\n    \"commonMistakes\": string[],\n    \"relatedPastExams\": string[]\n  }\n}\n\nQuestion:\n${prompt}\n\nSelected test point: ${selected}\n\n${attachmentInfo ? `Attachments:\n${attachmentInfo}\n` : ''}`

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
    try { parsed = JSON.parse(text) } catch { parsed = { correct: false, feedback: text } }

    // Normalize arrays
    const block = parsed.block || {}
    return NextResponse.json({
      correct: !!parsed.correct,
      feedback: parsed.feedback || '',
      block: {
        title: block.title || selected,
        patternFormula: block.patternFormula || '',
        keyPoint: block.keyPoint || '',
        examples: Array.isArray(block.examples) ? block.examples.slice(0, 5) : [],
        commonMistakes: Array.isArray(block.commonMistakes) ? block.commonMistakes.slice(0, 4) : [],
        relatedPastExams: Array.isArray(block.relatedPastExams) ? block.relatedPastExams.slice(0, 4) : [],
      },
    })
  } catch (error) {
    console.error('Tutor Explain Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}

