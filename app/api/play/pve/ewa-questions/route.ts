import { NextRequest, NextResponse } from 'next/server'
import { getApiUser, getSupabaseClient } from '@/lib/api/auth'
import { EWABattleEngine } from '@/lib/ai/ewa-battle-engine'

export const dynamic = 'force-dynamic'

/**
 * 🎯 EWA (Expected Win-rate Allocation) PvE Questions API
 * 基於預期勝率的動態配比出題系統
 */

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser()
    const supabase = getSupabaseClient()
    
    const body = await request.json()
    const {
      target_accuracy = 0.75, // 預設 75% 目標勝率
      session_type = 'standard',
      total_questions = 10,
      user_sentiment, // 可選：用戶情緒狀態
      force_difficulty, // 可選：強制難度
      subject_filter, // 可選：科目過濾
    } = body

    console.log('[EWA API] Generating questions with params:', {
      userId: user.id,
      target_accuracy,
      session_type,
      total_questions
    })

    // 初始化 EWA 引擎
    const ewaEngine = new EWABattleEngine(supabase, user.id)
    
    // 配置 EWA 參數
    const config = {
      target_accuracy_rate: Math.max(0.5, Math.min(0.9, target_accuracy)),
      total_questions: Math.max(5, Math.min(15, total_questions)),
      session_type: session_type as 'standard' | 'confidence_build' | 'challenge' | 'review',
      user_sentiment
    }

    // 生成戰鬥題目序列
    const battleQuestions = await ewaEngine.generateBattleQuestions(config)
    
    // 轉換為前端格式
    const formattedQuestions = battleQuestions.map((bq, index) => ({
      id: bq.question.id,
      question_text: bq.question.content.stem,
      options: bq.question.content.choices,
      correct_answer: bq.question.content.correct_answer,
      difficulty: bq.question.content.difficulty,
      
      // EWA 特殊欄位
      position: bq.position,
      purpose: bq.purpose,
      expected_correctness: bq.expected_correctness,
      is_from_error_book: bq.question.mastery_data.in_error_book,
      is_mutated: bq.question.is_mutated || false,
      original_question_id: bq.question.original_question_id,
      
      // 遊戲邏輯欄位
      time_limit: getPurposeTimeLimit(bq.purpose),
      skill_tags: bq.question.content.concepts,
      
      // 調試信息 (開發模式)
      debug_info: process.env.NODE_ENV === 'development' ? {
        predicted_correctness: bq.question.mastery_data.predicted_correctness,
        times_shown: bq.question.mastery_data.times_shown,
        source: bq.question.source,
        last_shown_hours_ago: bq.question.mastery_data.last_shown_hours_ago
      } : undefined
    }))

    // 記錄分析數據
    const analysisData = {
      total_questions: battleQuestions.length,
      expected_overall_accuracy: battleQuestions.reduce((sum, q) => sum + q.expected_correctness, 0) / battleQuestions.length,
      error_book_questions: battleQuestions.filter(q => q.question.mastery_data.in_error_book).length,
      new_questions: battleQuestions.filter(q => !q.question.mastery_data.in_error_book).length,
      mutated_questions: battleQuestions.filter(q => q.question.is_mutated).length,
      purpose_distribution: getPurposeDistribution(battleQuestions),
      difficulty_distribution: getDifficultyDistribution(battleQuestions)
    }

    console.log('[EWA API] Successfully generated questions:', analysisData)

    return NextResponse.json({
      success: true,
      questions: formattedQuestions,
      analysis: analysisData,
      config: config,
      message: getStrategyMessage(analysisData)
    })

  } catch (error) {
    console.error('[EWA API] Error generating questions:', error)
    return NextResponse.json(
      { 
        error: 'GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        fallback: true
      }, 
      { status: 500 }
    )
  }
}

/**
 * 🔄 更新答題結果，觸發 DKT 學習
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getApiUser()
    const supabase = getSupabaseClient()
    
    const body = await request.json()
    const {
      question_id,
      question_source,
      is_correct,
      response_time_ms,
      session_id,
      position,
      expected_correctness
    } = body

    console.log('[EWA API] Recording answer result:', {
      question_id,
      is_correct,
      expected_correctness,
      position
    })

    // 更新題目掌握度
    await updateQuestionMastery(supabase, user.id, {
      question_id,
      question_source,
      is_correct,
      response_time_ms,
      expected_correctness
    })

    // 更新概念掌握度 (DKT)
    await updateConceptMastery(supabase, user.id, {
      question_id,
      question_source,
      is_correct
    })

    // 記錄到通用答題表
    await supabase.from('user_answers').insert({
      user_id: user.id,
      question_id,
      is_correct,
      metadata: {
        source: 'ewa_pve',
        session_id,
        position,
        expected_correctness,
        response_time_ms,
        ewa_enabled: true
      }
    })

    return NextResponse.json({
      success: true,
      updated_mastery: true
    })

  } catch (error) {
    console.error('[EWA API] Error recording answer:', error)
    return NextResponse.json(
      { error: 'RECORD_FAILED' },
      { status: 500 }
    )
  }
}

// 輔助函數

function getPurposeTimeLimit(purpose: string): number {
  switch (purpose) {
    case 'warmup': return 25 // 暖身題給多一點時間
    case 'new_learning': return 30 // 新題學習時間
    case 'error_review': return 20 // 錯題複習
    case 'challenge': return 15 // 挑戰題時間緊張
    case 'finale': return 22 // 最後一題適中
    default: return 20
  }
}

function getPurposeDistribution(questions: any[]) {
  const distribution: Record<string, number> = {}
  questions.forEach(q => {
    distribution[q.purpose] = (distribution[q.purpose] || 0) + 1
  })
  return distribution
}

function getDifficultyDistribution(questions: any[]) {
  const distribution: Record<number, number> = {}
  questions.forEach(q => {
    const diff = q.question.content.difficulty
    distribution[diff] = (distribution[diff] || 0) + 1
  })
  return distribution
}

function getStrategyMessage(analysis: any): string {
  const { error_book_questions, new_questions, expected_overall_accuracy } = analysis
  
  if (error_book_questions >= 6) {
    return "信心重建模式：這局主要複習你的錯題，幫助鞏固基礎！"
  } else if (new_questions >= 8) {
    return "挑戰模式：準備好迎接新知識了嗎？大部分都是新題目！"
  } else if (expected_overall_accuracy > 0.8) {
    return "高手模式：這局對你來說應該不太困難，展現你的實力吧！"
  } else if (expected_overall_accuracy < 0.6) {
    return "穩扎穩打模式：這局會比較有挑戰性，但相信你能克服！"
  } else {
    return "平衡模式：新舊題目搭配，維持最佳學習節奏！"
  }
}

async function updateQuestionMastery(supabase: any, userId: string, data: any) {
  const { question_id, question_source, is_correct, response_time_ms, expected_correctness } = data
  
  // 使用 DKT 演算法更新預測正確率
  const previousCorrectness = expected_correctness
  const learningRate = is_correct ? 0.3 : 0.2
  const newCorrectness = previousCorrectness + learningRate * (Number(is_correct) - previousCorrectness)
  
  // 更新或插入掌握度記錄
  await supabase.from('question_mastery')
    .upsert({
      user_id: userId,
      question_id,
      question_source,
      predicted_correctness: Math.max(0.05, Math.min(0.95, newCorrectness)),
      actual_performance: newCorrectness,
      total_shown: supabase.raw('total_shown + 1'),
      total_correct: is_correct ? supabase.raw('total_correct + 1') : supabase.raw('total_correct'),
      avg_response_time_ms: response_time_ms,
      last_shown_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,question_id,question_source'
    })
}

async function updateConceptMastery(supabase: any, userId: string, data: any) {
  const { question_id, question_source, is_correct } = data
  
  // 獲取題目的概念標籤
  let concepts: string[] = []
  
  if (question_source === 'seed_questions') {
    const { data: questionData } = await supabase
      .from('seed_questions')
      .select('knowledge_tags')
      .eq('id', question_id)
      .maybeSingle()
    
    concepts = questionData?.knowledge_tags || []
  }
  
  // 為每個概念更新 DKT 掌握度
  for (const conceptId of concepts) {
    const { data: existing } = await supabase
      .from('knowledge_mastery')
      .select('current_mastery, total_attempts, correct_attempts')
      .eq('user_id', userId)
      .eq('concept_id', conceptId)
      .maybeSingle()
    
    let newMastery, newTotalAttempts, newCorrectAttempts
    
    if (existing) {
      newTotalAttempts = existing.total_attempts + 1
      newCorrectAttempts = existing.correct_attempts + (is_correct ? 1 : 0)
      
      // DKT 更新公式
      const learningRate = 0.3
      const forgetRate = 0.1
      const previousMastery = existing.current_mastery
      
      if (is_correct) {
        newMastery = previousMastery + learningRate * (1 - previousMastery)
      } else {
        newMastery = previousMastery * (1 - forgetRate)
      }
    } else {
      newTotalAttempts = 1
      newCorrectAttempts = is_correct ? 1 : 0
      newMastery = is_correct ? 0.7 : 0.3 // 初始值
    }
    
    // 計算新的預測正確率
    const predictedCorrectness = newMastery * 0.8 + (newCorrectAttempts / newTotalAttempts) * 0.2
    
    await supabase.from('knowledge_mastery')
      .upsert({
        user_id: userId,
        concept_id: conceptId,
        current_mastery: Math.max(0.05, Math.min(0.95, newMastery)),
        predicted_correctness: Math.max(0.05, Math.min(0.95, predictedCorrectness)),
        total_attempts: newTotalAttempts,
        correct_attempts: newCorrectAttempts,
        last_attempt_at: new Date().toISOString(),
        time_since_review_hours: 0 // 重置複習間隔
      }, {
        onConflict: 'user_id,concept_id'
      })
  }
}