import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import {
  calculateDreamSchoolReadyScore,
  simulateEnglishGrade,
  calculateEnglishReadyScore,
  SkillPerformanceResult,
  PerformanceData,
} from '@/lib/dream-school-calculator'
import { SkillWeights, EnglishRequirement, DEFAULT_ENGLISH_REQUIREMENT } from '@/lib/taiwan-universities'
import { evaluateAndGrantEnglishBadges } from '@/lib/progression/english-badges'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, errorType } = await getApiUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: errorType === 'invalid-jwt' ? 'INVALID_JWT' : 'UNAUTHENTICATED' },
        { status: 401 },
      )
    }

    // 1. Fetch User Profile Data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('mock_exam_level, streak, elo_rank, target_university, target_department')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // 2. Calculate Weighted Accuracy (Vocabulary)
    let weightedAccuracy = 0
    let totalQuestions = 0
    let avgResponseTimeMs = 0

    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_weighted_english_performance', { user_id_input: user.id })
        .single()

      if (rpcError) throw rpcError

      const weightedCorrectSum = Number((rpcData as any)?.weighted_correct_sum || 0)
      const totalDifficultySum = Number((rpcData as any)?.total_difficulty_sum || 0)
      totalQuestions = Number((rpcData as any)?.total_questions_count || 0)
      avgResponseTimeMs = Number((rpcData as any)?.avg_response_time_ms || 0)

      if (totalDifficultySum > 0) {
        weightedAccuracy = weightedCorrectSum / totalDifficultySum
      }
    } catch (rpcErr) {
      console.warn('RPC failed, falling back to in-memory aggregation:', rpcErr)

      const { data: answers, error: answersError } = await supabase
        .from('user_answers')
        .select('is_correct, metadata')
        .eq('user_id', user.id)

      if (answersError) {
        console.error('Fallback fetch failed:', answersError)
        return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 })
      }

      if (answers && answers.length > 0) {
        let weightedCorrectSum = 0
        let totalDifficultySum = 0
        let totalResponseTime = 0
        let validCount = 0

        answers.forEach(ans => {
          const metadata = ((ans as any).metadata as any) || {}
          if (metadata.subject === 'english') {
            const difficulty = Number(metadata.difficulty) || 1
            const responseTime = Number(metadata.response_time_ms) || 0

            if (difficulty >= 1 && difficulty <= 5) {
              totalDifficultySum += difficulty
              if ((ans as any).is_correct) {
                weightedCorrectSum += difficulty
              }
              totalResponseTime += responseTime
              validCount++
            }
          }
        })

        totalQuestions = validCount
        if (totalDifficultySum > 0) {
          weightedAccuracy = weightedCorrectSum / totalDifficultySum
        }
        if (validCount > 0) {
          avgResponseTimeMs = totalResponseTime / validCount
        }
      }
    }

    const vocabPerformance: PerformanceData = {
      weightedAccuracy,
      totalQuestions,
      avgResponseTimeMs,
    }

    // 3. Define Requirements & Weights
    // 🎯 動態查詢使用者目標科系的英文要求
    let englishRequirement: EnglishRequirement = DEFAULT_ENGLISH_REQUIREMENT
    let minReadyScore = 80 // 預設值

    if (profile.target_university && profile.target_department) {
      try {
        const { data: deptReq, error: deptError } = await supabase
          .from('department_requirements')
          .select('score_english, requirement_english')
          .eq('university_name', profile.target_university)
          .eq('department_name', profile.target_department)
          .maybeSingle()

        if (!deptError && deptReq) {
          // 如果查詢到該科系的英文要求,使用實際數據
          if (deptReq.score_english) {
            englishRequirement = {
              requiredGradeLevel: deptReq.score_english,
              passScore: 60,
              excellentScore: 90,
            }
            // 根據要求級分動態調整最低分數
            // 頂標(13) → 85分, 前標(12) → 80分, 均標(10) → 70分
            minReadyScore = 50 + (deptReq.score_english * 3)
          }
        }
      } catch (queryError) {
        console.warn('[Dream School Progress] Failed to query department requirements:', queryError)
        // 查詢失敗時使用預設值
      }
    }

    const skillWeights: SkillWeights = {
      vocabulary: 1.0,
      cloze: 0.0,
      reading: 0.0,
    }

    // 4. Calculate Skill Results
    const vocabGrade = simulateEnglishGrade(vocabPerformance)
    const vocabReadyScore = calculateEnglishReadyScore(vocabGrade, englishRequirement, avgResponseTimeMs)

    const skillResults: SkillPerformanceResult[] = [
      {
        skillName: 'vocabulary',
        performance: vocabPerformance,
        grade: vocabGrade,
        readyScore: vocabReadyScore,
      },
    ]

    // 5. Final Aggregation
    const result = calculateDreamSchoolReadyScore({
      skillResults,
      skillWeights,
      mockExamLevel: profile.mock_exam_level,
      streak: profile.streak || 0,
      eloRank: profile.elo_rank || 1200,
      minReadyScore, // 🎯 使用動態計算的最低分數
      englishRequirement,
    })

    // 6. Evaluate and grant English-specific badges (non-blocking for main response)
    await evaluateAndGrantEnglishBadges(supabase, user.id, {
      totalQuestions,
      weightedAccuracy,
      avgResponseTimeMs,
      readyPct: result.readyPct,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Internal error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
