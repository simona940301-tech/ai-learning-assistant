'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import InputDock from '@/components/ask/InputDock'
import ExplainCardV2 from '@/components/solve/ExplainCardV2'
import type { ExplainMode } from '@/lib/types'
import type { SimilarResult } from '@/lib/solve-types'

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
  const [currentQuestionText, setCurrentQuestionText] = useState('')
  const [explainMode, setExplainMode] = useState<ExplainMode>('fast')
  const [inputValue, setInputValue] = useState('')
  const [ocrStatus, setOcrStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isExplainLoading, setIsExplainLoading] = useState(false)
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const lastPrefillSignature = useRef<string | null>(null)

  // Note: ExplainCardV2 handles its own loading state and API calls internally

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
    async (text: string, options?: { questionId?: string | null }) => {
      if (!text.trim()) return

      // Note: ExplainCardV2 handles its own request lifecycle and loading states
      console.log('[AnySubjectSolver] request.start', { question: text.substring(0, 50) + '...' })

      // Reset state
      setCurrentQuestionText('')
      setState({
        error: null,
        similarResult: null,
      })

      try {
        setIsExplainLoading(true)
        // Set question text - ExplainCardV2 will handle the API call and 4-phase loading internally
        setCurrentQuestionText(text)
        setCurrentQuestionId(options?.questionId ?? null)
        
        console.log('[AnySubjectSolver] ✅ Question set, ExplainCardV2 will handle explanation via /api/explain')
      } catch (error) {
        console.error('[AnySubjectSolver] request.error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
        setCurrentQuestionText('')
        setIsExplainLoading(false)
      }
    },
    []
  )

  const handleDockSubmit = useCallback(
    async (text: string) => {
      setOcrStatus(null)
      await handleSubmit(text)
    },
    [handleSubmit]
  )

  useEffect(() => {
    if (!searchParams) return
    const questionParam = searchParams.get('question')
    const questionIdParam = searchParams.get('questionId')

    if (!questionParam) {
      lastPrefillSignature.current = null
      return
    }

    const signature = `${questionIdParam || 'no-id'}::${questionParam}`
    if (lastPrefillSignature.current === signature) return
    lastPrefillSignature.current = signature

    setInputValue(questionParam)
    handleSubmit(questionParam, { questionId: questionIdParam })
    router.replace('/ask')
  }, [searchParams, handleSubmit, router])

  // 🚫 Removed handleViewChange and keyboard shortcuts - no longer needed without chips

  const renderEmpty = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full flex-col items-center justify-center text-center text-muted-foreground"
    >
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
      className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
    >
      <div className="text-destructive font-medium">❌ 處理失敗</div>
      <div className="text-sm text-destructive mt-1">{state.error}</div>
    </motion.div>
  )

  const shouldRenderEmpty = !currentQuestionText && !state.similarResult

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4">
          <div className="flex-1 overflow-y-auto">
            {shouldRenderEmpty && renderEmpty}

            <AnimatePresence mode="wait">
              {currentQuestionText && (
                <motion.div
                  key="explain-card-v2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                >
                  <ExplainCardV2
                    inputText={currentQuestionText}
                    questionId={currentQuestionId || undefined}
                    mode={explainMode}
                    onModeChange={setExplainMode}
                    onLoadingChange={setIsExplainLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {renderError}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">
        <InputDock
          mode="single"
          value={inputValue}
          isBusy={isExplainLoading}
          ocrStatus={ocrStatus}
          onChange={setInputValue}
          onSubmit={handleDockSubmit}
          onOcrComplete={setOcrStatus}
        />
      </div>
    </div>
  )
}
