"use client"

import { useState } from 'react'
import { useChickStore } from '@/src/store/chickStore'

export function SootheButton() {
  const { fatigue, soothe, lastSootheResult } = useChickStore(state => ({
    fatigue: state.fatigue,
    soothe: state.soothe,
    lastSootheResult: state.lastSootheResult,
  }))
  const [cooldown, setCooldown] = useState(false)

  const disabled = fatigue <= 0 || cooldown

  async function handleClick() {
    if (disabled) return
    setCooldown(true)
    try {
      await soothe()
    } finally {
      setTimeout(() => setCooldown(false), 600)
    }
  }

  const helper =
    lastSootheResult?.ok === false && lastSootheResult.reason === 'limit_reached'
      ? '今日安撫次數已達上限'
      : lastSootheResult?.ok === false && lastSootheResult.reason === 'no_fatigue'
        ? '小雞目前不累'
        : lastSootheResult?.ok
          ? '小雞放鬆了一點'
          : null

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600"
      >
        {fatigue > 0 ? '安撫小雞' : '小雞狀態良好'}
      </button>
      {helper && <span className="text-xs text-muted-foreground">{helper}</span>}
    </div>
  )
}
