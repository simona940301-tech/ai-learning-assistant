'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { VocabularyVM } from '@/lib/mapper/explain-presenter'
import { ExtendedVocab } from '../ExtendedVocab'

interface VocabularyExplainProps {
  view: VocabularyVM
}

function truncateReason(reason: string, maxLength = 30): string {
  if (reason.length <= maxLength) return reason
  return `${reason.slice(0, maxLength).trim()}…`
}

export function VocabularyExplain({ view }: VocabularyExplainProps) {
  return (
    <div className="space-y-3">
      {/* 題幹 */}
      <Card>
        <CardContent className="space-y-2 pt-6">
          <p className="text-sm leading-relaxed text-foreground">{view.stem.en}</p>
          {view.stem.zh && <p className="text-sm leading-relaxed text-muted-foreground">{view.stem.zh}</p>}
        </CardContent>
      </Card>

      {/* 選項分析 — 固定格式：代號｜詞性｜中文｜一句理由，正解高亮 */}
      {view.options && view.options.length > 0 && (
        <Card>
          <CardContent className="space-y-1.5 pt-6">
            {view.options.map((option) => {
              // 構建固定格式：代號｜詞性｜中文｜一句理由
              const parts: string[] = []
              if (option.label) parts.push(`(${option.label})`)
              if (option.pos) parts.push(option.pos)
              if (option.zh) parts.push(option.zh)
              if (option.reason) parts.push(truncateReason(option.reason, 30))

              const line = parts.join('｜')
              const isCorrect = option.correct

              return (
                <div
                  key={`${option.label}-${option.text}`}
                  className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    isCorrect
                      ? 'bg-green-50 font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-200'
                      : 'text-foreground'
                  }`}
                >
                  {line}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* 延伸字彙（可選） */}
      {view.vocab && view.vocab.length > 0 && <ExtendedVocab items={view.vocab} />}
    </div>
  )
}
