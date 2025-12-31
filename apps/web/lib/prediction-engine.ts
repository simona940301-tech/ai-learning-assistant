/**
 * Prediction Engine
 * 
 * Predicts learning outcomes based on recent performance
 * Uses conservative estimates based on Taiwan exam data
 */

export interface LearningMetrics {
    date: string
    questions_attempted: number
    questions_correct: number
    avg_response_time_ms: number
    concepts_mastered: string[]
}

export interface PredictionInput {
    currentScore: number  // Current exam score (0-15)
    recentMetrics: LearningMetrics[]  // Last 7-14 days
    dailyQuestions: number  // Average questions per day
    targetUniversity: string
    targetDepartment: string
}

export interface PredictionOutput {
    currentScore: number
    predictions: {
        '7days': PredictionDetail
        '14days': PredictionDetail
    }
    recommendations: Recommendation[]
    disclaimer: string
}

export interface PredictionDetail {
    proficiency: number
    examScore: number
    confidence: number
    improvement: number
    isRealistic: boolean
    message: string
}

export interface Recommendation {
    type: 'focus_concept' | 'increase_practice' | 'review_errors'
    concept?: string
    reason: string
    action: string
    link?: string
    target?: number
    current?: number
    unit?: string
}

/**
 * Calculate realistic score prediction based on Taiwan exam data
 */
export function predictScore(data: {
    currentScore: number
    recentAccuracy: number
    dailyQuestions: number
    daysFromNow: number
}): {
    predictedScore: number
    confidence: number
    isRealistic: boolean
} {
    // 1. Calculate base improvement rate (score/day)
    let baseRate = 0
    if (data.currentScore <= 8) {
        baseRate = 0.05  // Basic level: +1 score in 20 days
    } else if (data.currentScore <= 11) {
        baseRate = 0.03  // Medium level: +1 score in 33 days
    } else {
        baseRate = 0.02  // High level: +1 score in 50 days (ceiling effect)
    }

    // 2. Adjust based on practice volume
    const practiceMultiplier = Math.min(
        1.5,  // Max 1.5x
        0.5 + (data.dailyQuestions / 20)  // 20 questions/day = 1.0x
    )

    // 3. Adjust based on accuracy (low accuracy = more room for improvement)
    const accuracyMultiplier = data.recentAccuracy < 0.6 ? 1.2
        : data.recentAccuracy < 0.8 ? 1.0
            : 0.8  // High accuracy = approaching ceiling

    // 4. Calculate predicted improvement
    const rawImprovement = baseRate * data.daysFromNow * practiceMultiplier * accuracyMultiplier

    // 5. Apply ceiling limits (based on Taiwan exam data)
    const maxImprovement = data.currentScore <= 8 ? 3
        : data.currentScore <= 11 ? 2
            : 1

    const improvement = Math.min(rawImprovement, maxImprovement)
    const predictedScore = Math.min(15, data.currentScore + improvement)

    // 6. Calculate confidence (more data = higher confidence)
    const dataPoints = Math.min(14, data.daysFromNow)
    const confidence = 0.5 + (dataPoints / 14) * 0.3  // 50%-80%

    // 7. Check if prediction is realistic
    const isRealistic = improvement <= maxImprovement

    return {
        predictedScore: Math.round(predictedScore * 10) / 10,
        confidence,
        isRealistic
    }
}

/**
 * Generate encouraging message based on prediction
 */
export function generateEncouragingMessage(data: {
    currentScore: number
    predictedScore: number
    targetUniversity: string
    targetDepartment: string
    daysRemaining: number
}): string {
    const improvement = data.predictedScore - data.currentScore

    const templates = {
        improving: [
            `太棒了!以目前的學習節奏,你在 ${data.daysRemaining} 天後可能進步 ${improvement.toFixed(1)} 級分`,
            `穩定進步中!繼續保持,${data.targetUniversity} ${data.targetDepartment} 的目標越來越近了 💪`,
            `你的努力正在累積!每一題都讓你離目標更近一步`
        ],
        stable: [
            `你已經建立了穩定的學習節奏!現在是突破的好時機 🚀`,
            `穩紮穩打!${data.targetUniversity} ${data.targetDepartment} 需要的就是這樣的堅持`,
            `保持現在的節奏,專注弱項概念,就能看到突破`
        ],
        needAdjustment: [
            `讓我們一起調整學習策略,找出最適合你的方法!`,
            `每個人都有學習曲線,重要的是找到對的方向。我們來看看哪裡可以改進`,
            `${data.targetUniversity} ${data.targetDepartment} 的目標還在,讓我們重新規劃路徑 ✨`
        ]
    }

    const trend = improvement >= 0.5 ? 'improving'
        : improvement <= -0.3 ? 'needAdjustment'
            : 'stable'

    return templates[trend][Math.floor(Math.random() * templates[trend].length)]
}

/**
 * Calculate proficiency from exam score
 */
export function examScoreToProficiency(examScore: number): number {
    return Math.round((examScore / 15) * 100)
}

/**
 * Generate recommendations based on weak concepts
 */
export function generateRecommendations(data: {
    weakConcepts: Array<{ concept: string, errorRate: number }>
    currentPracticeRate: number
}): Recommendation[] {
    const recommendations: Recommendation[] = []

    // 1. Focus on weak concepts
    if (data.weakConcepts.length > 0) {
        const weakest = data.weakConcepts[0]
        const potentialImprovement = Math.min(0.5, weakest.errorRate * 0.5)

        recommendations.push({
            type: 'focus_concept',
            concept: weakest.concept,
            reason: `這個概念還沒完全掌握,加強後預計能提升 ${potentialImprovement.toFixed(1)} 級分`,
            action: '開始練習',
            link: `/error-book/practice?concept=${encodeURIComponent(weakest.concept)}`
        })
    }

    // 2. Increase practice if below optimal
    if (data.currentPracticeRate < 15) {
        const target = Math.min(20, data.currentPracticeRate + 5)
        recommendations.push({
            type: 'increase_practice',
            target,
            current: data.currentPracticeRate,
            unit: 'questions/day',
            reason: `每天多做 ${target - data.currentPracticeRate} 題,14 天後預計可進步 0.5-1 級分`,
            action: '設定目標'
        })
    }

    return recommendations
}
