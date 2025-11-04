'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { TranslationVM } from '@/lib/mapper/explain-presenter'

interface TranslationExplainProps {
  view: TranslationVM
}

function truncateReason(reason: string, maxLength = 30): string {
  if (reason.length <= maxLength) return reason
  return `${reason.slice(0, maxLength).trim()}…`
}

function ScoreBar({ score, max = 2 }: { score: number; max?: number }) {
  const percentage = (score / max) * 100
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export function TranslationExplain({ view }: TranslationExplainProps) {
  const scores = view.meta?.scores

  return (
    <div className="space-y-3">
      {/* 題幹 */}
      <Card>
        <CardContent className="space-y-2 pt-6">
          <p className="text-sm leading-relaxed text-foreground">{view.stem.en}</p>
          {view.stem.zh && <p className="text-sm leading-relaxed text-muted-foreground">{view.stem.zh}</p>}
        </CardContent>
      </Card>

      {/* 範例答案 */}
      {view.meta?.examples && (view.meta.examples.literal || view.meta.examples.natural) && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            {view.meta.examples.literal && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">直譯：</span>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{view.meta.examples.literal}</p>
              </div>
            )}
            {view.meta.examples.natural && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">自然譯：</span>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{view.meta.examples.natural}</p>
              </div>
            )}
            {view.meta.examples.incorrect && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">✗ 錯誤：</span>
                <p className="mt-1 text-sm leading-relaxed text-red-600 dark:text-red-400">
                  {view.meta.examples.incorrect}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 評分條 */}
      {scores && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="space-y-2">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">語法</span>
                  <span className="font-medium">{scores.grammar}/{2}</span>
                </div>
                <ScoreBar score={scores.grammar} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">用字</span>
                  <span className="font-medium">{scores.wordChoice}/{2}</span>
                </div>
                <ScoreBar score={scores.wordChoice} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">流暢</span>
                  <span className="font-medium">{scores.fluency}/{2}</span>
                </div>
                <ScoreBar score={scores.fluency} />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">語域</span>
                  <span className="font-medium">{scores.register}/{2}</span>
                </div>
                <ScoreBar score={scores.register} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 改進建議 */}
      {view.meta?.improvements && view.meta.improvements.length > 0 && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            {view.meta.improvements.map((improvement, index) => (
              <div key={index} className="text-sm leading-relaxed">
                <span className="font-medium text-foreground">{improvement.dimension}：</span>
                <span className="text-muted-foreground">{truncateReason(improvement.suggestion)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 理由 */}
      {view.meta?.reasonLine && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {truncateReason(view.meta.reasonLine)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
