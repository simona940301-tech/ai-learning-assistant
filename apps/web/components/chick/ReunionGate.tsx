'use client'

import { useEffect, useMemo, useState } from 'react'
import { ReunionModal } from './ReunionModal'
import { useChickStore } from '@/src/store/chickStore'

export function ReunionGate() {
  const {
    reunionState,
    daysSinceLastSeen,
    fetchStatus,
    updateLastSeen,
  } = useChickStore()
  const [open, setOpen] = useState(false)
  const [whistleLoading, setWhistleLoading] = useState(false)
  const [whistleError, setWhistleError] = useState<string | null>(null)

  const mood = useMemo(() => reunionState, [reunionState])

  useEffect(() => {
    if (mood && daysSinceLastSeen > 0) {
      setOpen(true)
    }
  }, [mood, daysSinceLastSeen])

  const handleClose = async () => {
    setOpen(false)
    await updateLastSeen()
    await fetchStatus()
  }

  const handleWhistle = async () => {
    setWhistleLoading(true)
    setWhistleError(null)
    try {
      const res = await fetch('/api/chick/reunion/whistle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: 50 }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setWhistleError(
          (data as { message?: string; error?: string }).message ||
          (data as { message?: string; error?: string }).error ||
          '哨子無法使用，請稍後再試。'
        )
        return
      }

      await fetchStatus()
      await updateLastSeen()
      setOpen(false)
    } catch (error) {
      setWhistleError('連線不穩定，稍後再試。')
    } finally {
      setWhistleLoading(false)
    }
  }

  if (!mood) return null

  return (
    <ReunionModal
      open={open}
      mood={mood}
      daysAway={daysSinceLastSeen}
      onClose={handleClose}
      onWhistle={mood === 'runaway' ? handleWhistle : undefined}
      isWhistleLoading={whistleLoading}
      whistleError={whistleError}
    />
  )
}
