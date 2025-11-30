import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'

const DEFAULT_LIMIT = 10

type QuestionRow = {
  id: string
  question_text: string
  option_a?: string
  option_b?: string
  option_c?: string
  option_d?: string
  options?: string[] // 如果已經是數組格式
  correct_answer: string
  difficulty?: number
  difficulty_level?: number
  time_limit?: number
  subject: string
}

function generateFallbackQuestions(count: number) {
  const fallbackTemplates = [
    {
      question_text: 'What is the capital of France?',
      options: ['London', 'Paris', 'Berlin', 'Madrid'],
      correct_answer: 'B',
    },
    {
      question_text: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correct_answer: 'B',
    },
    {
      question_text: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correct_answer: 'B',
    },
    {
      question_text: 'Who wrote "Romeo and Juliet"?',
      options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
      correct_answer: 'B',
    },
    {
      question_text: 'What is the largest ocean on Earth?',
      options: ['Atlantic', 'Pacific', 'Indian', 'Arctic'],
      correct_answer: 'B',
    },
  ]

  const questions = []
  for (let i = 0; i < count; i++) {
    const template = fallbackTemplates[i % fallbackTemplates.length]
    questions.push({
      id: `fallback-${i + 1}`,
      question_text: template.question_text,
      options: template.options,
      correct_answer: template.correct_answer,
      difficulty: 3,
      time_limit: 20,
      skill_tags: ['fallback'],
    })
  }
  return questions
}

function pickQuestions(grouped: Record<number, QuestionRow[]>, difficulty: number, count: number) {
  const selected: QuestionRow[] = []
  let current = difficulty

  while (selected.length < count) {
    const bucket = grouped[current] || []
    if (bucket.length === 0) {
      // Try adjacent difficulties
      current = current > difficulty ? current - 1 : current + 1
      if (current < 1) current = 1
      if (current > 5) current = 5
      continue
    }

    // FIXED: Use random selection instead of .pop() to avoid repeated questions
    const randomIndex = Math.floor(Math.random() * bucket.length)
    const question = bucket.splice(randomIndex, 1)[0]
    if (question) selected.push(question)
  }

  return selected
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      subject,
      numQuestions = DEFAULT_LIMIT,
      recentPerformance, // Array of recent answer results for dynamic difficulty adjustment
    }: {
      userId?: string
      subject?: string
      numQuestions?: number
      recentPerformance?: Array<{ isCorrect: boolean; timeMs: number; difficulty: number }>
    } = body || {}

    const supabase = getSupabaseClient(req)

    // Check for internal API key to bypass RLS/Auth if needed
    const internalApiKey = req.headers.get('x-internal-api-key')
    const envInternalApiKey = process.env.INTERNAL_API_KEY

    let adminSupabase = supabase
    if (internalApiKey && envInternalApiKey && internalApiKey === envInternalApiKey) {
      console.log('[PVE Questions] Using internal API key for admin access')
      // Create admin client with service role key
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (serviceRoleKey && supabaseUrl) {
        const { createClient } = await import('@supabase/supabase-js')
        adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          }
        })
      }
    }

    // Use adminSupabase for queries if available, otherwise fallback to user supabase
    const db = adminSupabase

    let baselineDifficulty = 3
    let userProficiency = null

    if (userId) {
      // Enhanced: Get proficiency data instead of just level
      const { data: proficiencyData } = await supabase
        .rpc('get_latest_user_proficiency', { p_user_id: userId })

      if (proficiencyData && proficiencyData.length > 0) {
        userProficiency = proficiencyData[0]
        // Map proficiency (0-100) to difficulty (1-5)
        // 0-20: difficulty 1, 20-40: difficulty 2, etc.
        baselineDifficulty = Math.min(5, Math.max(1, Math.ceil(userProficiency.overall_proficiency / 20)))
      } else {
        // Fallback to old method
        const { data: profile } = await supabase
          .from('profiles')
          .select('level')
          .eq('id', userId)
          .maybeSingle()
        if (profile?.level) {
          baselineDifficulty = Math.min(5, Math.max(1, Math.round(profile.level / 5)))
        }
      }

      // Dynamic Difficulty Adjustment (DDA) based on recent performance
      if (recentPerformance && recentPerformance.length >= 3) {
        const recentCount = Math.min(5, recentPerformance.length)
        const recent = recentPerformance.slice(-recentCount)

        // Calculate accuracy in recent questions
        const correctCount = recent.filter(r => r.isCorrect).length
        const accuracy = correctCount / recent.length

        // Calculate average response time
        const avgTimeMs = recent.reduce((sum, r) => sum + r.timeMs, 0) / recent.length
        const avgTimeSeconds = avgTimeMs / 1000

        // Adjust difficulty based on performance
        let difficultyAdjustment = 0

        // If accuracy is high (>80%) and answering quickly (<12s), increase difficulty
        if (accuracy >= 0.8 && avgTimeSeconds < 12) {
          difficultyAdjustment = 1
        }
        // If accuracy is very high (>90%) and very quick (<8s), increase more
        else if (accuracy >= 0.9 && avgTimeSeconds < 8) {
          difficultyAdjustment = 2
        }
        // If accuracy is low (<50%), decrease difficulty
        else if (accuracy < 0.5) {
          difficultyAdjustment = -1
        }
        // If accuracy is very low (<30%), decrease more
        else if (accuracy < 0.3) {
          difficultyAdjustment = -2
        }

        baselineDifficulty = Math.min(5, Math.max(1, baselineDifficulty + difficultyAdjustment))

        console.log('[DDA] Dynamic difficulty adjustment:', {
          accuracy,
          avgTimeSeconds: avgTimeSeconds.toFixed(2),
          adjustment: difficultyAdjustment,
          newDifficulty: baselineDifficulty
        })
      }
    }

    // Weakness Sniper Logic
    let weaknessQuestions: any[] = []
    if (userId) {
      try {
        // 1. Get weakest tags
        const { data: weakTags } = await supabase.rpc('get_weakest_tags', {
          p_user_id: userId,
          p_limit: 2
        })

        if (weakTags && weakTags.length > 0) {
          const tags = weakTags.map((t: any) => t.tag)
          console.log('[Weakness Sniper] Targeting tags:', tags)

          // 2. Fetch questions for these tags
          const { data: wQuestions } = await db
            .from('seed_questions')
            .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty_level, subject, knowledge_tags')
            .overlaps('knowledge_tags', tags)
            .eq('is_active', true)
            .limit(5)

          if (wQuestions && wQuestions.length > 0) {
            weaknessQuestions = wQuestions
            console.log('[Weakness Sniper] Found questions:', wQuestions.length)
          }
        }
      } catch (err) {
        console.warn('[Weakness Sniper] Failed:', err)
      }
    }

    console.log('[PVE Questions] Querying seed_questions with:', { subject, numQuestions, is_active: true })
    let query = db.from('seed_questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty_level, subject, knowledge_tags')
    if (subject) query = query.eq('subject', subject)
    const { data: questions, error } = await query
      .eq('is_active', true) // 只選擇啟用的題目
      .order('difficulty_level', { ascending: true })
      .limit(numQuestions * 3)

    console.log('[PVE Questions] Query result:', {
      questionsCount: questions?.length || 0,
      error: error?.message || null,
      firstQuestion: questions?.[0]?.question_text?.substring(0, 50) || 'N/A'
    })

    if (error) {
      console.error('[PVE Questions] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 如果沒有題目，使用 fallback 測試題目
    if (!questions || questions.length === 0) {
      console.warn('[PVE Questions] No questions in database, using fallback test questions')
      const fallbackQuestions = generateFallbackQuestions(numQuestions)
      return NextResponse.json({
        success: true,
        questions: fallbackQuestions,
        dda_pool: {
          '1': fallbackQuestions,
          '2': fallbackQuestions,
          '3': fallbackQuestions,
          '4': fallbackQuestions,
          '5': fallbackQuestions,
        },
        baselineDifficulty: 3,
      })
    }

    const grouped: Record<number, QuestionRow[]> = {}
    for (const row of questions || []) {
      const diff = row.difficulty_level || 3
      grouped[diff] = grouped[diff] || []
      grouped[diff].push(row as QuestionRow)
    }

    let selectedQuestions = pickQuestions({ ...grouped }, baselineDifficulty, numQuestions)

    // Inject Weakness Questions
    if (weaknessQuestions.length > 0) {
      // Replace every 5th question (index 4, 9...)
      for (let i = 4; i < selectedQuestions.length; i += 5) {
        const wQ = weaknessQuestions.pop()
        if (wQ) {
          selectedQuestions[i] = wQ as QuestionRow
          // Add a flag or special tag?
          // We'll rely on skill_tags being present
        }
      }
    }

    const finalQuestions = selectedQuestions.map(
      (q) => {
        // 轉換選項格式：從 option_a/b/c/d 轉為 options 數組
        const options = [
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
        ].filter((opt): opt is string => {
          if (!opt) return false
          const trimmed = String(opt).trim()
          return trimmed.length > 0 && trimmed !== 'null' && trimmed !== 'undefined'
        })

        // 驗證題目數據
        if (!q.question_text || q.question_text.trim().length === 0) {
          console.warn('[PVE Questions] Invalid question_text for question:', q.id)
        }
        if (options.length < 2) {
          console.error('[PVE Questions] Invalid options for question:', q.id, {
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            finalOptions: options,
          })
        } else {
          console.log('[PVE Questions] Valid question:', q.id, {
            question_text: (q.question_text || '').substring(0, 50),
            options_count: options.length,
            options: options,
          })
        }

        return {
          id: q.id?.toString() || String(q.id),
          question_text: (q.question_text || '').trim(),
          options: options,
          correct_answer: q.correct_answer || 'A',
          difficulty: q.difficulty_level || 3,
          time_limit: 20, // 固定20秒，因為 schema 中沒有 time_limit 欄位
          skill_tags: (q as any).knowledge_tags || [], // Map knowledge_tags to skill_tags
        }
      }
    ).filter(q => {
      // 過濾掉無效的題目
      const isValid = q.question_text.length > 0 && q.options.length >= 2
      if (!isValid) {
        console.warn('[PVE Questions] Filtering out invalid question:', q.id, {
          question_text_length: q.question_text.length,
          options_count: q.options.length,
        })
      }
      return isValid
    })

    const ddaPool = Object.fromEntries(
      Object.entries(grouped).map(([diff, entries]) => [
        diff,
        entries.map((q) => {
          // 轉換選項格式：從 option_a/b/c/d 轉為 options 數組
          const options = [
            q.option_a,
            q.option_b,
            q.option_c,
            q.option_d,
          ].filter((opt): opt is string => {
            if (!opt) return false
            const trimmed = String(opt).trim()
            return trimmed.length > 0 && trimmed !== 'null' && trimmed !== 'undefined'
          })

          return {
            id: q.id?.toString() || String(q.id),
            question_text: (q.question_text || '').trim(),
            options: options,
            correct_answer: q.correct_answer || 'A',
            difficulty: q.difficulty_level || 3,
            time_limit: 20,
            skill_tags: (q as any).knowledge_tags || [],
          }
        }).filter((q: any) => q.question_text.length > 0 && q.options.length >= 2), // 過濾無效題目
      ]),
    )

    return NextResponse.json({
      success: true,
      questions: finalQuestions,
      dda_pool: ddaPool,
      baselineDifficulty,
    })
  } catch (error) {
    console.error('[PVE Questions] error', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
