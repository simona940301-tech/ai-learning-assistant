/**
 * Learning Path Analyzer
 *
 * Tracks and analyzes user's learning trajectory to:
 * - Identify effective learning patterns
 * - Predict future performance
 * - Recommend optimal learning strategies
 */

export interface LearningSession {
  timestamp: Date
  questionId: string
  conceptTags: string[]
  isCorrect: boolean
  timeSpent: number
  difficulty: number
  hintUsed: boolean
  wasReview: boolean // SRS review vs new content
}

export interface LearningPattern {
  patternType: 'mastery' | 'struggle' | 'plateau' | 'breakthrough' | 'regression'
  conceptTags: string[]
  confidence: number // 0-1
  description: string
  recommendation: string
}

export interface LearningMetrics {
  // Performance metrics
  overallAccuracy: number
  accuracyTrend: 'improving' | 'stable' | 'declining'
  averageTimePerQuestion: number
  speedTrend: 'faster' | 'stable' | 'slower'

  // Learning efficiency
  learningVelocity: number // Concepts mastered per week
  retentionRate: number // How well concepts are retained
  reviewEfficiency: number // Performance on SRS reviews

  // Pattern metrics
  optimalStudyTime: number // Minutes per day
  optimalSessionLength: number // Minutes per session
  bestTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'unknown'
  preferredDifficulty: number // 1-5
}

export interface PerformancePrediction {
  conceptTag: string
  currentMastery: number
  predictedMasteryIn7Days: number
  predictedMasteryIn14Days: number
  predictedMasteryIn30Days: number
  confidence: number
  recommendation: string
}

/**
 * Analyze learning sessions to identify patterns
 */
export function identifyLearningPatterns(
  sessions: LearningSession[],
  minSessions: number = 10
): LearningPattern[] {
  if (sessions.length < minSessions) {
    return [{
      patternType: 'plateau',
      conceptTags: [],
      confidence: 0.3,
      description: '數據不足，需要更多練習才能分析學習模式',
      recommendation: '繼續練習以建立學習數據'
    }]
  }

  const patterns: LearningPattern[] = []

  // Sort sessions by timestamp
  const sortedSessions = [...sessions].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  )

  // Group by concept
  const conceptGroups = groupByConceptTags(sortedSessions)

  for (const [conceptTag, conceptSessions] of Object.entries(conceptGroups)) {
    if (conceptSessions.length < 3) continue

    const pattern = analyzeConceptPattern(conceptTag, conceptSessions)
    if (pattern) {
      patterns.push(pattern)
    }
  }

  // Identify overall patterns
  const overallPattern = analyzeOverallPattern(sortedSessions)
  if (overallPattern) {
    patterns.push(overallPattern)
  }

  return patterns
}

/**
 * Analyze pattern for a specific concept
 */
function analyzeConceptPattern(
  conceptTag: string,
  sessions: LearningSession[]
): LearningPattern | null {
  const recentSessions = sessions.slice(-5) // Last 5 attempts
  const correctCount = recentSessions.filter(s => s.isCorrect).length
  const accuracy = correctCount / recentSessions.length

  // Calculate trend
  const firstHalf = sessions.slice(0, Math.floor(sessions.length / 2))
  const secondHalf = sessions.slice(Math.floor(sessions.length / 2))

  const firstAccuracy = firstHalf.filter(s => s.isCorrect).length / firstHalf.length
  const secondAccuracy = secondHalf.filter(s => s.isCorrect).length / secondHalf.length

  const trend = secondAccuracy - firstAccuracy

  // Mastery pattern: high accuracy and improving
  if (accuracy >= 0.8 && trend >= 0) {
    return {
      patternType: 'mastery',
      conceptTags: [conceptTag],
      confidence: Math.min(0.9, accuracy),
      description: `${conceptTag} 已經掌握得很好！正確率達 ${Math.round(accuracy * 100)}%`,
      recommendation: '可以降低此概念的練習頻率，專注在其他弱項'
    }
  }

  // Struggle pattern: low accuracy and not improving
  if (accuracy < 0.5 && trend <= 0) {
    return {
      patternType: 'struggle',
      conceptTags: [conceptTag],
      confidence: 0.8,
      description: `${conceptTag} 仍需加強，正確率只有 ${Math.round(accuracy * 100)}%`,
      recommendation: '建議：1) 複習基礎概念 2) 使用提示功能 3) 降低難度'
    }
  }

  // Breakthrough pattern: was struggling but suddenly improved
  if (firstAccuracy < 0.5 && secondAccuracy >= 0.7) {
    return {
      patternType: 'breakthrough',
      conceptTags: [conceptTag],
      confidence: 0.85,
      description: `${conceptTag} 有重大突破！從 ${Math.round(firstAccuracy * 100)}% 提升到 ${Math.round(secondAccuracy * 100)}%`,
      recommendation: '繼續保持！鞏固學習成果後可以挑戰更高難度'
    }
  }

  // Plateau pattern: high accuracy but no improvement
  if (accuracy >= 0.7 && Math.abs(trend) < 0.1) {
    return {
      patternType: 'plateau',
      conceptTags: [conceptTag],
      confidence: 0.7,
      description: `${conceptTag} 進入平台期，正確率穩定在 ${Math.round(accuracy * 100)}%`,
      recommendation: '嘗試更高難度題目或相關進階概念以突破瓶頸'
    }
  }

  // Regression pattern: was good but declining
  if (firstAccuracy >= 0.7 && secondAccuracy < 0.6) {
    return {
      patternType: 'regression',
      conceptTags: [conceptTag],
      confidence: 0.75,
      description: `${conceptTag} 表現退步，從 ${Math.round(firstAccuracy * 100)}% 降到 ${Math.round(secondAccuracy * 100)}%`,
      recommendation: '需要複習！可能是遺忘或基礎不穩，建議重新學習此概念'
    }
  }

  return null
}

/**
 * Analyze overall learning pattern
 */
function analyzeOverallPattern(sessions: LearningSession[]): LearningPattern | null {
  const recentSessions = sessions.slice(-20) // Last 20 sessions
  if (recentSessions.length < 10) return null

  const accuracy = recentSessions.filter(s => s.isCorrect).length / recentSessions.length
  const avgTime = recentSessions.reduce((sum, s) => sum + s.timeSpent, 0) / recentSessions.length
  const hintUsageRate = recentSessions.filter(s => s.hintUsed).length / recentSessions.length

  // Efficient learner: high accuracy, fast, minimal hints
  if (accuracy >= 0.8 && avgTime < 12000 && hintUsageRate < 0.2) {
    return {
      patternType: 'mastery',
      conceptTags: [],
      confidence: 0.9,
      description: '你是高效學習者！正確率高、答題快、很少需要提示',
      recommendation: '可以挑戰更高難度或學習新概念'
    }
  }

  // Improving learner: using hints effectively
  if (hintUsageRate > 0.3 && accuracy >= 0.7) {
    return {
      patternType: 'breakthrough',
      conceptTags: [],
      confidence: 0.75,
      description: '你善於利用提示學習，正在穩定進步中',
      recommendation: '逐漸減少提示依賴，培養獨立解題能力'
    }
  }

  return null
}

/**
 * Calculate learning metrics from sessions
 */
export function calculateLearningMetrics(
  sessions: LearningSession[],
  timeWindowDays: number = 30
): LearningMetrics {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - timeWindowDays)

  const recentSessions = sessions.filter(s => s.timestamp >= cutoffDate)

  if (recentSessions.length === 0) {
    return getDefaultMetrics()
  }

  // Overall accuracy
  const correctCount = recentSessions.filter(s => s.isCorrect).length
  const overallAccuracy = (correctCount / recentSessions.length) * 100

  // Accuracy trend
  const halfPoint = Math.floor(recentSessions.length / 2)
  const firstHalf = recentSessions.slice(0, halfPoint)
  const secondHalf = recentSessions.slice(halfPoint)

  const firstAccuracy = firstHalf.filter(s => s.isCorrect).length / firstHalf.length
  const secondAccuracy = secondHalf.filter(s => s.isCorrect).length / secondHalf.length

  const accuracyTrend =
    secondAccuracy > firstAccuracy + 0.1 ? 'improving' :
    secondAccuracy < firstAccuracy - 0.1 ? 'declining' : 'stable'

  // Average time per question
  const averageTimePerQuestion = recentSessions.reduce((sum, s) => sum + s.timeSpent, 0) / recentSessions.length

  // Speed trend
  const firstAvgTime = firstHalf.reduce((sum, s) => sum + s.timeSpent, 0) / firstHalf.length
  const secondAvgTime = secondHalf.reduce((sum, s) => sum + s.timeSpent, 0) / secondHalf.length

  const speedTrend =
    secondAvgTime < firstAvgTime * 0.9 ? 'faster' :
    secondAvgTime > firstAvgTime * 1.1 ? 'slower' : 'stable'

  // Learning velocity (concepts mastered per week)
  const conceptGroups = groupByConceptTags(recentSessions)
  const masteredConcepts = Object.entries(conceptGroups).filter(([_, sessions]) => {
    const recent = sessions.slice(-3)
    return recent.filter(s => s.isCorrect).length >= 2
  }).length

  const weeksInWindow = timeWindowDays / 7
  const learningVelocity = masteredConcepts / weeksInWindow

  // Retention rate (performance on reviews)
  const reviews = recentSessions.filter(s => s.wasReview)
  const retentionRate = reviews.length > 0
    ? (reviews.filter(s => s.isCorrect).length / reviews.length) * 100
    : 0

  // Review efficiency
  const reviewEfficiency = retentionRate

  // Optimal study patterns
  const sessionsByHour = groupSessionsByHour(recentSessions)
  const bestTimeOfDay = findBestTimeOfDay(sessionsByHour)

  const avgSessionLength = calculateAverageSessionLength(recentSessions)
  const optimalSessionLength = Math.round(avgSessionLength)

  const totalMinutes = recentSessions.reduce((sum, s) => sum + s.timeSpent, 0) / 60000
  const optimalStudyTime = Math.round(totalMinutes / timeWindowDays)

  // Preferred difficulty
  const avgDifficulty = recentSessions.reduce((sum, s) => sum + s.difficulty, 0) / recentSessions.length
  const preferredDifficulty = Math.round(avgDifficulty)

  return {
    overallAccuracy,
    accuracyTrend,
    averageTimePerQuestion,
    speedTrend,
    learningVelocity,
    retentionRate,
    reviewEfficiency,
    optimalStudyTime,
    optimalSessionLength,
    bestTimeOfDay,
    preferredDifficulty
  }
}

/**
 * Predict future performance for concepts
 */
export function predictPerformance(
  conceptTag: string,
  sessions: LearningSession[],
  currentMastery: number
): PerformancePrediction {
  const conceptSessions = sessions.filter(s => s.conceptTags.includes(conceptTag))

  if (conceptSessions.length < 3) {
    return {
      conceptTag,
      currentMastery,
      predictedMasteryIn7Days: currentMastery,
      predictedMasteryIn14Days: currentMastery,
      predictedMasteryIn30Days: currentMastery,
      confidence: 0.3,
      recommendation: '數據不足，需要更多練習才能準確預測'
    }
  }

  // Calculate learning rate
  const sortedSessions = [...conceptSessions].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  )

  const firstSession = sortedSessions[0]
  const lastSession = sortedSessions[sortedSessions.length - 1]
  const daysBetween = (lastSession.timestamp.getTime() - firstSession.timestamp.getTime()) / (1000 * 60 * 60 * 24)

  const firstAccuracy = sortedSessions.slice(0, 3).filter(s => s.isCorrect).length / 3
  const lastAccuracy = sortedSessions.slice(-3).filter(s => s.isCorrect).length / 3

  const learningRate = daysBetween > 0 ? (lastAccuracy - firstAccuracy) / daysBetween : 0

  // Predict with decay for no practice
  const decayRate = 0.02 // 2% decay per week without practice

  const predict7Days = Math.min(100, Math.max(0, currentMastery + learningRate * 7 * 100))
  const predict14Days = Math.min(100, Math.max(0, currentMastery + learningRate * 14 * 100))
  const predict30Days = Math.min(100, Math.max(0, currentMastery + learningRate * 30 * 100))

  // Confidence based on data points and consistency
  const variance = calculateVariance(sortedSessions.map(s => s.isCorrect ? 1 : 0))
  const confidence = Math.min(0.95, (conceptSessions.length / 20) * (1 - variance))

  // Generate recommendation
  let recommendation = ''
  if (learningRate > 0.05) {
    recommendation = '進步很快！繼續保持練習頻率'
  } else if (learningRate > 0) {
    recommendation = '穩定進步中，可以稍微增加練習量加速掌握'
  } else if (learningRate < -0.02) {
    recommendation = '⚠️ 表現退步，建議增加練習頻率並複習基礎'
  } else {
    recommendation = '維持目前的練習節奏'
  }

  return {
    conceptTag,
    currentMastery,
    predictedMasteryIn7Days: predict7Days,
    predictedMasteryIn14Days: predict14Days,
    predictedMasteryIn30Days: predict30Days,
    confidence,
    recommendation
  }
}

// Helper functions

function groupByConceptTags(sessions: LearningSession[]): Record<string, LearningSession[]> {
  const groups: Record<string, LearningSession[]> = {}

  for (const session of sessions) {
    for (const tag of session.conceptTags) {
      if (!groups[tag]) {
        groups[tag] = []
      }
      groups[tag].push(session)
    }
  }

  return groups
}

function groupSessionsByHour(sessions: LearningSession[]): Record<number, LearningSession[]> {
  const groups: Record<number, LearningSession[]> = {}

  for (const session of sessions) {
    const hour = session.timestamp.getHours()
    if (!groups[hour]) {
      groups[hour] = []
    }
    groups[hour].push(session)
  }

  return groups
}

function findBestTimeOfDay(sessionsByHour: Record<number, LearningSession[]>): 'morning' | 'afternoon' | 'evening' | 'unknown' {
  const hourRanges = {
    morning: [6, 12],
    afternoon: [12, 18],
    evening: [18, 24]
  }

  const performance: Record<string, { count: number; accuracy: number }> = {
    morning: { count: 0, accuracy: 0 },
    afternoon: { count: 0, accuracy: 0 },
    evening: { count: 0, accuracy: 0 }
  }

  for (const [hourStr, sessions] of Object.entries(sessionsByHour)) {
    const hour = parseInt(hourStr)
    let timeRange = 'unknown'

    if (hour >= hourRanges.morning[0] && hour < hourRanges.morning[1]) timeRange = 'morning'
    else if (hour >= hourRanges.afternoon[0] && hour < hourRanges.afternoon[1]) timeRange = 'afternoon'
    else if (hour >= hourRanges.evening[0] || hour < 6) timeRange = 'evening'

    if (timeRange !== 'unknown') {
      performance[timeRange].count += sessions.length
      performance[timeRange].accuracy += sessions.filter(s => s.isCorrect).length / sessions.length
    }
  }

  // Find best time
  let bestTime: 'morning' | 'afternoon' | 'evening' | 'unknown' = 'unknown'
  let bestScore = 0

  for (const [time, data] of Object.entries(performance)) {
    if (data.count > 0) {
      const avgAccuracy = data.accuracy / data.count
      const score = avgAccuracy * data.count // Weighted by sample size
      if (score > bestScore) {
        bestScore = score
        bestTime = time as 'morning' | 'afternoon' | 'evening'
      }
    }
  }

  return bestTime
}

function calculateAverageSessionLength(sessions: LearningSession[]): number {
  if (sessions.length === 0) return 30

  // Group sessions by day
  const sessionsByDay: Record<string, LearningSession[]> = {}

  for (const session of sessions) {
    const dateKey = session.timestamp.toISOString().split('T')[0]
    if (!sessionsByDay[dateKey]) {
      sessionsByDay[dateKey] = []
    }
    sessionsByDay[dateKey].push(session)
  }

  // Calculate session lengths
  const sessionLengths: number[] = []

  for (const daySessions of Object.values(sessionsByDay)) {
    const sorted = daySessions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    const totalTime = sorted.reduce((sum, s) => sum + s.timeSpent, 0)
    sessionLengths.push(totalTime / 60000) // Convert to minutes
  }

  return sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length
}

function getDefaultMetrics(): LearningMetrics {
  return {
    overallAccuracy: 0,
    accuracyTrend: 'stable',
    averageTimePerQuestion: 0,
    speedTrend: 'stable',
    learningVelocity: 0,
    retentionRate: 0,
    reviewEfficiency: 0,
    optimalStudyTime: 30,
    optimalSessionLength: 30,
    bestTimeOfDay: 'unknown',
    preferredDifficulty: 3
  }
}
