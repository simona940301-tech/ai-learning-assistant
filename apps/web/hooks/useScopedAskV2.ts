'use client'

import { useState, useCallback } from 'react'
import { track } from '@/lib/telemetry'

export interface ScopedAskCitation {
  page_index: number
  text: string
  score?: number
}

export interface ScopedAskResult {
  answer: string
  citations: ScopedAskCitation[]
  confidenceLow: boolean
}

/**
 * Hook for Scoped Ask AI functionality
 * Asks AI questions based on document content
 */
export function useScopedAskV2(fileId: string | null) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScopedAskResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ask = useCallback(async (
    prompt: string,
    selection?: {
      page_index: number
      start: number
      end: number
      quote: string
      prefix?: string
      suffix?: string
    }
  ) => {
    if (!fileId || !prompt.trim()) {
      setError('請輸入問題')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      track('backpack.reader.ask.submit', {
        file_id: fileId,
        has_selection: !!selection,
      })

      const response = await fetch('/api/backpack/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: selection ? 'selection' : 'file',
          file_id: fileId,
          selection: selection ? {
            page_index: selection.page_index,
            start: selection.start,
            end: selection.end,
            quote: selection.quote,
            prefix: selection.prefix,
            suffix: selection.suffix,
          } : undefined,
          prompt,
          top_k: 6,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // Handle SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let answer = ''
      const citations: ScopedAskCitation[] = []
      let confidenceLow = false

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'token') {
                  answer += data.content || ''
                  setResult({
                    answer,
                    citations,
                    confidenceLow,
                  })
                } else if (data.type === 'citation') {
                  citations.push({
                    page_index: data.page_index || 0,
                    text: data.text || '',
                    score: data.score,
                  })
                  setResult({
                    answer,
                    citations,
                    confidenceLow,
                  })
                } else if (data.type === 'confidence') {
                  confidenceLow = data.low === true
                  setResult({
                    answer,
                    citations,
                    confidenceLow,
                  })
                } else if (data.type === 'done') {
                  track('backpack.reader.ask.complete', {
                    file_id: fileId,
                    answer_length: answer.length,
                    citations_count: citations.length,
                    confidence_low: confidenceLow,
                  })
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      } else {
        // Fallback: non-streaming response
        const data = await response.json()
        setResult({
          answer: data.answer || '',
          citations: data.citations || [],
          confidenceLow: data.confidence_low || false,
        })
      }
    } catch (err) {
      console.error('[useScopedAsk] Error:', err)
      setError(err instanceof Error ? err.message : '詢問失敗')
      track('backpack.reader.ask.error', {
        file_id: fileId,
        error: err instanceof Error ? err.message : 'Unknown',
      })
    } finally {
      setLoading(false)
    }
  }, [fileId])

  const clear = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    ask,
    loading,
    result,
    error,
    clear,
  }
}
