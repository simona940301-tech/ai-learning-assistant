'use client'

import { useState, useCallback } from 'react'

export type Scope = 'doc' | 'backpack' | 'purchased' | 'trusted' | 'web'

const ORDER: Scope[] = ['doc', 'backpack', 'purchased', 'trusted', 'web']
const THRESH: Record<Scope, number> = {
  doc: 0.62,
  backpack: 0.58,
  purchased: 0.56,
  trusted: 0.56,
  web: 0.54,
}

export interface SearchHit {
  id: string
  score: number
  source: string
  pointer: string
  snippet: string
}

export interface Answer {
  id: string
  summary: string
  detail?: string
  citations: Citation[]
}

export interface Citation {
  scope: Scope
  pointer: string
  label: string
}

export interface Selection {
  text?: string
  rects?: { x: number; y: number; width: number; height: number }[]
  page?: number
  ts?: number
}

interface UseScopedAskState {
  answers: Answer[]
  scope: Scope | null
  honest: boolean
  lockedScope: Scope | null
  setLockedScope: (scope: Scope | null) => void
}

export function useScopedAsk({ fileId }: { fileId: string | null }) {
  const [answers, setAnswers] = useState<Answer[]>([])
  const [scope, setScope] = useState<Scope | null>(null)
  const [lockedScope, setLockedScope] = useState<Scope | null>(null)
  const [honest, setHonest] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const ask = useCallback(
    async (query: string, opts?: { anchors?: Selection }) => {
      if (!query.trim() || !fileId) return

      setIsLoading(true)
      setHonest(false)
      setScope(null)

      // Determine search plan based on locked scope
      const plan = lockedScope
        ? ORDER.slice(0, ORDER.indexOf(lockedScope) + 1)
        : ORDER

      try {
        // Iterate through scopes in order
        for (const s of plan) {
          const hits = await search(s, { query, fileId, anchors: opts?.anchors })

          if (score(hits) >= THRESH[s]) {
            setScope(s)
            const answer = await synthesizeAnswer(query, s, hits)
            setAnswers((prev) => [{ ...answer, id: crypto.randomUUID() }, ...prev])
            setIsLoading(false)
            return
          }
        }

        // None met threshold
        setScope(null)
        setHonest(true)
      } catch (error) {
        console.error('[useScopedAsk] Error:', error)
        setHonest(true)
      } finally {
        setIsLoading(false)
      }
    },
    [fileId, lockedScope]
  )

  return {
    state: {
      answers,
      scope,
      honest,
      lockedScope,
      setLockedScope,
      isLoading,
    } as UseScopedAskState & { isLoading: boolean },
    ask,
  }
}

// --- Stub functions (to be replaced with backend API) ---

async function search(
  scope: Scope,
  {
    query,
    fileId,
    anchors,
  }: {
    query: string
    fileId: string
    anchors?: Selection
  }
): Promise<SearchHit[]> {
  // TODO: Replace with actual vector search API
  // Example:
  // const response = await fetch('/api/search', {
  //   method: 'POST',
  //   body: JSON.stringify({ scope, query, fileId, anchors }),
  // })
  // return response.json()

  // Mock response for development
  await new Promise((resolve) => setTimeout(resolve, 300))
  return []
}

function score(hits: SearchHit[]): number {
  return hits[0]?.score ?? 0
}

async function synthesizeAnswer(
  query: string,
  scope: Scope,
  hits: SearchHit[]
): Promise<Omit<Answer, 'id'>> {
  // Call backpack ask API
  try {
    const response = await fetch('/api/backpack/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        scope,
        hits: hits.map((h) => ({ snippet: h.snippet, pointer: h.pointer })),
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return {
        summary: data.summary || '',
        detail: data.detail,
        citations: hits.slice(0, 3).map((h) => ({
          scope,
          pointer: h.pointer,
          label: h.snippet?.slice(0, 48) ?? 'ref',
        })),
      }
    }
  } catch (error) {
    console.error('[useScopedAsk] synthesizeAnswer error:', error)
  }

  // Fallback mock response
  const scopeLabels: Record<Scope, string> = {
    doc: 'This doc',
    backpack: 'My Backpack',
    purchased: 'Purchased',
    trusted: 'Trusted',
    web: 'Web',
  }

  return {
    summary: `根據 ${scopeLabels[scope]} 的內容：${query.substring(0, 50)}...`,
    detail: `這是一個完整的解釋，包含更多細節和上下文。\n\n${query}`,
    citations: hits.slice(0, 3).map((h) => ({
      scope,
      pointer: h.pointer,
      label: h.snippet?.slice(0, 48) ?? 'ref',
    })),
  }
}

