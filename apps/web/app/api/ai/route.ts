import { NextRequest, NextResponse } from 'next/server'
import { TaskType, SolveType, AskResult, Reference, AttachedFile } from '@/lib/types'
import { chatCompletionJSON } from '@/lib/openai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

interface AIRequest {
  type: TaskType
  solveType?: SolveType
  prompt: string
  attachments: AttachedFile[]
  sourceMode: 'backpack' | 'backpack_academic'
  scholarMode?: boolean
}

// 學術白名單
const ACADEMIC_WHITELIST = [
  'arxiv.org', 'aclanthology.org', 'ieeexplore.ieee.org', 
  'dl.acm.org', 'pubmed.ncbi.nlm.nih.gov', 'jstor.org'
]

// 生成重點整理提示詞 (WHY → WHAT → HOW → CHECK)
function generateSummaryPrompt(prompt: string, attachments: AttachedFile[], scholarMode: boolean = false): string {
  const attachmentInfo = attachments.map((file, index) =>
    `[A${index + 1}] ${file.name}${file.content ? `\n內容：${file.content.substring(0, 2000)}` : ''}`
  ).join('\n\n')

  return `你是專業學術助教。請嚴格按照以下格式輸出重點整理，使用條列、短句，每節 ≤5 條、每條 ≤60 字。

${attachmentInfo ? `附件內容：\n${attachmentInfo}\n` : ''}
${prompt ? `\n使用者補充：${prompt}\n` : ''}

**輸出格式（WHY → WHAT → HOW → CHECK）：**

## 考點
• [為何重要/考點名稱，2-3 條]

## 核心要素
• [定義/公式/關鍵詞，4-5 條]

## 應用步驟
• [操作步驟，3-5 步]

## 混淆與自檢
• [易錯點，2-3 條]
• 自我檢查：[一句檢核問題]

## 快閃卡
Q: [問題 1]
A: [答案 1]

Q: [問題 2]
A: [答案 2]

Q: [問題 3]
A: [答案 3]

**規則：**
1. 條列化：每條獨立一行，以 • 開頭
2. 短句：每條 ≤60 字，不足寫「待補」
3. 不插入引用代碼：內文不出現 [A1]、[B2] 等符號
4. 學霸補充：${scholarMode ? '在缺口處加入學霸筆記（以徽章/微抽屜/提示塊方式標註），不增加總行數' : '關閉'}
5. 證據：統一在證據抽屜呈現，不在正文顯示`
}

// 生成解題提示詞（通用7步格式）
function generateSolvePrompt(prompt: string, attachments: AttachedFile[], scholarMode: boolean = false, solveType?: SolveType): string {
  const attachmentInfo = attachments.map((file, index) =>
    `[A${index + 1}] ${file.name}${file.content ? `\n內容：${file.content.substring(0, 2000)}` : ''}`
  ).join('\n\n')

  const englishSupplement = solveType?.startsWith('english_') ? `

**英文題補充規則：**
• 單字題：先語境線索，再結論 + 1 組易混詞對
• 文法題：先規則名，再說他項違規點
• 克漏字：每空標【字彙】或【文法】+ 1 行理由
• 閱讀：每題列證據句與推論一句（合計 ≤2 行）` : ''

  return `你是專業解題助教。請嚴格按照以下 7 步通用格式輸出，條列化、短句，每步 2-5 條。

${attachmentInfo ? `附件內容：\n${attachmentInfo}\n` : ''}
${prompt ? `\n題目：${prompt}\n` : ''}

**通用解題格式：**

## 考點
• [章節/規則/公式名稱，2-3 條]

## 題意重述
• [統一符號/單位，1-2 條]

## 關鍵資訊
• [已知條件/限制，2-4 條]

## 解題步驟
• [步驟 1]
• [步驟 2]
• [步驟 3-5]

## 最終答案
• [數值含單位與有效位數 / 英文寫出選項字母 + 詞]

## 檢查清單
• [檢核項 1]
• [檢核項 2-3]${englishSupplement}

**規則：**
1. 條列化：每條以 • 開頭，獨立一行
2. 短句：每條 ≤60 字，不足寫「待補」
3. 不插入引用代碼：內文不出現 [A1]、[B2]
4. 學霸補充：${scholarMode ? '在缺口處加入學霸筆記（徽章/微抽屜/提示塊），不增行數' : '關閉'}
5. 證據：統一在證據抽屜呈現`
}

// 解析 AI 回應並提取引用
function parseAIResponse(content: string, attachments: AttachedFile[]): AskResult {
  const references: Reference[] = []
  const unverified: string[] = []
  
  // 提取引用
  const citationMatches = content.match(/\[A(\d+)\]/g) || []
  citationMatches.forEach(match => {
    const index = parseInt(match.replace('[A', '').replace(']', '')) - 1
    if (attachments[index]) {
      references.push({
        id: match,
        type: 'backpack',
        filename: attachments[index].name,
        page: '1', // 簡化處理
      })
    }
  })

  // 檢查未證實內容
  const unverifiedMatches = content.match(/[^。！？]*（未證實）[。！？]*/g) || []
  unverified.push(...unverifiedMatches)

  return {
    id: Date.now().toString(),
    type: 'summary', // 將由調用者設置
    content,
    references,
    attachments,
    sourceMode: 'backpack',
    unverified,
    created_at: new Date().toISOString(),
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, solveType, prompt, attachments, sourceMode, scholarMode = false }: AIRequest = await request.json()

    if (!prompt.trim() && attachments.length === 0 && !scholarMode) {
      return NextResponse.json(
        { error: '請加入附件或貼上文字，或開啟「學霸補充」' },
        { status: 400 }
      )
    }

    // 生成對應的提示詞
    const systemPrompt = type === 'summary'
      ? generateSummaryPrompt(prompt, attachments, scholarMode)
      : generateSolvePrompt(prompt, attachments, scholarMode, solveType)

    // 添加來源限制
    const sourceRestriction = sourceMode === 'backpack' 
      ? '\n\n重要：只能引用附件內容，不得引用任何網頁或其他來源。'
      : `\n\n重要：只能引用附件內容或以下學術來源：${ACADEMIC_WHITELIST.join(', ')}`

    const finalPrompt = systemPrompt + sourceRestriction

    let aiResponse: string
    try {
      if (GEMINI_API_KEY) {
        aiResponse = await generateWithGemini(finalPrompt)
      } else {
        aiResponse = await generateWithOpenAI(finalPrompt, type)
      }
    } catch (modelError) {
      console.error('AI generation failed, using fallback summary', modelError)
      aiResponse = buildFallbackSummary(prompt, attachments, type)
    }

    // 解析回應
    const result = parseAIResponse(aiResponse, attachments)
    result.type = type
    result.solveType = solveType
    result.sourceMode = sourceMode

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process AI request' },
      { status: 500 }
    )
  }
}

async function generateWithGemini(prompt: string): Promise<string> {
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
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Gemini API request failed: ${errorData.error?.message || 'Unknown error'}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '無法生成回應'
}

async function generateWithOpenAI(prompt: string, type: TaskType): Promise<string> {
  const persona =
    type === 'summary'
      ? 'You are a bilingual study designer who rewrites notes into WHY/WHAT/HOW/CHECK sections plus optional tables or charts.'
      : 'You are a calm exam tutor who explains problems step-by-step with clear checkpoints.'

  const result = await chatCompletionJSON<{ content: string }>([
    {
      role: 'system',
      content: `${persona} Always cite evidence using [A1], [A2] tags that match the attachments listed in the prompt.`,
    },
    {
      role: 'user',
      content: `${prompt}\n\nReturn JSON {"content": "<markdown>"}. No prose outside JSON.`,
    },
  ])

  if (!result?.content) {
    throw new Error('OpenAI returned empty content')
  }
  return result.content.trim()
}

function buildFallbackSummary(userPrompt: string, attachments: AttachedFile[], type: TaskType): string {
  const headline = type === 'summary' ? '## WHY/WHAT/HOW/CHECK 快速草稿' : '## 解題草稿'
  const tableRows = attachments.length
    ? attachments
        .map((file, index) => {
          const tag = `[A${index + 1}]`
          const snippet = (file.content || '').replace(/\s+/g, ' ').slice(0, 120) || '已上傳，等待解析'
          return `| ${tag} ${file.name} | ${snippet} |`
        })
        .join('\n')
    : '| — | 尚未提供附件，僅根據輸入生成草稿 |'

  const table = `| 來源 | 初步觀察 |\n| --- | --- |\n${tableRows}`
  const promptSection = userPrompt?.trim() ? `\n\n### 使用者補充\n${userPrompt.trim()}` : ''
  const notice = '\n\n> ⚠️ 目前採用離線備援摘要，建議完成上傳後再重新整理。'
  return `${headline}\n\n${table}${promptSection}${notice}`
}
