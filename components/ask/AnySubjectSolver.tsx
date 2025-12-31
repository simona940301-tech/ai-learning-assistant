'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SolveInput from '@/components/solve/SolveInput'
import ViewChips from '@/components/solve/ViewChips'
import ExplainCardV2 from '@/apps/web/components/solve/ExplainCardV2'
import SimilarCard from '@/components/solve/SimilarCard'
import KeyPointsCard from '@/components/solve/KeyPointsCard'
import ProgressToast from '@/components/solve/ProgressToast'
import LoadingState from '@/components/solve/LoadingState'
import type { SolveUIState, SolveView, ExplainResult, SimilarResult, KeyPointsResult } from '@/lib/solve-types'

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

interface HybridResponse {
  explanation: ExplainResult
  meta: SolverMeta
}

export default function AnySubjectSolver() {
  const [state, setState] = useState<SolveUIState>({
    view: 'explain',
    isLoading: false,
    progress: null,
    error: null,
    explainResult: null,
    similarResult: null,
    keyPointsResult: null,
  })
  const [meta, setMeta] = useState<SolverMeta | null>(null)
  const [detailsExpanded, setDetailsExpanded] = useState<Record<string, boolean>>({})
  const [shortcutsEnabled, setShortcutsEnabled] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [currentInputText, setCurrentInputText] = useState<string>('')
  const [explainCardLoading, setExplainCardLoading] = useState(false)

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

  const setProgress = (current: number, total: number, message: string) => {
    setState((prev) => ({ ...prev, progress: { current, total, message } }))
  }

  const clearProgress = () => {
    setState((prev) => ({ ...prev, progress: null }))
  }

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) return

      setCurrentInputText(text)
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        explainResult: null,
        similarResult: null,
        keyPointsResult: null,
      }))

      try {
        // ExplainCardV2 會自己處理詳解生成，這裡只處理相似題和重點
        // 先獲取 subject hint（簡化版，只為了相似題和重點）
        setProgress(1, 2, '檢索相似題中...')
        const solverRes = await fetch('/api/ai/route-solver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionText: text }),
        })
        const solverJson: HybridResponse = await solverRes.json()
        if (!solverRes.ok) {
          throw new Error((solverJson as any)?.message || 'Hybrid solver failed')
        }

        setMeta(solverJson.meta)
        setShortcutsEnabled(solverJson.meta.config.EnableKeyboardShortcuts)

        const similarRes = await fetch('/api/exec/similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalQuestion: solverJson.meta.retrieval.baseQuery || text,
            subject: solverJson.meta.subjectHint,
            difficulty: 'mixed',
            count: 3,
            skillTags: solverJson.meta.retrieval.tags,
            sources: ['backpack', 'past_papers'],
          }),
        })
        const similarJson = await similarRes.json()
        if (!similarRes.ok) throw new Error(similarJson?.message || 'Similar executor failed')

        setState((prev) => ({
          ...prev,
          similarResult: similarJson.result as SimilarResult,
        }))

        setProgress(2, 2, '整理重點中...')
        const keypointsRes = await fetch('/api/exec/keypoints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionText: solverJson.meta.retrieval.baseQuery || text,
            subject: solverJson.meta.subjectHint,
            target: 'exam_tips',
            maxBullets: 5,
          }),
        })
        const keypointsJson = await keypointsRes.json()
        if (!keypointsRes.ok) throw new Error(keypointsJson?.message || 'Key points executor failed')

        setState((prev) => ({
          ...prev,
          keyPointsResult: keypointsJson.result as KeyPointsResult,
          isLoading: false,
        }))
        clearProgress()
        console.log(`✅ Solve preview updated ${new Date().toLocaleTimeString()}`)
      } catch (error) {
        console.error('[any-subject] error:', error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
        clearProgress()
      }
    },
    []
  )

  const handleViewChange = (view: SolveView) => {
    if (view === state.view) return
    setState((prev) => ({ ...prev, view }))
    console.log('[event] solve_view_changed', { view })
    if (view === 'similar') {
      console.log('[event] similar_clicked', { questionId: meta?.questionId })
    }
  }

  const handleAddToQuiz = async (questionIds: string[]) => {
    console.log('[solve] Adding to quiz:', questionIds)
    alert(`已加入 ${questionIds.length} 題到題組`)
  }

  const currentQuestionId = meta?.questionId
  const isDetailsExpanded = currentQuestionId ? detailsExpanded[currentQuestionId] ?? false : true
  const toggleDetails = () => {
    if (!currentQuestionId) return
    setDetailsExpanded((prev) => ({
      ...prev,
      [currentQuestionId]: !prev[currentQuestionId],
    }))
  }

  useEffect(() => {
    if (!shortcutsEnabled || inputFocused) return

    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const mapping: Record<string, SolveView> = { Digit1: 'explain', Digit2: 'similar', Digit3: 'keypoints' }
      if (mapping[event.code]) {
        event.preventDefault()
        const target = mapping[event.code]
        const allowed =
          (target === 'explain' && currentInputText) ||
          (target === 'similar' && state.similarResult) ||
          (target === 'keypoints' && state.keyPointsResult)
        if (allowed) handleViewChange(target as SolveView)
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault()
        const views: SolveView[] = ['explain', 'similar', 'keypoints']
        const available = views.filter(
          (view) =>
            (view === 'explain' && currentInputText) ||
            (view === 'similar' && state.similarResult) ||
            (view === 'keypoints' && state.keyPointsResult)
        )
        const idx = available.indexOf(state.view)
        if (idx === -1) return
        const nextIdx = event.key === 'ArrowRight' ? (idx + 1) % available.length : (idx - 1 + available.length) % available.length
        handleViewChange(available[nextIdx])
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcutsEnabled, inputFocused, state.view, currentInputText, state.similarResult, state.keyPointsResult])

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
        立即獲得詳解、相似題和重點整理
      </p>
      <div className="flex flex-wrap gap-2 justify-center mt-6">
        <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">💡 詳解</div>
        <div className="px-3 py-1.5 bg-accent text-accent-foreground rounded-full text-sm font-medium">📚 相似題</div>
        <div className="px-3 py-1.5 bg-secondary text-foreground rounded-full text-sm font-medium">⭐ 重點</div>
      </div>
    </motion.div>
  )

  const renderError = state.error && (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m-4 p-4 rounded-lg border border-destructive/40 bg-destructive/10">
      <div className="text-destructive font-medium">❌ 處理失敗</div>
      <div className="text-sm text-destructive mt-1">{state.error}</div>
    </motion.div>
  )

  return (
    <div className="min-h-[70vh] bg-background text-foreground pb-52">
      {state.progress && (
        <ProgressToast current={state.progress.current} total={state.progress.total} message={state.progress.message} />
      )}

      {currentInputText || state.similarResult || state.keyPointsResult ? (
        <ViewChips
          currentView={state.view}
          onViewChange={handleViewChange}
          hasExplain={!!currentInputText}
          hasSimilar={!!state.similarResult}
          hasKeyPoints={!!state.keyPointsResult}
        />
      ) : null}

      <div className="max-w-2xl mx-auto px-4">
        {!currentInputText && !state.similarResult && !state.keyPointsResult && !state.isLoading && renderEmpty}

        {state.isLoading && <LoadingState />}

        {renderError}

        <AnimatePresence mode="wait">
          {state.view === 'explain' && currentInputText && (
            <motion.div key="explain" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <ExplainCardV2
                inputText={currentInputText}
                questionId={meta?.questionId}
                onLoadingChange={setExplainCardLoading}
              />
            </motion.div>
          )}

          {state.view === 'similar' && state.similarResult && (
            <motion.div key="similar" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <SimilarCard result={state.similarResult} onAddToQuiz={handleAddToQuiz} />
            </motion.div>
          )}

          {state.view === 'keypoints' && state.keyPointsResult && (
            <motion.div key="keypoints" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <KeyPointsCard result={state.keyPointsResult} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SolveInput onSubmit={handleSubmit} isLoading={state.isLoading} onFocusChange={setInputFocused} />
    </div>
  )
}
