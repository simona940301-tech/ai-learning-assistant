'use client'

import { memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ExplainCardSnapshot } from '@/components/solve/ExplainCardV2'
import ExplainCardV2 from '@/components/solve/ExplainCardV2'
import UserMessage from '@/components/ask/messages/UserMessage'
import AIMessage from '@/components/ask/messages/AIMessage'

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

interface ConversationItemProps {
    turn: QuestionTurn
    index: number
    isLoading: boolean
    onLoadingChange: (turnId: string, loading: boolean) => void
    onExplainComplete: (turnId: string, snapshot: ExplainCardSnapshot) => void
    onActivateFollowUp: (turn: QuestionTurn, index: number) => void
}

const ConversationItem = ({
    turn,
    index,
    isLoading,
    onLoadingChange,
    onExplainComplete,
    onActivateFollowUp,
}: ConversationItemProps) => {
    const handleLoadingChange = useCallback(
        (loading: boolean) => {
            onLoadingChange(turn.id, loading)
        },
        [turn.id, onLoadingChange]
    )

    const handleExplainComplete = useCallback(
        (snapshot: ExplainCardSnapshot) => {
            onExplainComplete(turn.id, snapshot)
        },
        [turn.id, onExplainComplete]
    )

    const handleActivateFollowUp = useCallback(() => {
        onActivateFollowUp(turn, index)
    }, [turn, index, onActivateFollowUp])

    return (
        <div className="space-y-6 rounded-3xl border border-border/40 bg-card/50 px-4 py-5 shadow-sm sm:px-6">
            <div className="flex flex-col space-y-4">
                <UserMessage content={turn.questionText} />

                <motion.div initial={{ opacity: 0.8, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <ExplainCardV2
                        inputText={turn.questionText}
                        questionId={turn.questionId || undefined}
                        onLoadingChange={handleLoadingChange}
                        onExplainComplete={handleExplainComplete}
                    />
                </motion.div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                    第 {index + 1} 題 ·{' '}
                    {new Date(turn.createdAt).toLocaleTimeString('zh-TW', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>
                <button
                    type="button"
                    className="rounded-full border border-border/60 px-3 py-1 text-foreground/80 transition hover:border-foreground hover:text-foreground disabled:opacity-60"
                    onClick={handleActivateFollowUp}
                    disabled={isLoading || !turn.snapshot}
                >
                    追問
                </button>
            </div>

            {turn.followups.map((entry) => (
                <div
                    key={entry.id}
                    className="ml-2 space-y-3 border-l-2 border-border/30 pl-4 sm:ml-4 sm:pl-6"
                >
                    <UserMessage content={entry.userText} />
                    {entry.status === 'loading' && (
                        <AIMessage content="思考中，稍等我整理重點…" tone="neutral" />
                    )}
                    {entry.status === 'ready' && entry.response && (
                        <AIMessage content={entry.response} tone="mentor" />
                    )}
                    {entry.status === 'error' && (
                        <AIMessage
                            content={`⚠️ 追問失敗：${entry.error ?? '請稍後再試'}`}
                            tone="neutral"
                        />
                    )}
                </div>
            ))}
        </div>
    )
}

// 🎯 使用自訂比較函數，更精準地控制何時重新渲染
export default memo(ConversationItem, (prevProps, nextProps) => {
    // 如果這些屬性沒變，就不重新渲染
    return (
        prevProps.turn.id === nextProps.turn.id &&
        prevProps.turn.questionText === nextProps.turn.questionText &&
        prevProps.turn.snapshot === nextProps.turn.snapshot &&
        prevProps.turn.followups.length === nextProps.turn.followups.length &&
        prevProps.index === nextProps.index &&
        prevProps.isLoading === nextProps.isLoading
    )
})
