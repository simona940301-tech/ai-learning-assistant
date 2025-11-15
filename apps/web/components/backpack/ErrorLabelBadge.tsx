'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface ErrorLabel {
  code: string
  name: string
  confidence: number
  evidence: string
  micro_advice: string
}

export interface ErrorLabelResponse {
  question_id: string
  predicted_labels: ErrorLabel[]
  primary_label: string | null
  why_summary: string
  next_action: string
}

interface ErrorLabelBadgeProps {
  labels: ErrorLabel[]
  primaryLabel: string | null
  whySummary: string
  nextAction: string
  isLoading?: boolean
  onExpand?: (code: string) => void
}

/**
 * 錯因標籤組件 - 極簡設計
 */
export function ErrorLabelBadge({
  labels,
  primaryLabel,
  whySummary,
  nextAction,
  isLoading = false,
  onExpand,
}: ErrorLabelBadgeProps) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <span>分析錯因中...</span>
      </div>
    )
  }

  if (labels.length === 0) {
    return null
  }

  const handleLabelClick = (code: string) => {
    const newExpanded = expandedCode === code ? null : code
    setExpandedCode(newExpanded)
    if (newExpanded) {
      onExpand?.(code)
    }
  }

  // 按 confidence 排序，primary label 優先
  const sortedLabels = [...labels].sort((a, b) => {
    if (a.code === primaryLabel) return -1
    if (b.code === primaryLabel) return 1
    return b.confidence - a.confidence
  })

  return (
    <div className="space-y-2">
      {/* 標籤 chips */}
      <div className="flex flex-wrap gap-1.5">
        {sortedLabels.map((label) => {
          const isExpanded = expandedCode === label.code
          const isPrimary = label.code === primaryLabel
          const confidencePercent = Math.round(label.confidence * 100)

          return (
            <button
              key={label.code}
              onClick={() => handleLabelClick(label.code)}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                isPrimary
                  ? 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20'
                  : 'bg-muted/60 text-foreground/80 border border-border/30 hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <span>{label.name}</span>
              <span className="text-[10px] opacity-60">{confidencePercent}%</span>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3 opacity-60" />
              ) : (
                <ChevronDown className="h-3 w-3 opacity-60" />
              )}
            </button>
          )
        })}
      </div>

      {/* 展開的建議 */}
      {expandedCode && (
        <div className="p-3 bg-muted/30 rounded-md border border-border/30">
          {sortedLabels
            .find((l) => l.code === expandedCode)
            ?.micro_advice && (
            <p className="text-xs text-foreground/90 leading-relaxed">
              {sortedLabels.find((l) => l.code === expandedCode)?.micro_advice}
            </p>
          )}
        </div>
      )}

      {/* 總結和下一步 */}
      {whySummary && whySummary !== 'insufficient_context' && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground leading-relaxed">{whySummary}</p>
          {nextAction && (
            <p className="text-xs text-primary font-medium">{nextAction}</p>
          )}
        </div>
      )}
    </div>
  )
}


