import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiUser } from '@/lib/api/auth'
import { chatCompletion } from '@/lib/gemini'

const FollowUpSchema = z.object({
  question: z.string().min(4, 'question is required'),
  followup: z.string().min(1, 'followup is required'),
  context: z
    .object({
      answer: z.string().optional(),
      reason: z.string().optional(),
      summary: z.string().optional(),
      markdown: z.string().optional(),
      focus: z.string().optional(),
      questionSet: z
        .array(
          z.object({
            title: z.string(),
            answer: z.string().optional(),
            reason: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  ragContext: z
    .object({
      summary: z.string().optional(),
      concepts: z.array(z.string()).optional(),
      examQuestions: z.array(z.string()).optional(),
    })
    .optional(),
})

const SYSTEM_PROMPT = `你是一位溫暖、務實的英文科學長姐型 AI 家教。你的任務：
1. 根據題目與現有詳解，針對學生的追問做延伸說明。
2. 用繁體中文回答，可搭配 1-3 個條列點或例句，保持語氣友善又專業。
3. 若學生想要更多練習或舉例，直接給建議或簡單的練習方向，不需要重複整份詳解。
4. 回覆重點在概念澄清、辨識錯誤觀念、提示策略；字數 120-200 字內即可。
5. 使用 Markdown 排版（小標題、條列、粗體關鍵字），避免純文字段落。
6. 如需使用表格，保持 3-5 欄以內、單行文字，確保在手機螢幕可水平卷動閱讀。`

type FollowUpInput = z.infer<typeof FollowUpSchema>

function buildPrompt(payload: FollowUpInput): string {
  const { question, followup, context, ragContext } = payload
  const sections: string[] = [
    `【題目】\n${question.trim()}`,
  ]

  // RAG Context Injection
  if (ragContext) {
    const ragParts = []
    if (ragContext.summary) ragParts.push(`摘要：${ragContext.summary}`)
    if (ragContext.concepts?.length) ragParts.push(`核心概念：${ragContext.concepts.join('、')}`)

    if (ragParts.length > 0) {
      sections.push(`【參考文件重點】\n${ragParts.join('\n')}`)
    }
  }

  if (context?.summary) {
    sections.push(`【原先詳解重點】\n${context.summary}`)
  }

  if (context?.answer || context?.reason) {
    sections.push(
      `【正確答案線索】\n${[context.answer && `答案：${context.answer}`, context.reason && `理由：${context.reason}`]
        .filter(Boolean)
        .join('｜') || ''
      }`
    )
  }

  if (context?.questionSet?.length) {
    const overview = context.questionSet
      .map(
        (item, index) =>
          `第 ${index + 1} 題 ${item.title} → ${item.answer ?? '-'}：${item.reason ?? '依題意判定'}`
      )
      .join('\n')
    sections.push(`【題組摘要】\n${overview}`)
  }

  if (context?.markdown) {
    const trimmed = context.markdown.length > 2000 ? `${context.markdown.slice(0, 2000)}…` : context.markdown
    sections.push(`【詳解原文節選】\n${trimmed}`)
  }

  sections.push(`【學生追問】\n${followup.trim()}`)
  sections.push('【回覆規則】\n1. 先肯定學生思考方向，再針對盲點補充\n2. 視情況提供對照例句或簡易檢核步驟\n3. 結尾點出下一步建議（如：重讀語意線索 / 再練同題型）')

  return sections.filter(Boolean).join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorType } = await getApiUser(req)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
          ? 'Authentication required'
          : 'Authentication error occurred'

      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message,
          errorType,
        },
        { status: 401 }
      )
    }

    const body = await req.json()
    const payload = FollowUpSchema.parse(body)
    const prompt = buildPrompt(payload)

    const reply = await chatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      { model: 'gpt-4o-mini', temperature: 0.3, maxOutputTokens: 500 }
    )

    return NextResponse.json({ reply })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? 'Invalid payload' }, { status: 400 })
    }

    console.error('[followup] error', error)
    return NextResponse.json({ message: 'Failed to generate follow-up response' }, { status: 500 })
  }
}
