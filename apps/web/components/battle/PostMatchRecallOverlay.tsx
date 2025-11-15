'use client'

import { useEffect, useMemo, useState } from 'react'
import { RecallOverlayPayload } from '@/lib/ws/types'

type RecallChoice = 'confident' | 'needs_work'

type Props = {
  payload: RecallOverlayPayload | null
  visible: boolean
  matchId?: string | null
  onChoice?: (params: { qid: string; choice: RecallChoice }) => Promise<void> | void
  onDismiss?: () => void
}

async function logChoice(
  matchId: string | null | undefined,
  qid: string,
  choice: RecallChoice,
  latencyMs?: number
) {
  if (!matchId) {
    console.warn('[PostMatchRecallOverlay] Missing matchId, skipping recall log.')
    return
  }
  try {
    await fetch('/api/recall/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId,
        entries: [{ qid, choice, latencyMs }],
      }),
      credentials: 'include',
    })
  } catch (error) {
    console.warn('[PostMatchRecallOverlay] Failed to log recall choice', error)
  }
}

export function PostMatchRecallOverlay({ payload, visible, matchId, onChoice, onDismiss }: Props) {
  const [timeLeft, setTimeLeft] = useState(payload?.duration_sec ?? 0)

  useEffect(() => {
    if (!visible || !payload) {
      setTimeLeft(0)
      return
    }
    setTimeLeft(payload.duration_sec)
    const id = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0))
    }, 1000)
    return () => clearInterval(id)
  }, [visible, payload])

  useEffect(() => {
    if (visible && timeLeft === 0 && onDismiss) {
      onDismiss()
    }
  }, [timeLeft, visible, onDismiss])

  const prompts = useMemo(() => payload?.items ?? [], [payload])

  if (!visible || !payload) {
    return null
  }

  const handleChoice = async (qid: string, choice: RecallChoice) => {
    const latencyMs =
      payload && payload.duration_sec
        ? Math.max(0, Math.round((payload.duration_sec - timeLeft) * 1000))
        : undefined

    if (onChoice) {
      await onChoice({ qid, choice })
    } else {
      await logChoice(matchId, qid, choice, latencyMs)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-black/40 via-black/10 to-transparent p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
          <span>{payload.duration_sec}s 回想練習</span>
          <span>{timeLeft}s</span>
        </div>
        <div className="space-y-3">
          {prompts.map((item) => (
            <div key={item.qid} className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-sm text-slate-800">{item.prompt}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleChoice(item.qid, 'confident')}
                  className="flex-1 rounded-full border border-emerald-200 bg-emerald-50 py-1 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  Confident
                </button>
                <button
                  onClick={() => handleChoice(item.qid, 'needs_work')}
                  className="flex-1 rounded-full border border-amber-200 bg-amber-50 py-1 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                >
                  Needs work
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
