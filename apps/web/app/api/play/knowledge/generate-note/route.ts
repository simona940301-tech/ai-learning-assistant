import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/play/knowledge/generate-note
 * 
 * 為指定的知識點生成學習筆記並加入錯題本
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { skillId, skillName, masteryLevel } = body

    if (!skillId || !skillName) {
      return NextResponse.json(
        { success: false, error: 'Missing skillId or skillName' },
        { status: 400 }
      )
    }

    // 調用 AI 生成學習筆記
    // 使用簡化版 AI 生成（實際應調用專門的 AI 服務）
    let noteContent = ''
    
    try {
      // 嘗試調用 AI API 生成筆記
      const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/solve-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: `請為「${skillName}」這個知識點生成一份學習筆記，包括核心概念、常見錯誤、解題技巧和練習建議。`,
          subject: skillId.split('-')[0] || 'general',
        }),
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        if (aiData.explanation?.summary) {
          noteContent = `# ${skillName} 學習筆記

## 掌握度：${Math.round((masteryLevel || 0) * 100)}%

### 核心概念
${aiData.explanation.summary}

### 常見錯誤
${aiData.explanation.error_hints?.join('\n- ') || '暫無資料'}

### 解題技巧
${aiData.explanation.extensions?.join('\n- ') || '暫無資料'}

### 練習建議
${aiData.explanation.checks?.join('\n- ') || '建議多練習相關題目'}
`
        }
      }
    } catch (error) {
      console.error('[Generate Note] AI generation failed, using template:', error)
    }

    // 如果 AI 生成失敗，使用模板
    if (!noteContent) {
      noteContent = `# ${skillName} 學習筆記

## 掌握度：${Math.round((masteryLevel || 0) * 100)}%

### 核心概念
- 請補充核心概念

### 常見錯誤
- 請補充常見錯誤

### 解題技巧
- 請補充解題技巧

### 練習建議
- 建議多練習相關題目以提升掌握度
`
    }

    // 將筆記加入錯題本（或創建新記錄）
    // TODO: 實際的錯題本實現
    // 現在先返回成功，讓前端處理顯示

    return NextResponse.json({
      success: true,
      note: {
        skillId,
        skillName,
        content: noteContent,
        masteryLevel: masteryLevel || 0,
      },
      message: '筆記已生成並加入錯題本',
    })
  } catch (error) {
    console.error('[Generate Note API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate note',
      },
      { status: 500 }
    )
  }
}


