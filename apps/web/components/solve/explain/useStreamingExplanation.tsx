'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ExplainCard } from '@/lib/contracts/explain'

interface StreamingEvent {
  type: 'status' | 'text' | 'question' | 'complete' | 'error' | 'done'
  data: any
}

export function useStreamingExplanation(questionText: string) {
  const [card, setCard] = useState<ExplainCard | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStage, setCurrentStage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const startStreaming = useCallback(async () => {
    if (!questionText.trim() || isStreaming) return

    // Abort previous stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsStreaming(true)
    setError(null)
    setStreamingText('')
    setCard(null)
    setCurrentStage('starting')

    try {
      const response = await fetch('/api/ai/route-solver-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const event: StreamingEvent = JSON.parse(line.slice(6))

            if (event.type === 'status') {
              setCurrentStage(event.data.stage || event.data.message || '')
            } else if (event.type === 'text') {
              setStreamingText((prev) => prev + event.data.chunk)
            } else if (event.type === 'question') {
              // Individual question complete
              setCurrentStage(`完成第 ${event.data.index + 1} 題`)
            } else if (event.type === 'complete') {
              setCard(event.data.card)
              setIsStreaming(false)
            } else if (event.type === 'error') {
              setError(event.data.message || 'Streaming error')
              setIsStreaming(false)
            } else if (event.type === 'done') {
              setIsStreaming(false)
            }
          } catch (err) {
            console.warn('[Streaming] Parse error:', err, 'Line:', line)
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
      setIsStreaming(false)
    }
  }, [questionText, isStreaming])

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
  }, [])

  useEffect(() => {
    return () => {
      stopStreaming()
    }
  }, [stopStreaming])

  return {
    card,
    streamingText,
    isStreaming,
    currentStage,
    error,
    startStreaming,
    stopStreaming,
  }
}
