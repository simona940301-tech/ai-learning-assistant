'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { nanoid } from 'nanoid'
import InputDock from '@/components/ask/InputDock'
import ExplainCardV2, { type ExplainCardSnapshot } from '@/components/solve/ExplainCardV2'
import ChatContainer from '@/components/ask/ChatContainer'
import { useHighlightStore } from '@/src/store/highlightStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import UserMessage from '@/components/ask/messages/UserMessage'
import AIMessage from '@/components/ask/messages/AIMessage'
import { useAsk } from '@/lib/ask-context'
import { FileText, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'

type FollowUpEntry = {
  id: string
  userText: string
  createdAt: number
  status: 'loading' | 'ready' | 'error'
  response?: string
  error?: string
}

type QuestionTurn = {
  id: string
  questionText: string
  questionId?: string | null
  createdAt: number
  snapshot?: ExplainCardSnapshot
  followups: FollowUpEntry[]
}

interface FollowUpTarget {
  turnId: string
  label: string
}

function formatSnippet(text: string, max = 42) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function buildFollowUpContext(snapshot?: ExplainCardSnapshot) {
  if (!snapshot) return undefined
  return {
    answer: snapshot.answer,
    reason: snapshot.reason,
    summary: snapshot.summary,
    markdown: snapshot.markdown,
    focus: snapshot.focus,
    questionSet: snapshot.questionSet,
  }
}

export default function AnySubjectSolver() {
  const [conversation, setConversation] = useState<QuestionTurn[]>([])
  const [cardLoading, setCardLoading] = useState<Record<string, boolean>>({})
  const [followupLoading, setFollowupLoading] = useState<Record<string, boolean>>({})
  const [activeFollowUp, setActiveFollowUp] = useState<FollowUpTarget | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [ocrStatus, setOcrStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const lastPrefillSignature = useRef<string | null>(null)
  const conversationRef = useRef<QuestionTurn[]>([])
  const { currentAnalysis } = useAsk()

  useEffect(() => {
    conversationRef.current = conversation
  }, [conversation])

  const isAnyCardLoading = useMemo(() => Object.values(cardLoading).some(Boolean), [cardLoading])
  const isFollowUpLoading = useMemo(() => Object.values(followupLoading).some(Boolean), [followupLoading])
  const isInputBusy = isAnyCardLoading || isFollowUpLoading

  const handleQuestionSubmit = useCallback(
    async (text: string, options?: { questionId?: string | null }) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const turn: QuestionTurn = {
        id: nanoid(),
        questionText: trimmed,
        questionId: options?.questionId ?? null,
        createdAt: Date.now(),
        followups: [],
      }

      setConversation((prev) => [...prev, turn])
      setCardLoading((prev) => ({ ...prev, [turn.id]: true }))
      setActiveFollowUp(null)

      console.log('[AnySubjectSolver] request.start', { turnId: turn.id, question: formatSnippet(trimmed, 64) })
    },
    []
  )

  const handleSnapshot = useCallback((turnId: string, snapshot: ExplainCardSnapshot) => {
    setConversation((prev) =>
      prev.map((turn) => (turn.id === turnId ? { ...turn, snapshot } : turn))
    )
  }, [])

  const handleCardLoading = useCallback((turnId: string, loading: boolean) => {
    setCardLoading((prev) => ({ ...prev, [turnId]: loading }))
  }, [])

  const handleFollowUpSubmit = useCallback(
    async (text: string, targetId: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const parent = conversationRef.current.find((turn) => turn.id === targetId)
      if (!parent) return

      const followupId = nanoid()
      setConversation((prev) =>
        prev.map((turn) =>
          turn.id === targetId
            ? {
              ...turn,
              followups: [
                ...turn.followups,
                { id: followupId, userText: trimmed, createdAt: Date.now(), status: 'loading' },
              ],
            }
            : turn
        )
      )
      setFollowupLoading((prev) => ({ ...prev, [targetId]: true }))

      try {
        const res = await fetch('/api/ai/followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: parent.questionText,
            followup: trimmed,
            context: buildFollowUpContext(parent.snapshot),
            ragContext: currentAnalysis ? {
              summary: currentAnalysis.quickSummary,
              concepts: currentAnalysis.coreConcepts?.map(c => c.name),
              examQuestions: currentAnalysis.examPredictions?.map(q => q.questionText)
            } : undefined
          }),
        })

        const json = await res.json()
        if (!res.ok) {
          throw new Error(json?.message || '追問生成失敗')
        }

        const replyRaw: string = json.reply?.trim() || '這題我已經回覆囉，可以再試著描述想釐清的部分～'
        const reply: string = `reminder: ${replyRaw}`

        setConversation((prev) =>
          prev.map((turn) =>
            turn.id === targetId
              ? {
                ...turn,
                followups: turn.followups.map((entry) =>
                  entry.id === followupId ? { ...entry, status: 'ready', response: reply } : entry
                ),
              }
              : turn
          )
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : '追問處理失敗'
        setConversation((prev) =>
          prev.map((turn) =>
            turn.id === targetId
              ? {
                ...turn,
                followups: turn.followups.map((entry) =>
                  entry.id === followupId ? { ...entry, status: 'error', error: message } : entry
                ),
              }
              : turn
          )
        )
      } finally {
        setFollowupLoading((prev) => ({ ...prev, [targetId]: false }))
        setActiveFollowUp(null)
      }
    },
    [currentAnalysis]
  )

  const handleDockSubmit = useCallback(
    async (text: string) => {
      setOcrStatus(null)
      if (activeFollowUp) {
        await handleFollowUpSubmit(text, activeFollowUp.turnId)
      } else {
        await handleQuestionSubmit(text)
      }
    },
    [activeFollowUp, handleFollowUpSubmit, handleQuestionSubmit]
  )

  const activateFollowUp = useCallback((turn: QuestionTurn, index: number) => {
    setActiveFollowUp({
      turnId: turn.id,
      label: `第 ${index + 1} 題｜${formatSnippet(turn.questionText)}`,
    })
  }, [])

  useEffect(() => {
    console.log(`✅ Any-Subject Solver ready on /ask ${new Date().toLocaleTimeString()}`)
  }, [])

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
    handleQuestionSubmit(questionParam, { questionId: questionIdParam })
    setInputValue('')
    router.replace('/ask')
  }, [searchParams, handleQuestionSubmit, router])

  const shouldRenderEmpty = conversation.length === 0
  const followUpPlaceholder = activeFollowUp
    ? '追問這題：例如「為什麼不是 B？」或「再給我一個例子」'
    : undefined

  const renderEmpty = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-card/50 px-6 py-12 text-center text-muted-foreground"
    >
      <div className="text-4xl mb-4">💬</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">開始一段學習對話</h2>
      <p className="text-sm leading-6 text-muted-foreground/90">
        貼上題目、照片或語音轉文字，我會提供詳解、再進一步回答追問。
      </p>
    </motion.div>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      <ChatContainer>
        {currentAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-4 flex items-center gap-2 rounded-full border border-[hsl(var(--companion)/0.3)] bg-[hsl(var(--companion)/0.12)] px-4 py-1.5 text-xs text-[hsl(var(--companion-foreground))] shadow-sm backdrop-blur dark:text-[hsl(var(--companion))]"
          >
            <FileText className="h-3 w-3 text-[hsl(var(--companion))]" />
            <span>已載入文件重點：{currentAnalysis.detectedSubject || '未知科目'}</span>
          </motion.div>
        )}

        {shouldRenderEmpty && renderEmpty}

        {conversation.map((turn, index) => {
          const onTurnLoadingChange = (loading: boolean) => {
            handleCardLoading(turn.id, loading)
          }

          const onTurnExplainComplete = (snapshot: ExplainCardSnapshot) => {
            handleSnapshot(turn.id, snapshot)
          }

          return (
            <div key={turn.id} className="space-y-6 rounded-3xl border border-border/40 bg-card/50 px-4 py-5 shadow-sm sm:px-6">
              <div className="flex flex-col space-y-4">
                <UserMessage content={turn.questionText} />

                <motion.div initial={{ opacity: 0.8, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <ExplainCardV2
                    inputText={turn.questionText}
                    questionId={turn.questionId || undefined}
                    onLoadingChange={onTurnLoadingChange}
                    onExplainComplete={onTurnExplainComplete}
                  />
                </motion.div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>第 {index + 1} 題 · {new Date(turn.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>
                <button
                  type="button"
                  className="rounded-full border border-border/60 px-3 py-1 text-foreground/80 transition hover:border-foreground hover:text-foreground disabled:opacity-60"
                  onClick={() => activateFollowUp(turn, index)}
                  disabled={!!cardLoading[turn.id] || !turn.snapshot}
                >
                  追問
                </button>
              </div>

              {turn.followups.map((entry) => (
                <div key={entry.id} className="ml-2 space-y-3 border-l-2 border-border/30 pl-4 sm:ml-4 sm:pl-6">
                  <UserMessage content={entry.userText} />
                  {entry.status === 'loading' && <AIMessage content="思考中，稍等我整理重點…" tone="neutral" />}
                  {entry.status === 'ready' && entry.response && <AIMessage content={entry.response} tone="mentor" />}
                  {entry.status === 'error' && (
                    <AIMessage content={`⚠️ 追問失敗：${entry.error ?? '請稍後再試'}`} tone="neutral" />
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </ChatContainer>

      <div className="flex-shrink-0 border-t border-border/40 bg-background/95 backdrop-blur">
        {activeFollowUp && (
          <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
            <div className="truncate">
              <span className="mr-2 text-foreground/80">追問目標</span>
              <span className="font-medium text-foreground">{activeFollowUp.label}</span>
            </div>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setActiveFollowUp(null)}
            >
              取消
            </button>
          </div>
        )}

        <InputDock
          mode="single"
          value={inputValue}
          isBusy={isInputBusy}
          ocrStatus={ocrStatus}
          onChange={setInputValue}
          onSubmit={handleDockSubmit}
          onOcrComplete={setOcrStatus}
          placeholder={followUpPlaceholder}
        />
      </div>
    </div>
  )
}
