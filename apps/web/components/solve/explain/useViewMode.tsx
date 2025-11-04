'use client'

import { useState, useEffect } from 'react'

type ViewMode = 'simple' | 'full'

const STORAGE_KEY = 'explain_view_mode'

export function useViewMode() {
  const [mode, setMode] = useState<ViewMode>('simple')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as ViewMode
      if (stored === 'simple' || stored === 'full') {
        setMode(stored)
      }
    }
  }, [])

  const toggleMode = () => {
    const newMode = mode === 'simple' ? 'full' : 'simple'
    setMode(newMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newMode)
    }
  }

  return { mode, toggleMode }
}

interface ModeToggleProps {
  mode: ViewMode
  onToggle: () => void
}

/**
 * Mode Toggle: Simple / Full
 * Simple: Thinking + Reasoning only
 * Full: Everything (vocab, notes, etc.)
 */
export function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
    >
      <span className={mode === 'simple' ? 'text-primary' : 'text-muted-foreground'}>簡約</span>
      <div className={`h-4 w-7 rounded-full transition-colors ${mode === 'full' ? 'bg-primary' : 'bg-muted'}`}>
        <div
          className={`h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
            mode === 'full' ? 'translate-x-3' : 'translate-x-0'
          }`}
        />
      </div>
      <span className={mode === 'full' ? 'text-primary' : 'text-muted-foreground'}>完整</span>
    </button>
  )
}

