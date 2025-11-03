import { useState, useCallback } from 'react'

interface WarmupResponse {
  phase: 'warmup'
  subject: string
  confidence: number
  detected_keypoint: string
  session_id: string
  stem: string
  options: Array<{
    option_id: string
    label: string
  }>
  answer_index: number
}

interface SolveResponse {
  subject: string
  confidence: number
  detected_keypoint: string
  phase: 'solve'
  summary: string
  steps: string[]
  checks: string[]
  error_hints: string[]
  extensions: string[]
}

interface AnswerResponse {
  correct: boolean
  expected: string | null
  concept_id: string | null
  rationale: string | null
}

export function useTutorFlow() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSession, setCurrentSession] = useState<{
    sessionId: string
    subject: string
    keypoint: string
    options: WarmupResponse['options']
    selectedOptionId: string | null
  } | null>(null)

  // Step 1: Detect subject and get warmup options
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

      const data: WarmupResponse = await response.json()
      
      setCurrentSession({
        sessionId: data.session_id,
        subject: data.subject,
        keypoint: data.detected_keypoint,
        options: data.options,
        selectedOptionId: null
      })

      setIsLoading(false)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setIsLoading(false)
      throw err
    }
  }, [])

  // Step 2: Answer the warmup question
  const answerWarmup = useCallback(async (optionId: string) => {
    if (!currentSession) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tutor/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.sessionId,
          option_id: optionId,
          keypoint_id: currentSession.keypoint,
          userAnswer: optionId // Using optionId as answer
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: AnswerResponse = await response.json()
      
      setCurrentSession(prev => prev ? { ...prev, selectedOptionId: optionId } : null)
      setIsLoading(false)
      
      return {
        ...data,
        isCorrect: data.correct,
        hint: data.rationale
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setIsLoading(false)
      console.warn('Answer warmup request failed, falling back to mock payload:', errorMessage)
      setCurrentSession(prev => prev ? { ...prev, selectedOptionId: optionId } : null)
      return {
        correct: false,
        expected: null,
        concept_id: null,
        rationale: null,
        isCorrect: false,
        hint: null
      }
    }
  }, [currentSession])

  // Step 3: Get solve strategy
  const getSolveStrategy = useCallback(async (mode: 'step' | 'fast' = 'step') => {
    if (!currentSession) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/solve-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.sessionId,
          subject: currentSession.subject,
          keypoint_code: currentSession.keypoint,
          mode
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: SolveResponse = await response.json()
      setIsLoading(false)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setIsLoading(false)
      throw err
    }
  }, [currentSession])

  // Reset the flow
  const reset = useCallback(() => {
    setCurrentSession(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    isLoading,
    error,
    currentSession,
    detectAndWarmup,
    answerWarmup,
    getSolveStrategy,
    reset
  }
}
