import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/play/matchmaking/knowledge-tips
 * 
 * 返回匹配中顯示的知識點提示（冷知識或熱門錯題）
 * 根據 subject 過濾相關知識點
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const subject = searchParams.get('subject') // 'chinese' | 'english' | 'math' | 'science' | 'social' | null

    // 預設知識點（如果沒有資料庫，使用這些）
    const defaultTips: Array<{ type: 'trivia' | 'common_mistake'; content: string; subject?: string }> = [
      // 國文冷知識
      { type: 'trivia', subject: 'chinese', content: '你知道「尷尬」的「尷」字原本指的是兩腿之間，後來演變成「不自在」的意思嗎？' },
      { type: 'trivia', subject: 'chinese', content: '「三思而後行」出自《論語》，但原文是「季文子三思而後行」，孔子反而說：「再，斯可矣」' },
      
      // 英文冷知識
      { type: 'trivia', subject: 'english', content: '你知道 "bookkeeper" 是英文中唯一有三個連續雙字母的單字嗎？' },
      { type: 'trivia', subject: 'english', content: '"The quick brown fox jumps over the lazy dog" 包含了所有 26 個英文字母！' },
      
      // 數學冷知識
      { type: 'trivia', subject: 'math', content: '你知道 π 的前 100 萬位小數中，數字 8 出現的頻率最高嗎？' },
      { type: 'trivia', subject: 'math', content: '「黃金比例」φ ≈ 1.618，在自然界中無處不在：向日葵的種子排列、鸚鵡螺的外殼...' },
      
      // 自然冷知識
      { type: 'trivia', subject: 'science', content: '光速在真空中是每秒 299,792,458 公尺，這是目前已知宇宙中的速度上限' },
      { type: 'trivia', subject: 'science', content: '你知道水的密度在 4°C 時最大嗎？這解釋了為什麼冰會浮在水面上' },
      
      // 社會冷知識
      { type: 'trivia', subject: 'social', content: '台灣最北端的點是富貴角，最南端是鵝鑾鼻，南北距離約 395 公里' },
      { type: 'trivia', subject: 'social', content: '你知道「台北」的名稱來自於「台北府」嗎？原本的行政中心在現今的台北市大同區' },
      
      // 熱門錯題提示（通用）
      { type: 'common_mistake', content: '常見錯誤：很多人會混淆「必須」和「必需」，前者是副詞（必須做），後者是形容詞（必需品）' },
      { type: 'common_mistake', content: '常見錯誤：英文時態中，過去完成式 (had done) 需要用於「過去的過去」情境' },
      { type: 'common_mistake', content: '常見錯誤：數學解題時，記得檢查「分母不能為零」的條件，這是常見的失分點' },
    ]

    // 如果有 subject，過濾相關知識點
    let tips = defaultTips
    if (subject) {
      tips = defaultTips.filter(tip => !tip.subject || tip.subject === subject)
    }

    // 如果過濾後太少，加入通用知識點
    if (tips.length < 3) {
      tips = [...tips, ...defaultTips.filter(tip => !tip.subject || tip.type === 'common_mistake')]
    }

    // 隨機打亂並返回
    const shuffled = tips.sort(() => Math.random() - 0.5).slice(0, 5)

    return NextResponse.json({
      success: true,
      tips: shuffled,
    })
  } catch (error) {
    console.error('[Knowledge Tips API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch knowledge tips',
      },
      { status: 500 }
    )
  }
}

