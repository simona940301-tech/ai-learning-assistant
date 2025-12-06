'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { nanoid } from 'nanoid'
import InputDock from '@/components/ask/InputDock'
import ExplainCardV2, { type ExplainCardSnapshot } from '@/components/solve/ExplainCardV2'
import ConversationItem from './ConversationItem'
import ChatContainer from '@/components/ask/ChatContainer'
import { useHighlightStore } from '@/src/store/highlightStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import UserMessage from '@/components/ask/messages/UserMessage'
import AIMessage from '@/components/ask/messages/AIMessage'
import { useAsk } from '@/lib/ask-context'
import { FileText, File, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'

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
  questionText: string // 顯示給用戶的乾淨文本
  apiText?: string // 發送給 API 的完整文本（包含檔案內容和系統指令）
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
  const { currentAnalysis, attachedFiles, removeFile } = useAsk()

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

      // 🎯 Perfect UX: 分離顯示文本和 API 文本
      // displayText: 用戶看到的乾淨文本（只顯示檔案標題）
      // apiText: 發送給 API 的完整文本（包含檔案內容和系統指令）
      let displayText = trimmed
      let apiText = trimmed

      if (attachedFiles && attachedFiles.length > 0) {
        const fileContexts: string[] = []
        const displayFileRefs: string[] = []

        attachedFiles.forEach((file) => {
          // 🎯 顯示用：只顯示檔案名稱
          displayFileRefs.push(`\n\n[參考檔案：${file.name}]`)

          if (file.content) {
            // 有內容的檔案：直接添加內容到 API 文本
            fileContexts.push(`\n\n[檔案：${file.name}]\n${file.content}`)
          } else if (file.url) {
            // 只有 URL 的檔案（PDF/圖片）：添加檔案引用說明到 API 文本
            // 注意：這些內部細節不會顯示給用戶
            const fileTypeLabel = file.type === 'pdf' ? 'PDF' : file.type === 'image' ? '圖片' : '檔案'
            fileContexts.push(`\n\n[參考${fileTypeLabel}檔案：${file.name}]\n檔案類型：${fileTypeLabel}\n檔案 URL：${file.url}\n請根據此${fileTypeLabel}檔案內容協助回答問題。`)
          }
        })

        if (displayFileRefs.length > 0) {
          displayText = `${trimmed}${displayFileRefs.join('\n')}`
        }

        if (fileContexts.length > 0) {
          apiText = `${trimmed}${fileContexts.join('\n')}`
          console.log('[AnySubjectSolver] ✅ Enhanced text with files:', {
            originalLength: trimmed.length,
            displayLength: displayText.length,
            apiLength: apiText.length,
            fileCount: attachedFiles.length,
            filesWithContent: attachedFiles.filter(f => f.content).length,
            filesWithUrl: attachedFiles.filter(f => f.url && !f.content).length
          })
        }
      }

      const turn: QuestionTurn = {
        id: nanoid(),
        questionText: displayText, // 🎯 使用乾淨的顯示文本
        apiText: apiText, // 🎯 新增：保存 API 文本用於後端調用
        questionId: options?.questionId ?? null,
        createdAt: Date.now(),
        followups: [],
      }

      setConversation((prev) => [...prev, turn])
      setCardLoading((prev) => ({ ...prev, [turn.id]: true }))
      setActiveFollowUp(null)

      console.log('[AnySubjectSolver] request.start', { turnId: turn.id, question: formatSnippet(trimmed, 64), hasFiles: attachedFiles?.length > 0 })
    },
    [attachedFiles]
  )

  const handleSnapshot = useCallback((turnId: string, snapshot: ExplainCardSnapshot) => {
    setConversation((prev) =>
      prev.map((turn) => (turn.id === turnId ? { ...turn, snapshot } : turn))
    )
  }, [])

  const handleCardLoading = useCallback((turnId: string, loading: boolean) => {
    setCardLoading((prev) => ({ ...prev, [turnId]: loading }))
  }, [])

  // 🎯 優化：使用 useCallback 包裝 onChange，避免每次輸入都建立新的 function reference
  const handleInputChange = useCallback((newValue: string) => {
    setInputValue(newValue)
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
              concepts: currentAnalysis.coreConcepts?.map(c => c.concept),
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

      // Clear input immediately for better UX
      setInputValue('')

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

        {/* 🎯 顯示匯入的檔案（從背包匯入） */}
        {attachedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-4 max-w-2xl"
          >
            <div className="rounded-xl border border-border/40 bg-card/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>已匯入檔案 ({attachedFiles.length})</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs"
                  >
                    {file.type === 'pdf' && <File className="h-3.5 w-3.5 text-red-500" />}
                    {file.type === 'image' && <ImageIcon className="h-3.5 w-3.5 text-purple-500" />}
                    {file.type === 'text' && <FileText className="h-3.5 w-3.5 text-blue-500" />}
                    <span className="max-w-[120px] truncate text-foreground/80">{file.name}</span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {shouldRenderEmpty && renderEmpty}

        {conversation.map((turn, index) => (
          <ConversationItem
            key={turn.id}
            turn={turn}
            index={index}
            isLoading={!!cardLoading[turn.id]}
            onLoadingChange={handleCardLoading}
            onExplainComplete={handleSnapshot}
            onActivateFollowUp={activateFollowUp}
          />
        ))}
      </ChatContainer>

      {/* 🎯 固定在底部的輸入區 (ChatGPT 風格) */}
      <div className="fixed inset-x-0 z-10 border-t border-border/40 bg-background/95 backdrop-blur" style={{ bottom: 'var(--tab-bar-height, 64px)' }}>
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
          onChange={handleInputChange}
          onSubmit={handleDockSubmit}
          onOcrComplete={setOcrStatus}
          placeholder={followUpPlaceholder}
        />
      </div>
    </div>
  )
}
