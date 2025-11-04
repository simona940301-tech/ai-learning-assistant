'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { GrammarVM } from '@/lib/mapper/explain-presenter'

function truncateReason(reason: string, maxLength = 30): string {
  if (reason.length <= maxLength) return reason
  return `${reason.slice(0, maxLength).trim()}…`
}

export function GrammarExplain({ view }: { view: GrammarVM }) {
  return (
    <div className="space-y-3">
      {/* 題幹 */}
      <Card>
        <CardContent className="space-y-2 pt-6">
          <p className="text-sm leading-relaxed text-foreground">{view.stem.en}</p>
          {view.stem.zh && <p className="text-sm leading-relaxed text-muted-foreground">{view.stem.zh}</p>}
          {view.meta.pattern && (
            <div className="mt-2 rounded border border-border bg-muted/30 px-3 py-1.5 font-mono text-xs leading-relaxed text-muted-foreground">
              {view.meta.pattern}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 選項分析 */}
      {view.options && view.options.length > 0 && (
        <Card>
          <CardContent className="space-y-1.5 pt-6">
            {view.options.map((option) => {
              const reason = option.reason ? truncateReason(option.reason) : undefined
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
                  {option.label}. {option.text}
                  {reason && <span className="text-muted-foreground"> — {reason}</span>}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* 正確答案 */}
      {view.answer && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-200">
              {view.answer.label}. {view.answer.text}
            </div>
            {view.meta.reasonLine && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {truncateReason(view.meta.reasonLine)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 關聯規則 */}
      {view.meta.relatedRules && view.meta.relatedRules.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {view.meta.relatedRules.map((rule) => (
            <span
              key={rule}
              className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
            >
              {rule}
            </span>
          ))}
        </div>
      )}

      {/* 例句對比 */}
      {view.meta.examples && (view.meta.examples.correct || view.meta.examples.incorrect) && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            {view.meta.examples.correct && (
              <p className="text-sm leading-relaxed">
                <span className="text-muted-foreground">✓</span>{' '}
                <span className="border-b border-green-400 text-green-700 dark:text-green-200">
                  {view.meta.examples.correct}
                </span>
              </p>
            )}
            {view.meta.examples.incorrect && (
              <p className="text-sm leading-relaxed">
                <span className="text-muted-foreground">✗</span>{' '}
                <span className="border-b border-red-400 text-red-600 dark:text-red-400">
                  {view.meta.examples.incorrect}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
