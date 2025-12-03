'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChickGuide } from '@/components/chick/ChickGuide'

type GuideConfig = {
  id: string
  targetSelector: string
  message: string
  priority?: 'low' | 'medium' | 'high'
}

export function useChickGuide() {
  const [queue, setQueue] = useState<GuideConfig[]>([])
  const [current, setCurrent] = useState<GuideConfig | null>(null)

  const seenKey = useMemo(() => 'plms_chick_guides_seen', [])

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0])
      setQueue((prev) => prev.slice(1))
    }
  }, [current, queue])

  const markSeen = (id: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem(seenKey) || '[]') as string[]
      if (!existing.includes(id)) {
        localStorage.setItem(seenKey, JSON.stringify([...existing, id]))
      }
    } catch {
      // ignore
    }
  }

  const hasSeen = (id: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem(seenKey) || '[]') as string[]
      return existing.includes(id)
    } catch {
      return false
    }
  }

  const showGuide = (config: GuideConfig) => {
    if (hasSeen(config.id)) return
    setQueue((prev) => [...prev, config])
  }

  const node = current ? (
    <ChickGuide
      key={current.id}
      targetSelector={current.targetSelector}
      message={current.message}
      priority={current.priority}
      onDismiss={() => {
        markSeen(current.id)
        setCurrent(null)
      }}
    />
  ) : null

  return { showGuide, guideNode: node }
}
