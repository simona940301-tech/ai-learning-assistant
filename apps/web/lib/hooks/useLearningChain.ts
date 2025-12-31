'use client'

/**
 * useLearningChain - Learning flow navigation hook
 *
 * Provides unified navigation for the learning chain:
 * Battle → Explanation → Wrong Book → Backpack
 *
 * This hook encapsulates the navigation logic and tracking for the
 * complete learning journey, ensuring consistent UX across the app.
 */

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export interface QuestionContext {
  questionId?: string
  questionText?: string
  userAnswer?: string
  correctAnswer?: string
  explanation?: string
  subject?: string
  difficulty?: number
  timestamp?: number
}

export interface BattleContext {
  battleId?: string
  opponentName?: string
  result?: 'win' | 'loss' | 'draw'
  score?: number
}

export interface NavigationOptions {
  replace?: boolean // Use router.replace instead of router.push
  scrollToTop?: boolean // Scroll to top after navigation
  preserveQuery?: boolean // Preserve existing query params
}

export function useLearningChain() {
  const router = useRouter()

  /**
   * Navigate to explanation page for a question
   * Typically called after answering a question incorrectly in Battle
   */
  const goToExplanation = useCallback(
    (context: QuestionContext, options?: NavigationOptions) => {
      const { questionId, subject, userAnswer, correctAnswer } = context
      const { replace = false, scrollToTop = true } = options || {}

      if (!questionId) {
        console.warn('goToExplanation: questionId is required')
        return
      }

      // Build query params
      const params = new URLSearchParams()
      if (subject) params.set('subject', subject)
      if (userAnswer) params.set('userAnswer', userAnswer)
      if (correctAnswer) params.set('correctAnswer', correctAnswer)

      const url = `/ask?questionId=${questionId}${params.toString() ? `&${params.toString()}` : ''}`

      if (replace) {
        router.replace(url)
      } else {
        router.push(url)
      }

      if (scrollToTop && typeof window !== 'undefined') {
        setTimeout(() => window.scrollTo(0, 0), 100)
      }
    },
    [router]
  )

  /**
   * Navigate to wrong book (error book) page
   * Shows all questions the user got wrong for review
   */
  const goToWrongBook = useCallback(
    (context?: { subject?: string; difficulty?: number }, options?: NavigationOptions) => {
      const { subject, difficulty } = context || {}
      const { replace = false, scrollToTop = true } = options || {}

      // Build query params
      const params = new URLSearchParams()
      if (subject) params.set('subject', subject)
      if (difficulty) params.set('difficulty', difficulty.toString())

      const url = `/error-book${params.toString() ? `?${params.toString()}` : ''}`

      if (replace) {
        router.replace(url)
      } else {
        router.push(url)
      }

      if (scrollToTop && typeof window !== 'undefined') {
        setTimeout(() => window.scrollTo(0, 0), 100)
      }
    },
    [router]
  )

  /**
   * Navigate to backpack page
   * Shows saved notes and study materials
   */
  const goToBackpack = useCallback(
    (context?: { noteId?: string; filter?: string }, options?: NavigationOptions) => {
      const { noteId, filter } = context || {}
      const { replace = false, scrollToTop = true } = options || {}

      // Build query params
      const params = new URLSearchParams()
      if (noteId) params.set('noteId', noteId)
      if (filter) params.set('filter', filter)

      const url = `/backpack${params.toString() ? `?${params.toString()}` : ''}`

      if (replace) {
        router.replace(url)
      } else {
        router.push(url)
      }

      if (scrollToTop && typeof window !== 'undefined') {
        setTimeout(() => window.scrollTo(0, 0), 100)
      }
    },
    [router]
  )

  /**
   * Navigate back to battle/play page
   * Typically called after reviewing explanations or wrong book
   */
  const goToBattle = useCallback(
    (options?: NavigationOptions) => {
      const { replace = false } = options || {}

      if (replace) {
        router.replace('/play')
      } else {
        router.push('/play')
      }
    },
    [router]
  )

  /**
   * Complete learning chain navigation
   * Tracks the full journey: Battle → Explanation → Review → Back to Battle
   */
  const completeChain = useCallback(
    (context: {
      from: 'battle' | 'explanation' | 'wrongbook' | 'backpack'
      questionContext?: QuestionContext
      battleContext?: BattleContext
    }) => {
      const { from, questionContext, battleContext } = context

      // Log for analytics/tracking
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('learningChainComplete', {
            detail: { from, questionContext, battleContext, timestamp: Date.now() },
          })
        )
      }

      // Default behavior: return to battle
      goToBattle({ replace: false })
    },
    [goToBattle]
  )

  return {
    goToExplanation,
    goToWrongBook,
    goToBackpack,
    goToBattle,
    completeChain,
  }
}

/**
 * Hook for tracking learning chain progress
 * Can be used to show progress indicators or achievements
 */
export function useLearningChainTracking() {
  const trackStep = useCallback(
    (step: 'battle_start' | 'battle_end' | 'explanation_viewed' | 'wrongbook_reviewed' | 'note_saved') => {
      if (typeof window === 'undefined') return

      const sessionKey = 'learning_chain_session'
      const session = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')

      const timestamp = Date.now()
      session[step] = timestamp

      // Calculate session duration if we have both start and end
      if (step === 'battle_end' && session.battle_start) {
        session.duration = timestamp - session.battle_start
      }

      sessionStorage.setItem(sessionKey, JSON.stringify(session))

      // Dispatch event for other components to listen
      window.dispatchEvent(
        new CustomEvent('learningChainStep', {
          detail: { step, timestamp, session },
        })
      )
    },
    []
  )

  const clearSession = useCallback(() => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem('learning_chain_session')
  }, [])

  return {
    trackStep,
    clearSession,
  }
}
