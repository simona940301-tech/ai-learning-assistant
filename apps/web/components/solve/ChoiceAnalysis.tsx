import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import type { OptionVM } from '@/lib/mapper/explain-presenter'

interface ChoiceAnalysisProps {
  options: OptionVM[]
}

function composeLine(option: OptionVM): string {
  const segments = [`(${option.label})`, option.text].filter(Boolean)

  if (option.pos) {
    segments.push(`(${option.pos})`)
  }

  if (option.zh) {
    segments.push(option.zh)
  }

  if (option.reason) {
    return `${segments.join(' ')} — ${option.reason}`
  }

  return segments.join(' ')
}

export function ChoiceAnalysis({ options }: ChoiceAnalysisProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Search className="h-5 w-5" aria-hidden />
          </div>
          <CardTitle className="text-base font-semibold">選項分析</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">暫無資料</p>
        ) : (
          <ul className="space-y-1.5">
            {options.map((option) => {
              const line = composeLine(option)
              return (
                <li
                  key={`${option.label}-${option.text || 'empty'}`}
                  className={cn(
                    'flex items-start gap-2 rounded-lg px-3 py-2 text-sm leading-6',
                    option.correct
                      ? 'bg-green-50 font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-200'
                      : 'text-foreground'
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 text-base',
                      option.correct ? 'opacity-100' : 'opacity-0'
                    )}
                  >
                    ✅
                  </span>
                  <span className="flex-1">{line}</span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
