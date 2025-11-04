'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import InputDock from '@/components/ask/InputDock'
import ExplainCard from '@/components/solve/ExplainCard'
import type { ExplainCard as ExplainCardModel } from '@/lib/contracts/explain'
import StreamingExplainPlaceholder from '@/components/solve/StreamingExplainPlaceholder'
import type { SimilarResult } from '@/lib/solve-types'
import { normalizeCard, getCardStatus } from '@/lib/explain-normalizer'

interface SolveUIState {
  error: string | null
  similarResult: SimilarResult | null
}

interface SolverMeta {
  questionId: string
  guard: { subject: 'math' | 'none'; reason: string; matchedTokens: string[] }
  experts: Array<{ subject: string; confidence: number; tags: string[]; notes: string }>
  chosen: Array<{ subject: string; confidence: number; tags: string[]; notes: string }>
  subjectHint: 'english' | 'math' | 'chinese' | 'social' | 'science' | 'unknown'
  retrieval: { baseQuery: string; tags: string[]; searchQuery: string }
  config: { ExpertThreshold: number; PickTopK: number; EnableKeyboardShortcuts: boolean }
  reason: string
}

export default function AnySubjectSolver() {
  const [state, setState] = useState<SolveUIState>({
    error: null,
    similarResult: null,
  })
  const [card, setCard] = useState<ExplainCardModel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamingStage, setStreamingStage] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [ocrStatus, setOcrStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Race condition prevention
  const latestReqId = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    console.log(`✅ Any-Subject Solver ready on /ask ${new Date().toLocaleTimeString()}`)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const logMode = (matches: boolean) => {
      console.log(`✅ Theme mode: ${matches ? 'dark' : 'light'} (system)`)
    }
    logMode(media.matches)
    const handler = (event: MediaQueryListEvent) => logMode(event.matches)
    if (media.addEventListener) {
      media.addEventListener('change', handler)
    } else {
      media.addListener(handler)
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handler)
      } else {
        media.removeListener(handler)
      }
    }
  }, [])

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      // Prevent double submission
      if (isLoading) {
        console.warn('[AnySubjectSolver] Already loading, ignoring duplicate submit')
        return
      }

      // Abort previous request
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }

      // Create new abort controller
      const controller = new AbortController()
      abortRef.current = controller

      // Generate unique request ID
      const reqId = crypto.randomUUID()
      latestReqId.current = reqId
      const started = performance.now()

      console.log('[AnySubjectSolver] request.start', { reqId, question: text.substring(0, 50) + '...' })

      // Reset state
      setCard(null)
      setIsLoading(true)
      setStreamingText('')
      setStreamingStage('')
      setState({
        error: null,
        similarResult: null,
      })

      try {
        // Use streaming endpoint for better UX (fallback to regular if needed)
        const useStreaming = process.env.NEXT_PUBLIC_USE_STREAMING !== 'false'
        
        if (useStreaming) {
          // Try streaming first
          const streamResponse = await fetch('/api/ai/route-solver-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionText: text }),
            signal: controller.signal,
          })

          if (streamResponse.ok) {
            // Handle streaming response
            const reader = streamResponse.body?.getReader()
            const decoder = new TextDecoder()

            if (reader) {
              let buffer = ''
              let finalCard: ExplainCardModel | null = null

              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue

                  try {
                    const event = JSON.parse(line.slice(6))

                    // Phase 1: Thinking stage - update messages
                    if (event.type === 'status') {
                      const stageMessage = event.data.message || event.data.stage || ''
                      setStreamingStage(stageMessage)
                      // onExplainStart hook equivalent: isLoading stays true
                    } else if (event.type === 'question') {
                      // Partial progress: question completed but still computing
                      setStreamingStage(`完成第 ${(event.data.index || 0) + 1} 題`)
                    } else if (event.type === 'complete' && event.data.card) {
                      // Phase 2: Complete - transition to typing phase
                      finalCard = event.data.card
                      // onExplainDone hook equivalent: setIsLoading(false) happens after card is set
                    } else if (event.type === 'error') {
                      throw new Error(event.data.message || 'Streaming error')
                    }
                    // Note: event.type === 'text' is now deprecated and ignored
                    // We don't want to show raw JSON during computation
                  } catch (err) {
                    console.warn('[Streaming] Parse error:', err, 'Line:', line.substring(0, 100))
                  }
                }
              }

              if (finalCard) {
                // Phase 2: Final explanation arrived - transition to typing phase
                const normalizedCard = normalizeCard(finalCard)
                
                // onExplainDone hook equivalent: Set loading to false BEFORE setting card
                // This ensures typing animation starts only after isLoading becomes false
                setIsLoading(false)
                
                // Small delay to allow thinking animation to fade out before typing starts
                setTimeout(() => {
                  setCard(normalizedCard)
                  setStreamingText('')
                  setStreamingStage('')
                }, 100)
                
                return
              } else {
                // No finalCard received - log for debugging
                console.error('[Streaming] No finalCard received after stream completion', {
                  bufferLength: buffer.length,
                  bufferPreview: buffer.substring(0, 500),
                  hasCompleteEvent: buffer.includes('"type":"complete"'),
                  hasErrorEvent: buffer.includes('"type":"error"'),
                })
                throw new Error('Streaming completed but no final card received. Check server logs for details.')
              }
            } else {
              throw new Error('Stream response body is null')
            }
          } else {
            // Stream response not OK - log error and fallback
            const errorText = await streamResponse.text().catch(() => 'Unable to read error response')
            console.error('[Streaming] Stream response error:', {
              status: streamResponse.status,
              statusText: streamResponse.statusText,
              body: errorText.substring(0, 200),
            })
            // Fall through to regular endpoint
          }
        }

        // Fallback to regular endpoint
        const response = await fetch('/api/ai/route-solver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionText: text }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`)
        }

        const solverJson = await response.json()

        // Check if this response is still valid (not outdated)
        if (latestReqId.current !== reqId) {
          console.warn('[AnySubjectSolver] response.outdated', {
            reqId,
            latest: latestReqId.current,
            elapsed: Math.round(performance.now() - started),
          })
          return
        }

        const elapsed = Math.round(performance.now() - started)

        // 🔍 DEBUG: Log raw API response structure
        console.log('[AnySubjectSolver] RAW API Response:', {
          hasExplanation: !!solverJson.explanation,
          hasCard: !!(solverJson.explanation?.card ?? solverJson.card),
          keys: Object.keys(solverJson),
          cardKeys: Object.keys(solverJson.explanation?.card ?? solverJson.card ?? {}),
          elapsed,
        })
        
        // Check for API errors in response
        if (solverJson.error) {
          throw new Error(solverJson.error.message || solverJson.error || 'API returned an error')
        }

        // Extract card from API response
        const rawCard = solverJson.explanation?.card ?? solverJson.card

        if (!rawCard) {
          console.error('[AnySubjectSolver] response.no_card', {
            reqId,
            elapsed,
            keys: Object.keys(solverJson),
          })
          throw new Error('No explanation card in API response')
        }

        // 🔥 CRITICAL: Normalize card to handle field name differences
        const normalizedCard = normalizeCard(rawCard)

        console.log('[AnySubjectSolver] ✅ Card normalized:', {
          reqId,
          elapsed,
          status: getCardStatus(normalizedCard),
          kind: normalizedCard.kind,
          hasTranslation: !!normalizedCard.translation,
          optionsCount: normalizedCard.options?.length ?? 0,
          vocabCount: normalizedCard.vocab?.length ?? 0,
          hasCorrect: !!normalizedCard.correct,
          hasReasoning: !!(normalizedCard as any).meta?.questions?.some((q: any) => q.reasoningText),
          reasoningPreview: (normalizedCard as any).meta?.questions?.[0]?.reasoningText?.substring(0, 50) || 'missing',
        })

        // Log events
        console.log('[event] guard_decision', {
          guard: solverJson.meta?.guard,
          experts: solverJson.meta?.experts,
          chosen: solverJson.meta?.chosen,
        })
        console.log('✅ Subject detection validated:', solverJson.meta?.subjectHint || solverJson.subject)

        // Set card - THIS IS THE CRITICAL STEP (now using proper ExplainCard type)
        setCard(normalizedCard)
        setIsLoading(false)
        console.log('[event] explain_rendered', { questionId: solverJson.meta?.questionId })
        console.log(`✅ Solve preview updated ${new Date().toLocaleTimeString()}`)
      } catch (error) {
        // Check if aborted
        if (controller.signal.aborted) {
          console.warn('[AnySubjectSolver] request.aborted', { reqId })
          return
        }

        console.error('[AnySubjectSolver] request.error', {
          reqId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
        setCard(null)
      } finally {
        // Only update loading state if this is still the latest request
        if (latestReqId.current === reqId) {
          setIsLoading(false)
          abortRef.current = null
        }
      }
    },
    [isLoading]
  )

  const handleDockSubmit = useCallback(
    async (text: string) => {
      setOcrStatus(null)
      await handleSubmit(text)
    },
    [handleSubmit]
  )

  // 🚫 Removed handleViewChange and keyboard shortcuts - no longer needed without chips

  const renderEmpty = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center text-muted-foreground"
    >
      <div className="text-6xl mb-4">💡</div>
      <h2 className="text-2xl font-bold text-foreground mb-2">準備好了嗎？</h2>
      <p className="mb-4 leading-relaxed">
        貼上題目或上傳圖片
        <br />
        立即獲得詳解和相似題
      </p>
    </motion.div>
  )

  const renderError = state.error && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="m-4 p-4 rounded-lg border border-destructive/40 bg-destructive/10"
    >
      <div className="text-destructive font-medium">❌ 處理失敗</div>
      <div className="text-sm text-destructive mt-1">{state.error}</div>
    </motion.div>
  )

  return (
    <div className="min-h-[70vh] bg-background text-foreground pb-input-dock">
      {/* 🚫 Removed ViewChips from card area - only page-level tabs should exist */}

      <div className="max-w-2xl mx-auto px-4">
        {!card && !state.similarResult && !isLoading && renderEmpty}

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="explain-placeholder"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <StreamingExplainPlaceholder
                streamingText={streamingText}
                currentStage={streamingStage}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {!isLoading && card && (
            <motion.div
              key={card.id ?? 'explain-card'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              <ExplainCard card={card} actionsDisabled={isLoading} />
            </motion.div>
          )}
        </AnimatePresence>

        {renderError}
      </div>

      <InputDock
        mode="single"
        value={inputValue}
        isBusy={isLoading}
        ocrStatus={ocrStatus}
        onChange={setInputValue}
        onSubmit={handleDockSubmit}
        onOcrComplete={setOcrStatus}
      />
    </div>
  )
}
