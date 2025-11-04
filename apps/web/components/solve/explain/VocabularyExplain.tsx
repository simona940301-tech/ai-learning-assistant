'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { VocabularyVM } from '@/lib/mapper/explain-presenter'
import { ExtendedVocab } from '../ExtendedVocab'

interface VocabularyExplainProps {
  view: VocabularyVM
}

function truncateReason(reason: string, maxLength = 30): string {
  if (!reason) return ''
  if (reason.length <= maxLength) return reason
  const trimmed = reason.slice(0, maxLength).trim()
  return trimmed.endsWith('。') || trimmed.endsWith('！') || trimmed.endsWith('？') ? trimmed : `${trimmed}…`
}

export function VocabularyExplain({ view }: VocabularyExplainProps) {
  return (
    <div className="space-y-3">
      {/* 選項分析 — 固定格式：代號｜詞性｜中文｜一句理由，正解高亮 */}
      {/* 不使用題幹卡，直接顯示選項 */}
      {view.options && view.options.length > 0 && (
        <Card>
          <CardContent className="space-y-1 pt-6">
            {view.options.map((option) => {
              // 構建固定格式：(A) word｜POS｜中文｜一句理由
              const parts: string[] = []
              if (option.label) parts.push(`(${option.label})`)
              if (option.text) parts.push(option.text.trim())
              if (option.pos) parts.push(option.pos)
              if (option.zh) parts.push(option.zh)
              if (option.reason) parts.push(truncateReason(option.reason, 30))

              const line = parts.join('｜')
              const isCorrect = option.correct

              return (
                <div
                  key={`${option.label}-${option.text}`}
                  className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed transition-colors ${
                    isCorrect
                      ? 'bg-green-50/80 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30 font-medium text-green-700 dark:text-green-300'
                      : 'text-foreground/80 hover:bg-muted/30'
                  }`}
                >
                  {line}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* 延伸字彙（可選，3–6 組） */}
      {view.vocab && view.vocab.length > 0 && (
        <ExtendedVocab items={view.vocab.slice(0, 6)} />
      )}
    </div>
  )
}
