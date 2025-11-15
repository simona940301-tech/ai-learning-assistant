'use client'

import { useState } from 'react'
import { RetestSuggestionPayload } from '@/lib/ws/types'
import { SystemNoticeBanner } from './SystemNoticeBanner'

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
    <section className="w-full rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between text-sm font-medium text-slate-700">
        <span>再測卡</span>
        <span className="text-xs text-slate-500">間隔 24h / 7d 提醒</span>
      </header>

      {notice && (
        <div className="mb-3 flex justify-center">
          <SystemNoticeBanner tone={notice.tone}>{notice.message}</SystemNoticeBanner>
        </div>
      )}

      <ul className="space-y-2">
        {suggestions.slice(0, 3).map((card, index) => (
          <li
            key={card.concept_id}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-900 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-900">
                  {SPACING_BADGES[index] ?? 'Spacing'}
                </span>
                <p className="text-sm font-medium text-slate-800">{card.label || `L${card.difficulty}`}</p>
              </div>
              <p className="text-xs text-slate-500">
                概念 {card.concept_id} · 難度 L{card.difficulty}
              </p>
            </div>
            <span className="text-xs text-slate-500">{new Date(card.scheduled_at).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <button
          onClick={() => handleAction('now')}
          disabled={!!pending || !matchId}
          className="rounded-full border border-slate-900 bg-slate-900 py-2 text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          立刻再測
        </button>
        <button
          onClick={() => handleAction('24h')}
          disabled={!!pending || !matchId}
          className="rounded-full border border-slate-300 bg-white py-2 text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
        >
          24h 提醒
        </button>
        <button
          onClick={() => handleAction('mute')}
          disabled={!!pending || !matchId}
          className="rounded-full border border-slate-200 bg-slate-50 py-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-60"
        >
          先不要
        </button>
      </div>
    </section>
  )
}
