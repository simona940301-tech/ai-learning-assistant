'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
    async (text: string) => {
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
        // Set question text - ExplainCardV2 will handle the API call and 4-phase loading internally
        setCurrentQuestionText(text)
        
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
        {!currentQuestionText && !state.similarResult && renderEmpty}

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
                mode={explainMode}
                onModeChange={setExplainMode}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {renderError}
      </div>

      <InputDock
        mode="single"
        value={inputValue}
        isBusy={!!currentQuestionText}
        ocrStatus={ocrStatus}
        onChange={setInputValue}
        onSubmit={handleDockSubmit}
        onOcrComplete={setOcrStatus}
      />
    </div>
  )
}
