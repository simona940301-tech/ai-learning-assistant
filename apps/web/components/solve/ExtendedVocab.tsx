'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { VocabItemVM } from '@/lib/mapper/explain-presenter'

interface ExtendedVocabProps {
  items: VocabItemVM[]
  onAddWord?: (item: VocabItemVM) => void
}

export function ExtendedVocab({ items, onAddWord }: ExtendedVocabProps) {
  const validItems = items.filter(
    (item) => item.word && item.word.trim().length > 0 && item.word !== '-' && item.word !== '—'
  )
  if (!validItems.length) return null

  const showExample = validItems.some((item) => Boolean(item.example))
  const showActions = typeof onAddWord === 'function'

  return (
    <Card>
      <CardContent className="overflow-x-auto pt-6">
        <table className="min-w-full table-fixed text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="w-1/4 pb-2 font-medium">單字</th>
              <th className="w-1/6 pb-2 font-medium">詞性</th>
              <th className="w-1/3 pb-2 font-medium">中文釋義</th>
              {showExample && <th className="w-1/3 pb-2 font-medium">例句</th>}
              {showActions && <th className="w-[120px] pb-2 font-medium text-right">操作</th>}
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, idx) => (
              <tr key={`${item.word}-${idx}`} className="border-t border-border/60">
                <td className="py-2 pr-4 font-medium text-foreground">{item.word}</td>
                <td className="py-2 pr-4 text-muted-foreground">{item.pos || ''}</td>
                <td className="py-2 pr-4 text-foreground/90">{item.zh || ''}</td>
                {showExample && <td className="py-2 pr-4 text-muted-foreground">{item.example || ''}</td>}
                {showActions && (
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                      onClick={() => onAddWord?.(item)}
                    >
                      加入單字本
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
