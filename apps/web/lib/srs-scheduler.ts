/**
 * Spaced Repetition System (SRS) Scheduler
 *
 * Implements the SM-2 (SuperMemo 2) algorithm with enhancements:
 * - Ebbinghaus forgetting curve integration
 * - Response time consideration
 * - Difficulty-based adjustments
 * - Confidence interval tracking
 */

export interface SRSCard {
  consecutiveCorrect: number
  easeFactor: number
  intervalDays: number
  lastReviewedAt: Date | null
  nextReviewAt: Date | null
}

export interface SRSReview {
  quality: number // 0-5 rating (0 = complete blackout, 5 = perfect recall)
  responseTimeMs: number
  isCorrect: boolean
}

export interface SRSUpdate {
  newEaseFactor: number
  newInterval: number
  newConsecutiveCorrect: number
  nextReviewAt: Date
  confidence: number // 0-1, how confident we are in the retention
}

/**
 * Calculate quality rating based on correctness and response time
 *
 * @param isCorrect - Whether the answer was correct
 * @param responseTimeMs - Time taken to answer in milliseconds
 * @param expectedTimeMs - Expected time for this difficulty (default 15s)
 * @returns Quality rating (0-5)
 */
export function calculateQuality(
  isCorrect: boolean,
  responseTimeMs: number,
  expectedTimeMs: number = 15000
): number {
  if (!isCorrect) {
    // Incorrect answers: 0-2
    // If answered quickly but wrong, might be a careless mistake (quality 2)
    // If took long and still wrong, complete misunderstanding (quality 0)
    if (responseTimeMs < expectedTimeMs * 0.5) {
      return 2 // Quick but wrong - careless mistake
    } else if (responseTimeMs < expectedTimeMs) {
      return 1 // Normal time but wrong
    } else {
      return 0 // Slow and wrong - complete blackout
    }
  }

  // Correct answers: 3-5
  const timeRatio = responseTimeMs / expectedTimeMs

  if (timeRatio < 0.5) {
    return 5 // Perfect recall - very quick
  } else if (timeRatio < 0.8) {
    return 4 // Good recall - quick
  } else if (timeRatio < 1.2) {
    return 3 // Hesitant recall - normal time
  } else {
    return 3 // Correct but slow - still counts as hesitant recall
  }
}

/**
 * Update SRS card using SM-2 algorithm with enhancements
 *
 * @param card - Current card state
 * @param review - Review result
 * @returns Updated card parameters
 */
export function updateSRSCard(card: SRSCard, review: SRSReview): SRSUpdate {
  const quality = review.quality

  let newEaseFactor = card.easeFactor
  let newInterval = card.intervalDays
  let newConsecutiveCorrect = card.consecutiveCorrect

  // SM-2 Algorithm
  if (quality >= 3) {
    // Correct answer
    newConsecutiveCorrect += 1

    // Update ease factor
    newEaseFactor = Math.max(
      1.3,
      card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )

    // Calculate new interval
    if (newConsecutiveCorrect === 1) {
      newInterval = 1
    } else if (newConsecutiveCorrect === 2) {
      newInterval = 6
    } else {
      newInterval = Math.round(card.intervalDays * newEaseFactor)
    }
  } else {
    // Incorrect answer - reset
    newConsecutiveCorrect = 0
    newEaseFactor = Math.max(1.3, card.easeFactor - 0.2)
    newInterval = 1
  }

  // Cap maximum interval at 180 days (6 months)
  newInterval = Math.min(newInterval, 180)

  // Calculate next review date
  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval)

  // Calculate confidence using forgetting curve
  // Confidence decreases exponentially over time
  const daysSinceReview = card.lastReviewedAt
    ? (Date.now() - card.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
    : 0

  // Ebbinghaus forgetting curve: R(t) = e^(-t/S)
  // S (stability) is related to ease factor and interval
  const stability = newInterval * (newEaseFactor / 2.5) // Normalize to default ease factor
  const retention = Math.exp(-daysSinceReview / stability)
  const confidence = Math.max(0, Math.min(1, retention))

  return {
    newEaseFactor,
    newInterval,
    newConsecutiveCorrect,
    nextReviewAt,
    confidence
  }
}

/**
 * Get cards due for review
 *
 * @param cards - All cards with their SRS data
 * @param now - Current date (for testing purposes)
 * @returns Cards that are due for review, sorted by priority
 */
export function getDueCards<T extends SRSCard>(
  cards: T[],
  now: Date = new Date()
): T[] {
  return cards
    .filter(card => {
      // Card is due if:
      // 1. Never reviewed (nextReviewAt is null)
      // 2. nextReviewAt is in the past
      return !card.nextReviewAt || card.nextReviewAt <= now
    })
    .sort((a, b) => {
      // Priority sorting:
      // 1. Cards that are overdue by most days
      // 2. Cards with lowest ease factor (struggling cards)
      // 3. Never reviewed cards first

      const aDaysOverdue = a.nextReviewAt
        ? (now.getTime() - a.nextReviewAt.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity

      const bDaysOverdue = b.nextReviewAt
        ? (now.getTime() - b.nextReviewAt.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity

      // First, prioritize never-reviewed cards
      if (!a.lastReviewedAt && b.lastReviewedAt) return -1
      if (a.lastReviewedAt && !b.lastReviewedAt) return 1

      // Then, prioritize most overdue
      if (Math.abs(aDaysOverdue - bDaysOverdue) > 0.5) {
        return bDaysOverdue - aDaysOverdue
      }

      // Finally, prioritize cards with lower ease factor (struggling)
      return a.easeFactor - b.easeFactor
    })
}

/**
 * Get optimal review distribution for a study session
 *
 * @param totalCards - Total number of cards available
 * @param targetReviews - Target number of reviews for this session
 * @returns Recommended distribution of new vs review cards
 */
export function getReviewDistribution(
  totalCards: number,
  dueCards: number,
  targetReviews: number
): {
  newCards: number
  reviewCards: number
  optimal: boolean
} {
  // Optimal distribution: 70% reviews, 30% new cards
  const optimalReviewRatio = 0.7

  let reviewCards = Math.min(dueCards, Math.ceil(targetReviews * optimalReviewRatio))
  let newCards = Math.min(totalCards - dueCards, targetReviews - reviewCards)

  // If we don't have enough due cards, add more new cards
  if (reviewCards < targetReviews * optimalReviewRatio) {
    const shortage = Math.ceil(targetReviews * optimalReviewRatio) - reviewCards
    newCards = Math.min(totalCards - dueCards, newCards + shortage)
  }

  const optimal = reviewCards >= targetReviews * optimalReviewRatio

  return {
    newCards,
    reviewCards,
    optimal
  }
}

/**
 * Predict retention rate based on SRS parameters
 *
 * @param card - SRS card data
 * @param targetDate - Date to predict retention for
 * @returns Predicted retention rate (0-1)
 */
export function predictRetention(card: SRSCard, targetDate: Date = new Date()): number {
  if (!card.lastReviewedAt) {
    return 0.5 // Unknown - assume 50%
  }

  const daysSinceReview = (targetDate.getTime() - card.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)

  // Stability based on ease factor and interval
  const stability = card.intervalDays * (card.easeFactor / 2.5)

  // Ebbinghaus forgetting curve
  const retention = Math.exp(-daysSinceReview / stability)

  return Math.max(0, Math.min(1, retention))
}

/**
 * Get next N concepts to practice, optimized for learning
 *
 * @param cards - All available cards with SRS data
 * @param count - Number of cards to retrieve
 * @param includeNew - Whether to include never-practiced cards
 * @returns Optimized list of cards to practice
 */
export function getNextPracticeCards<T extends SRSCard>(
  cards: T[],
  count: number,
  includeNew: boolean = true
): T[] {
  const now = new Date()

  // Get due cards
  const dueCards = getDueCards(cards, now)

  // Get new cards (never practiced)
  const newCards = includeNew
    ? cards.filter(c => !c.lastReviewedAt).slice(0, Math.ceil(count * 0.3))
    : []

  // Combine with distribution
  const distribution = getReviewDistribution(cards.length, dueCards.length, count)

  const selectedReviews = dueCards.slice(0, distribution.reviewCards)
  const selectedNew = newCards.slice(0, distribution.newCards)

  // Interleave new and review cards for better learning
  const result: T[] = []
  const maxLength = Math.max(selectedReviews.length, selectedNew.length)

  for (let i = 0; i < maxLength; i++) {
    if (i < selectedReviews.length) {
      result.push(selectedReviews[i])
    }
    if (i < selectedNew.length) {
      result.push(selectedNew[i])
    }
  }

  return result.slice(0, count)
}
