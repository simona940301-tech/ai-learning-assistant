import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import {
    predictScore,
    generateEncouragingMessage,
    generateRecommendations,
    examScoreToProficiency,
    type PredictionOutput
} from '@/lib/prediction-engine'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/prediction
 * 
 * Get learning predictions and recommendations
 */
export async function GET(req: NextRequest) {
    try {
        const { supabase, user, errorType } = await getApiUser(req)

        if (!user) {
            const message =
                errorType === 'invalid-jwt'
                    ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
                    : errorType === 'unauthenticated'
                        ? 'Authentication required'
                        : 'Authentication error occurred'

            return NextResponse.json(
                {
                    error: 'UNAUTHORIZED',
                    message,
                    errorType,
                },
                { status: 401 }
            )
        }

        // 1. Get user profile for current level and goals
        const { data: profile } = await supabase
            .from('profiles')
            .select('level, mock_exam_level, target_university, target_department')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json(
                { error: 'PROFILE_NOT_FOUND', message: 'User profile not found' },
                { status: 404 }
            )
        }

        // 2. Get recent learning metrics (last 14 days)
        const fourteenDaysAgo = new Date()
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

        const { data: recentAnswers } = await supabase
            .from('user_answers')
            .select('is_correct, created_at')
            .eq('user_id', user.id)
            .gte('created_at', fourteenDaysAgo.toISOString())
            .order('created_at', { ascending: false })

        // 3. Calculate current metrics
        const totalQuestions = recentAnswers?.length || 0
        const correctQuestions = recentAnswers?.filter(a => a.is_correct).length || 0
        const recentAccuracy = totalQuestions > 0 ? correctQuestions / totalQuestions : 0.5
        const dailyQuestions = totalQuestions / 14

        // Estimate current score from mock_exam_level (1-15 scale)
        const currentScore = profile.mock_exam_level || 10

        // 4. Generate predictions for 7 and 14 days
        const prediction7days = predictScore({
            currentScore,
            recentAccuracy,
            dailyQuestions,
            daysFromNow: 7
        })

        const prediction14days = predictScore({
            currentScore,
            recentAccuracy,
            dailyQuestions,
            daysFromNow: 14
        })

        // 5. Generate encouraging messages
        const message7days = generateEncouragingMessage({
            currentScore,
            predictedScore: prediction7days.predictedScore,
            targetUniversity: profile.target_university || '理想大學',
            targetDepartment: profile.target_department || '目標科系',
            daysRemaining: 7
        })

        const message14days = generateEncouragingMessage({
            currentScore,
            predictedScore: prediction14days.predictedScore,
            targetUniversity: profile.target_university || '理想大學',
            targetDepartment: profile.target_department || '目標科系',
            daysRemaining: 14
        })

        // 6. Get weak concepts from error book
        const { data: errorBookItems } = await supabase
            .from('error_book')
            .select('knowledge_tags')
            .eq('user_id', user.id)
            .eq('status', 'active')

        // Count concept frequency in errors
        const conceptCounts: Record<string, number> = {}
        errorBookItems?.forEach(item => {
            const tags = item.knowledge_tags as string[]
            tags?.forEach(tag => {
                conceptCounts[tag] = (conceptCounts[tag] || 0) + 1
            })
        })

        const weakConcepts = Object.entries(conceptCounts)
            .map(([concept, count]) => ({
                concept,
                errorRate: count / (totalQuestions || 1)
            }))
            .sort((a, b) => b.errorRate - a.errorRate)
            .slice(0, 3)

        // 7. Generate recommendations
        const recommendations = generateRecommendations({
            weakConcepts,
            currentPracticeRate: dailyQuestions
        })

        // 8. Build response
        const response: PredictionOutput = {
            currentScore,
            predictions: {
                '7days': {
                    proficiency: examScoreToProficiency(prediction7days.predictedScore),
                    examScore: prediction7days.predictedScore,
                    confidence: prediction7days.confidence,
                    improvement: prediction7days.predictedScore - currentScore,
                    isRealistic: prediction7days.isRealistic,
                    message: message7days
                },
                '14days': {
                    proficiency: examScoreToProficiency(prediction14days.predictedScore),
                    examScore: prediction14days.predictedScore,
                    confidence: prediction14days.confidence,
                    improvement: prediction14days.predictedScore - currentScore,
                    isRealistic: prediction14days.isRealistic,
                    message: message14days
                }
            },
            recommendations,
            disclaimer: '預測基於統計模型,實際結果因人而異。持續練習是進步的關鍵。'
        }

        return NextResponse.json(response)

    } catch (error) {
        console.error('[Prediction API] Unexpected error:', error)
        return NextResponse.json(
            {
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
