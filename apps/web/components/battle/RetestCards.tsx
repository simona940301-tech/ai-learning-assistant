'use client'

import { useState } from 'react'
import { SystemNoticeBanner } from './SystemNoticeBanner'

type RetestSuggestionPayload = {
  concept_id: string
  difficulty: number
  scheduled_at: string
  label: string
}

type RetestAction = 'now' | '24h' | 'mute'

type Props = {
  suggestions: RetestSuggestionPayload[]
  matchId?: string | null
  onAction?: (action: RetestAction, suggestions: RetestSuggestionPayload[]) => Promise<void> | void
}

async function defaultAction(
  action: RetestAction,
  suggestions: RetestSuggestionPayload[],
  matchId?: string | null
) {
  if (!matchId) {
    throw new Error('Missing matchId for retest action')
  }

  const payload = {
    matchId,
    action,
    cards: suggestions.map((card) => ({
      conceptId: card.concept_id,
      difficulty: card.difficulty,
      scheduledAt: card.scheduled_at,
      label: card.label,
    })),
  }

  const response = await fetch('/api/retest/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Failed to submit retest preference')
  }
}

const SPACING_BADGES = ['24h', '7d', '7d+']

export function RetestCards({ suggestions, matchId, onAction }: Props) {
  const [pending, setPending] = useState<RetestAction | null>(null)
  const [notice, setNotice] = useState<{ tone: 'info' | 'success' | 'warning'; message: string } | null>(null)

  if (!suggestions.length) return null

  const handleAction = async (action: RetestAction) => {
    setPending(action)
    setNotice(null)
    try {
      if (onAction) {
        await onAction(action, suggestions)
      } else {
        await defaultAction(action, suggestions, matchId)
      }

      const message =
        action === 'now'
          ? '已建立 3 張再測卡'
          : action === '24h'
            ? '已安排 24h 後提醒'
            : '已暫停此輪建議'
      setNotice({ tone: 'success', message })
    } catch (error) {
      console.error('[RetestCards] Failed to submit preference', error)
      setNotice({
        tone: 'warning',
        message: '儲存失敗，請稍後再試',
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="w-full rounded-2xl border border-white/10 bg-[#0B1120] p-4 text-white shadow-lg">
      <header className="mb-3 flex items-center justify-between text-sm font-semibold text-white">
        <span>再測卡建議</span>
        <span className="text-xs text-white/50">24h / 7d 提醒</span>
      </header>

      {notice && (
        <div className="mb-3 flex justify-center">
          <SystemNoticeBanner tone={notice.tone}>{notice.message}</SystemNoticeBanner>
        </div>
      )}

      <ul className="space-y-2">
        {suggestions.slice(0, 3).map((card, index) => (
          <li
            key={`${card.concept_id}-${index}`}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white/90">
                  {SPACING_BADGES[index] ?? 'Spacing'}
                </span>
                <p className="font-semibold text-white">{card.label || `L${card.difficulty}`}</p>
              </div>
              <p className="text-xs text-white/60">
                概念 {card.concept_id} · 難度 L{card.difficulty}
              </p>
            </div>
            <span className="text-xs text-white/50">
              {new Date(card.scheduled_at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <button
          onClick={() => handleAction('now')}
          disabled={!!pending || !matchId}
          className="rounded-full border border-white/20 bg-white text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50"
        >
          立刻再測
        </button>
        <button
          onClick={() => handleAction('24h')}
          disabled={!!pending || !matchId}
          className="rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
        >
          24h 提醒
        </button>
        <button
          onClick={() => handleAction('mute')}
          disabled={!!pending || !matchId}
          className="rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
        >
          先不要
        </button>
      </div>
    </section>
  )
}
