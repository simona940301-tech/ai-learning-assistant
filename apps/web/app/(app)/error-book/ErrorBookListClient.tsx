'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { sendWrongbookReviewedAction } from '@/lib/chick/action-bus'

export type ErrorBookListItem = {
  id: string
  questionId: string
  preview: string
  subject?: string | null
  packName?: string | null
  packSkill?: string | null
  status: string
  createdAt: string
  lastAttemptedAt?: string | null
  hasBackpackNote?: boolean
}

type Props = {
  items: ErrorBookListItem[]
  errorMessage?: string | null
}

function formatRelativeDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  // 一週內顯示「幾天前」
  if (diffInDays < 7) {
    if (diffInDays === 0) return '今天'
    if (diffInDays === 1) return '昨天'
    return `${diffInDays} 天前`
  }
  
  // 超過一週顯示日期格式：2025/11/15
  const pad = (num: number) => num.toString().padStart(2, '0')
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}

export default function ErrorBookListClient({ items, errorMessage }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [hasTrackedView, setHasTrackedView] = useState(false)

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return items
    return items.filter(item => {
      return [item.preview, item.subject]
        .filter(Boolean)
        .some(field => field!.toLowerCase().includes(keyword))
    })
  }, [items, query])

  // P1-E: Track wrongbook review event when user views the error book page
  useEffect(() => {
    if (items.length > 0 && !hasTrackedView) {
      setHasTrackedView(true)
      sendWrongbookReviewedAction({ questionsReviewed: items.length }).catch(err => {
        console.warn('[ErrorBookListClient] Failed to send WRONGBOOK_REVIEWED event:', err)
      })
    }
  }, [items.length, hasTrackedView])

  const handleRowClick = (id: string) => {
    router.push(`/error-book/${id}`)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">錯題本</h2>
          <p className="text-sm text-muted-foreground">
            {items.length}/50
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Input
            placeholder="搜尋題目或科目"
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="w-full sm:max-w-xs"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button size="sm" variant="outline" disabled className="cursor-not-allowed opacity-70">
              Active
            </Button>
            <Button size="sm" variant="ghost" disabled className="cursor-not-allowed opacity-50">
              Archived（準備中）
            </Button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          目前還沒有錯題紀錄。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card shadow-sm">
          <table className="min-w-full divide-y divide-border/50">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                  題目摘要
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                  科目
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                  建立日期
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-background">
              {filteredItems.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-sm text-muted-foreground" colSpan={3}>
                    找不到符合「{query}」的錯題。
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-muted/30 active:bg-muted/40"
                    onClick={() => handleRowClick(item.id)}
                  >
                    <td className="px-6 py-5">
                      <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
                        {item.preview}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {item.subject || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeDate(item.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
