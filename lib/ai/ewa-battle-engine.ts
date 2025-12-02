/**
 * EWA (Expected Win-rate Allocation) Battle Engine
 * 基於預期勝率的動態題目分配系統
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// 核心類型定義
export interface DKTProfile {
  concept_id: string
  current_mastery: number
  predicted_correctness: number
  forget_rate: number
  learn_rate: number
  confidence_level: number
  time_since_review_hours: number
}

export interface QuestionCandidate {
  id: string
  source: 'pack_questions' | 'seed_questions' | 'ugc_questions'
  content: {
    stem: string
    choices: string[]
    correct_answer: string
    difficulty: number
    concepts: string[]
  }
  mastery_data: {
    predicted_correctness: number
    times_shown: number
    in_error_book: boolean
    last_shown_hours_ago?: number
  }
  is_mutated?: boolean
  original_question_id?: string
}

export interface EWAConfiguration {
  target_accuracy_rate: number // 0.75 = 75% 目標答對率
  total_questions: number // 10
  session_type: 'standard' | 'confidence_build' | 'challenge' | 'review'
  user_sentiment?: 'frustrated' | 'normal' | 'confident' | 'bored'
}

export interface BattleQuestion {
  question: QuestionCandidate
  position: number // 1-10
  purpose: 'warmup' | 'new_learning' | 'error_review' | 'challenge' | 'finale'
  expected_correctness: number
}

export class EWABattleEngine {
  private supabase: SupabaseClient
  private userId: string

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase
    this.userId = userId
  }

  /**
   * 🎯 主要入口：生成一局 10 題的戰鬥題目
   */
  async generateBattleQuestions(config: EWAConfiguration): Promise<BattleQuestion[]> {
    console.log('[EWA Engine] Generating battle with config:', config)

    // Step 1: 獲取用戶的 DKT 資料
    const dktProfiles = await this.getUserDKTProfiles()
    
    // Step 2: 獲取候選題目池
    const candidates = await this.getCandidateQuestions()
    
    // Step 3: 分析用戶當前狀態，決定策略
    const strategy = await this.determineStrategy(config, dktProfiles, candidates)
    
    // Step 4: 使用「三明治交錯法」生成題目序列
    const battleQuestions = await this.generateSandwichSequence(strategy, candidates, config)
    
    // Step 5: 記錄配置到數據庫
    await this.recordBattleSession(config, battleQuestions)

    console.log('[EWA Engine] Generated battle sequence:', {
      total: battleQuestions.length,
      expected_accuracy: this.calculateExpectedAccuracy(battleQuestions),
      old_questions: battleQuestions.filter(q => q.question.mastery_data.in_error_book).length,
      new_questions: battleQuestions.filter(q => !q.question.mastery_data.in_error_book).length
    })

    return battleQuestions
  }

  /**
   * 🧠 獲取用戶的 DKT (Deep Knowledge Tracing) 資料
   */
  private async getUserDKTProfiles(): Promise<Map<string, DKTProfile>> {
    const { data: profiles } = await this.supabase
      .from('knowledge_mastery')
      .select('*')
      .eq('user_id', this.userId)

    const profileMap = new Map<string, DKTProfile>()
    
    profiles?.forEach(profile => {
      profileMap.set(profile.concept_id, {
        concept_id: profile.concept_id,
        current_mastery: profile.current_mastery,
        predicted_correctness: profile.predicted_correctness,
        forget_rate: profile.forget_rate,
        learn_rate: profile.learn_rate,
        confidence_level: profile.confidence_level,
        time_since_review_hours: profile.time_since_review_hours || 0
      })
    })

    return profileMap
  }

  /**
   * 📚 獲取候選題目池
   */
  private async getCandidateQuestions(): Promise<QuestionCandidate[]> {
    // 獲取錯題本題目 (舊題)
    const { data: errorBookQuestions } = await this.supabase
      .from('question_mastery')
      .select(`
        question_id,
        question_source,
        predicted_correctness,
        total_shown,
        in_error_book,
        last_shown_at
      `)
      .eq('user_id', this.userId)
      .eq('in_error_book', true)
      .eq('mastery_threshold_reached', false)

    // 獲取新題目池
    const { data: newQuestions } = await this.supabase
      .from('seed_questions')
      .select(`
        id,
        question_text,
        option_a,
        option_b, 
        option_c,
        option_d,
        correct_answer,
        difficulty_level,
        knowledge_tags
      `)
      .eq('is_active', true)
      .not('id', 'in', `(${errorBookQuestions?.map(q => `'${q.question_id}'`).join(',') || "''"})`)
      .limit(50)

    const candidates: QuestionCandidate[] = []

    // 處理錯題本題目
    for (const errorQ of errorBookQuestions || []) {
      const { data: questionDetail } = await this.getQuestionDetail(
        errorQ.question_id, 
        errorQ.question_source as any
      )
      
      if (questionDetail) {
        candidates.push({
          id: errorQ.question_id,
          source: errorQ.question_source as any,
          content: questionDetail,
          mastery_data: {
            predicted_correctness: errorQ.predicted_correctness,
            times_shown: errorQ.total_shown,
            in_error_book: true,
            last_shown_hours_ago: errorQ.last_shown_at 
              ? Math.floor((Date.now() - new Date(errorQ.last_shown_at).getTime()) / (1000 * 60 * 60))
              : undefined
          }
        })
      }
    }

    // 處理新題目
    for (const newQ of newQuestions || []) {
      candidates.push({
        id: newQ.id,
        source: 'seed_questions',
        content: {
          stem: newQ.question_text,
          choices: [newQ.option_a, newQ.option_b, newQ.option_c, newQ.option_d],
          correct_answer: newQ.correct_answer,
          difficulty: newQ.difficulty_level || 3,
          concepts: newQ.knowledge_tags || []
        },
        mastery_data: {
          predicted_correctness: 0.5, // 新題目預設 50%
          times_shown: 0,
          in_error_book: false
        }
      })
    }

    return candidates
  }

  /**
   * 🎯 決定出題策略
   */
  private async determineStrategy(
    config: EWAConfiguration, 
    dktProfiles: Map<string, DKTProfile>,
    candidates: QuestionCandidate[]
  ) {
    const errorBookCount = candidates.filter(c => c.mastery_data.in_error_book).length
    const avgMastery = this.calculateAverageMastery(dktProfiles)
    const recentPerformance = await this.getRecentPerformance()

    let strategy = {
      old_question_ratio: 0.3, // 預設 30% 舊題
      target_difficulty: 3,
      confidence_boost_needed: false,
      challenge_mode: false
    }

    // 情境 A：學霸型 (掌握度高，最近表現好)
    if (avgMastery > 0.8 && recentPerformance.accuracy > 0.85) {
      strategy = {
        old_question_ratio: 0.1, // 只出 1 題舊題暖身
        target_difficulty: 4,
        confidence_boost_needed: false,
        challenge_mode: true
      }
      console.log('[EWA Strategy] 學霸模式：高難度新題為主')
    }
    
    // 情境 B：挫折型 (掌握度低，最近表現差)
    else if (avgMastery < 0.4 || recentPerformance.accuracy < 0.5) {
      strategy = {
        old_question_ratio: 0.6, // 60% 舊題重建信心
        target_difficulty: 2,
        confidence_boost_needed: true,
        challenge_mode: false
      }
      console.log('[EWA Strategy] 信心重建模式：舊題為主')
    }
    
    // 情境 C：平衡型
    else {
      strategy = {
        old_question_ratio: 0.3,
        target_difficulty: 3,
        confidence_boost_needed: false,
        challenge_mode: false
      }
      console.log('[EWA Strategy] 平衡模式：標準配比')
    }

    return strategy
  }

  /**
   * 🥪 三明治交錯法生成題目序列
   */
  private async generateSandwichSequence(
    strategy: any,
    candidates: QuestionCandidate[],
    config: EWAConfiguration
  ): Promise<BattleQuestion[]> {
    const sequence: BattleQuestion[] = []
    const oldQuestions = candidates.filter(c => c.mastery_data.in_error_book)
    const newQuestions = candidates.filter(c => !c.mastery_data.in_error_book)

    // 計算實際配額
    const targetOldCount = Math.floor(config.total_questions * strategy.old_question_ratio)
    const targetNewCount = config.total_questions - targetOldCount

    // 三明治序列模板
    const template = [
      { position: 1, purpose: 'warmup', prefer: 'old', difficulty_adjust: -1 },
      { position: 2, purpose: 'warmup', prefer: 'old', difficulty_adjust: -1 },
      { position: 3, purpose: 'new_learning', prefer: 'new', difficulty_adjust: 0 },
      { position: 4, purpose: 'new_learning', prefer: 'new', difficulty_adjust: 0 },
      { position: 5, purpose: 'new_learning', prefer: 'new', difficulty_adjust: 0 },
      { position: 6, purpose: 'error_review', prefer: 'old', difficulty_adjust: 1 },
      { position: 7, purpose: 'challenge', prefer: 'new', difficulty_adjust: 1 },
      { position: 8, purpose: 'challenge', prefer: 'new', difficulty_adjust: 1 },
      { position: 9, purpose: 'challenge', prefer: 'new', difficulty_adjust: 1 },
      { position: 10, purpose: 'finale', prefer: 'adaptive', difficulty_adjust: 0 }
    ]

    let usedOldCount = 0
    let usedNewCount = 0

    for (const slot of template) {
      let selectedQuestion: QuestionCandidate | null = null

      // 根據策略和配額選題
      if (slot.prefer === 'old' && usedOldCount < targetOldCount && oldQuestions.length > 0) {
        selectedQuestion = await this.selectBestOldQuestion(oldQuestions, slot, strategy)
        usedOldCount++
      } else if (slot.prefer === 'new' && usedNewCount < targetNewCount && newQuestions.length > 0) {
        selectedQuestion = await this.selectBestNewQuestion(newQuestions, slot, strategy)
        usedNewCount++
      } else if (slot.prefer === 'adaptive') {
        // 最後一題：選擇能讓總預期勝率接近目標的題目
        selectedQuestion = await this.selectFinaleQuestion(
          [...oldQuestions, ...newQuestions], 
          sequence, 
          config.target_accuracy_rate
        )
      }

      // 補充邏輯：如果首選類型用完了，從另一類型選
      if (!selectedQuestion) {
        if (usedNewCount < targetNewCount && newQuestions.length > 0) {
          selectedQuestion = await this.selectBestNewQuestion(newQuestions, slot, strategy)
          usedNewCount++
        } else if (usedOldCount < targetOldCount && oldQuestions.length > 0) {
          selectedQuestion = await this.selectBestOldQuestion(oldQuestions, slot, strategy)
          usedOldCount++
        }
      }

      if (selectedQuestion) {
        // 檢查是否需要變異 (針對舊題)
        if (selectedQuestion.mastery_data.in_error_book && slot.purpose === 'error_review') {
          selectedQuestion = await this.applyQuestionMutation(selectedQuestion)
        }

        sequence.push({
          question: selectedQuestion,
          position: slot.position,
          purpose: slot.purpose as any,
          expected_correctness: selectedQuestion.mastery_data.predicted_correctness
        })

        // 移除已選題目避免重複
        const index = candidates.findIndex(c => c.id === selectedQuestion!.id)
        if (index > -1) candidates.splice(index, 1)
      }
    }

    return sequence
  }

  /**
   * 🔄 錯題變異 (AI 重寫)
   */
  private async applyQuestionMutation(question: QuestionCandidate): Promise<QuestionCandidate> {
    // 檢查是否已有變異版本
    const { data: existingMutation } = await this.supabase
      .from('question_mutations')
      .select('*')
      .eq('user_id', this.userId)
      .eq('original_question_id', question.id)
      .eq('original_question_source', question.source)
      .maybeSingle()

    if (existingMutation) {
      return {
        ...question,
        content: {
          ...question.content,
          stem: existingMutation.mutated_question_text,
          choices: existingMutation.mutated_choices,
          correct_answer: existingMutation.mutated_correct_answer
        },
        is_mutated: true,
        original_question_id: question.id
      }
    }

    // 使用 LLM 生成變異版本
    try {
      const mutatedContent = await this.generateQuestionMutation(question)
      
      // 保存變異記錄
      await this.supabase.from('question_mutations').insert({
        original_question_id: question.id,
        original_question_source: question.source,
        user_id: this.userId,
        mutated_question_text: mutatedContent.stem,
        mutated_choices: mutatedContent.choices,
        mutated_correct_answer: mutatedContent.correct_answer,
        core_concept_preserved: mutatedContent.core_concept,
        mutation_type: mutatedContent.mutation_type
      })

      return {
        ...question,
        content: mutatedContent,
        is_mutated: true,
        original_question_id: question.id
      }
    } catch (error) {
      console.error('[EWA] Question mutation failed:', error)
      return question // 回退到原題目
    }
  }

  // 輔助方法們...
  private async selectBestOldQuestion(questions: QuestionCandidate[], slot: any, strategy: any): Promise<QuestionCandidate | null> {
    // 優先選擇預期勝率在 0.7-0.9 範圍的舊題
    return questions
      .filter(q => q.mastery_data.predicted_correctness >= 0.7 && q.mastery_data.predicted_correctness <= 0.9)
      .sort((a, b) => b.mastery_data.predicted_correctness - a.mastery_data.predicted_correctness)[0] || null
  }

  private async selectBestNewQuestion(questions: QuestionCandidate[], slot: any, strategy: any): Promise<QuestionCandidate | null> {
    // 根據難度策略選擇新題
    return questions
      .filter(q => Math.abs(q.content.difficulty - (strategy.target_difficulty + slot.difficulty_adjust)) <= 1)
      .sort((a, b) => Math.abs(a.content.difficulty - strategy.target_difficulty) - Math.abs(b.content.difficulty - strategy.target_difficulty))[0] || null
  }

  private async selectFinaleQuestion(questions: QuestionCandidate[], currentSequence: BattleQuestion[], targetAccuracy: number): Promise<QuestionCandidate | null> {
    const currentExpectedAccuracy = this.calculateExpectedAccuracy(currentSequence)
    const neededAccuracy = (targetAccuracy * 10 - currentExpectedAccuracy * 9) // 最後一題需要的勝率
    
    // 選擇預期勝率最接近所需勝率的題目
    return questions
      .sort((a, b) => 
        Math.abs(a.mastery_data.predicted_correctness - neededAccuracy) - 
        Math.abs(b.mastery_data.predicted_correctness - neededAccuracy)
      )[0] || null
  }

  private calculateExpectedAccuracy(questions: BattleQuestion[]): number {
    if (questions.length === 0) return 0
    return questions.reduce((sum, q) => sum + q.expected_correctness, 0) / questions.length
  }

  private calculateAverageMastery(dktProfiles: Map<string, DKTProfile>): number {
    if (dktProfiles.size === 0) return 0.5
    const masteries = Array.from(dktProfiles.values()).map(p => p.current_mastery)
    return masteries.reduce((sum, m) => sum + m, 0) / masteries.length
  }

  private async getRecentPerformance() {
    // 獲取最近 20 題的表現
    const { data } = await this.supabase
      .from('user_answers')
      .select('is_correct, created_at')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(20)

    const correct = data?.filter(d => d.is_correct).length || 0
    const total = data?.length || 1
    
    return { accuracy: correct / total, total }
  }

  private async getQuestionDetail(questionId: string, source: string) {
    // 實現獲取題目詳情的邏輯
    if (source === 'seed_questions') {
      const { data } = await this.supabase
        .from('seed_questions')
        .select('question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty_level, knowledge_tags')
        .eq('id', questionId)
        .maybeSingle()

      if (data) {
        return {
          stem: data.question_text,
          choices: [data.option_a, data.option_b, data.option_c, data.option_d],
          correct_answer: data.correct_answer,
          difficulty: data.difficulty_level || 3,
          concepts: data.knowledge_tags || []
        }
      }
    }
    return null
  }

  private async generateQuestionMutation(question: QuestionCandidate) {
    // 這裡實現 LLM 變異邏輯 - 可以整合到現有的 AI 系統
    return {
      stem: question.content.stem, // 暫時返回原題，實際需要 LLM 處理
      choices: question.content.choices,
      correct_answer: question.content.correct_answer,
      core_concept: question.content.concepts[0] || 'general',
      mutation_type: 'context_change' as const
    }
  }

  private async recordBattleSession(config: EWAConfiguration, questions: BattleQuestion[]) {
    await this.supabase.from('ewa_battle_sessions').insert({
      user_id: this.userId,
      target_accuracy_rate: config.target_accuracy_rate,
      session_type: config.session_type,
      total_questions: config.total_questions,
      planned_old_questions: questions.filter(q => q.question.mastery_data.in_error_book).length,
      planned_new_questions: questions.filter(q => !q.question.mastery_data.in_error_book).length,
      question_selection_log: questions.map(q => ({
        position: q.position,
        purpose: q.purpose,
        question_id: q.question.id,
        expected_correctness: q.expected_correctness,
        is_mutated: q.question.is_mutated
      }))
    })
  }
}