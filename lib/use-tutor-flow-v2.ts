/**
 * useTutorFlowV2: Contract v2 Compatible Tutor Flow Hook
 *
 * Manages the complete flow from question detection to detailed explanation
 * using the unified Contract v2 response format.
 */

import { useState, useCallback } from 'react'
import type { ContractV2Response } from './contract-v2'

export interface TutorSession {
  session_id: string
  subject: string
  keypoint: {
    id: string
    code: string
    name: string
    category?: string
  }
  question?: {
    stem: string
    options: Array<{
      id: string
      label: string
      is_correct?: boolean
    }>
  }
  selected_option_id?: string
}

export function useTutorFlowV2() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSession, setCurrentSession] = useState<TutorSession | null>(null)
  const [latestResponse, setLatestResponse] = useState<ContractV2Response | null>(null)

  /**
   * Step 1: Detect subject and generate warmup options
   */
  const detectAndWarmup = useCallback(async (prompt: string, subject?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/warmup/keypoint-mcq-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, subject })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: ContractV2Response = await response.json()
      setLatestResponse(data)

      // Extract session info
      if (data.session_id && data.keypoint && data.question) {
        setCurrentSession({
          session_id: data.session_id,
          subject: data.subject,
          keypoint: data.keypoint,
          question: data.question,
        })
      }

      setIsLoading(false)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setIsLoading(false)
      throw err
    }
  }, [])

  /**
   * Step 2: Answer the warmup question
   */
  const answerWarmup = useCallback(async (optionId: string) => {
    if (!currentSession) {
      throw new Error('No active session')
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tutor/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.session_id,
          option_id: optionId,
          keypoint_id: currentSession.keypoint.code,
          userAnswer: optionId,
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // Note: answer endpoint may not return Contract v2 yet
      // We'll adapt it or use the response as-is
      const data = await response.json()

      setCurrentSession(prev => prev ? { ...prev, selected_option_id: optionId } : null)
      setIsLoading(false)

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setIsLoading(false)
      console.warn('Answer warmup request failed:', errorMessage)

      // Fallback response
      setCurrentSession(prev => prev ? { ...prev, selected_option_id: optionId } : null)
      return {
        correct: false,
        expected: null,
        concept_id: null,
        rationale: null,
      }
    }
  }, [currentSession])

  /**
   * Step 3: Get detailed solve strategy
   */
  const getSolveStrategy = useCallback(async (mode: 'step' | 'fast' = 'step') => {
    if (!currentSession) {
      throw new Error('No active session')
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/solve-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.session_id,
          subject: currentSession.subject,
          keypoint_code: currentSession.keypoint.code,
          mode,
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: ContractV2Response = await response.json()
      setLatestResponse(data)
      setIsLoading(false)

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setIsLoading(false)
      throw err
    }
  }, [currentSession])

  /**
   * Reset the flow
   */
  const reset = useCallback(() => {
    setCurrentSession(null)
    setLatestResponse(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    isLoading,
    error,
    currentSession,
    latestResponse,
    detectAndWarmup,
    answerWarmup,
    getSolveStrategy,
    reset,
  }
}
