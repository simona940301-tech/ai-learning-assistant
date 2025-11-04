'use client'

import { useState } from 'react'
import { track } from '@plms/shared/analytics'
import type { VocabItemVM } from '@/lib/mapper/explain-presenter'

interface ProgressiveVocabularyProps {
  vocab: VocabItemVM[]
  questionId: string
}

interface ExpandedVocab extends VocabItemVM {
  ipa?: string
  synonyms?: string[]
  example?: string
  loading?: boolean
}

/**
 * S4: Progressive Vocabulary
 * Layered reveal: IPA → POS → Chinese → Example → Synonyms
 * DeepL integration for missing Chinese/examples
 */
export function ProgressiveVocabulary({ vocab, questionId }: ProgressiveVocabularyProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [expandedData, setExpandedData] = useState<Record<string, ExpandedVocab>>({})
  const [mastered, setMastered] = useState<Set<string>>(new Set())
  const [inDeck, setInDeck] = useState<Set<string>>(new Set())

  const toggleExpand = async (word: string) => {
    const isExpanding = !expanded[word]
    setExpanded((prev) => ({ ...prev, [word]: isExpanding }))
    
    if (isExpanding && !expandedData[word]) {
      // Lazy load missing data
      setExpandedData((prev) => ({
        ...prev,
        [word]: { ...vocab.find((v) => v.word === word)!, loading: true },
      }))
      
      track('vocab.expand', { word, qid: questionId })
      
      // Simulate DeepL lookup (would call API in production)
      setTimeout(() => {
        setExpandedData((prev) => ({
          ...prev,
          [word]: {
            ...prev[word],
            loading: false,
            ipa: `/ˈ${word.toLowerCase()}/`, // Mock IPA
            synonyms: ['synonym1', 'synonym2'], // Mock synonyms
            example: `Example sentence with ${word}.`, // Mock example
          },
        }))
        track('vocab.complete', { word, qid: questionId })
      }, 500)
    }
  }

  const handleAddToDeck = (word: string) => {
    setInDeck((prev) => new Set([...prev, word]))
    track('vocab.add', { word, qid: questionId })
  }

  const handleMarkMastered = (word: string) => {
    setMastered((prev) => new Set([...prev, word]))
    track('vocab.master', { word, qid: questionId })
  }

  if (vocab.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">重點詞彙</div>
      <div className="flex flex-wrap gap-2">
        {vocab.map((item) => {
          const isExpanded = expanded[item.word]
          const data = expandedData[item.word] || item
          const isMastered = mastered.has(item.word)
          const isInDeck = inDeck.has(item.word)

          return (
            <div key={item.word} className="w-full">
              <button
                type="button"
                onClick={() => toggleExpand(item.word)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  isExpanded
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.word}</span>
                  <span className="text-xs text-muted-foreground">{isExpanded ? '−' : '+'}</span>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                  {/* IPA */}
                  {data.ipa && (
                    <div>
                      <span className="text-xs text-muted-foreground">音標：</span>
                      <span className="font-mono text-xs">{data.ipa}</span>
                    </div>
                  )}

                  {/* POS */}
                  {data.pos && (
                    <div>
                      <span className="text-xs text-muted-foreground">詞性：</span>
                      <span>{data.pos}</span>
                    </div>
                  )}

                  {/* Chinese */}
                  {data.zh && (
                    <div>
                      <span className="text-xs text-muted-foreground">中文：</span>
                      <span>{data.zh}</span>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {data.loading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"></span>
                      載入中...
                    </div>
                  )}

                  {/* Example */}
                  {data.example && !data.loading && (
                    <div className="rounded bg-background p-2">
                      <div className="text-xs text-muted-foreground">例句：</div>
                      <div className="text-sm italic">{data.example}</div>
                    </div>
                  )}

                  {/* Synonyms */}
                  {data.synonyms && data.synonyms.length > 0 && !data.loading && (
                    <div>
                      <div className="text-xs text-muted-foreground">同義詞：</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {data.synonyms.map((syn, idx) => (
                          <span key={idx} className="rounded bg-background px-2 py-0.5 text-xs">
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddToDeck(item.word)
                      }}
                      disabled={isInDeck}
                      className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
                        isInDeck
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {isInDeck ? '已加入' : '加入牌組'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkMastered(item.word)
                      }}
                      disabled={isMastered}
                      className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
                        isMastered
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/30'
                      }`}
                    >
                      {isMastered ? '已掌握' : '標記已掌握'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

