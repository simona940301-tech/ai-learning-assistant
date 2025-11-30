import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCurrentUser, type AuthErrorType } from '@/lib/auth/getCurrentUser'
import { MarkdownRenderer } from '@/components/solve/MarkdownRenderer'

type ErrorBookDetailRow = {
  id: string
  status: string
  created_at: string
  updated_at: string
  last_attempted_at: string | null
  notes: Record<string, unknown> | null
  pack_questions: {
    id: string
    stem: string | null
    choices: string[] | null
    answer: string | null
    explanation: string | null
    pack_id: string | null
    packs: {
      id: string
      title: string | null
      subject: string | null
      skill: string | null
    } | null
  } | null
}

const DATE_FORMATTER = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value?: string | null) {
  if (!value) return '—'
  return DATE_FORMATTER.format(new Date(value))
}

function extractBackpackNoteId(notes: Record<string, unknown> | null | undefined) {
  if (!notes || typeof notes !== 'object') return null
  const candidate =
    (notes as Record<string, unknown>).backpack_note_id ||
    (notes as Record<string, unknown>).backpackNoteId ||
    null
  return typeof candidate === 'string' ? candidate : null
}

function extractAttemptCount(notes: Record<string, unknown> | null | undefined) {
  if (!notes || typeof notes !== 'object') return null
  const value = (notes as Record<string, unknown>).attempt_count
  return typeof value === 'number' ? value : null
}

function extractFirstAttemptedAt(notes: Record<string, unknown> | null | undefined) {
  if (!notes || typeof notes !== 'object') return null
  const value = (notes as Record<string, unknown>).first_attempted_at
  return typeof value === 'string' ? value : null
}

function getPreviewText(detail: ErrorBookDetailRow) {
  const stem = detail.pack_questions?.stem || ''
  const cleaned = stem.replace(/\s+/g, ' ').trim()
  if (!cleaned) return '尚未擷取題目摘要'
  return cleaned.length > 80 ? `${cleaned.slice(0, 80)}…` : cleaned
}

function getAuthErrorMessage(type: AuthErrorType) {
  switch (type) {
    case 'invalid-jwt':
      return '登入狀態失效，請重新整理頁面或重新登入。'
    case 'unauthenticated':
      return '請登入後再查看錯題詳情。'
    case 'other':
      return '無法取得使用者資訊，請稍後再試。'
    default:
      return ''
  }
}

type PageProps = {
  params: { id: string }
}

export default async function ErrorBookDetailPage({ params }: PageProps) {
  const { user, errorType } = await getCurrentUser()

  if (!user) {
    const message = getAuthErrorMessage(errorType)
    if (!message) {
      notFound()
    }
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <Link
          href="/error-book"
          className="text-sm text-muted-foreground transition hover:text-foreground"
        >
          ← 返回錯題列表
        </Link>
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {message}
        </section>
      </main>
    )
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('error_book')
    .select(
      `
      *,
      pack_questions (
        id,
        stem,
        choices,
        answer,
        explanation,
        pack_id,
        packs (
          id,
          title,
          subject,
          skill
        )
      )
    `
    )
    .eq('user_id', user.id)
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    console.error('[ErrorBookDetailPage] Failed to fetch record', error)
  }

  if (!data) {
    notFound()
  }

  const detail = data as ErrorBookDetailRow
  const question = detail.pack_questions
  const pack = question?.packs
  const preview = getPreviewText(detail)
  const backpackNoteId = extractBackpackNoteId(detail.notes)
  const firstAttemptedAt = extractFirstAttemptedAt(detail.notes) || detail.created_at
  const attemptCount = extractAttemptCount(detail.notes)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      {/* Breadcrumb */}
      <header className="flex flex-col gap-1">
        <Link
          href="/error-book"
          className="text-sm text-muted-foreground transition hover:text-foreground"
        >
          ← 返回錯題列表
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {pack?.subject && <span>{pack.subject}</span>}
          {pack?.skill && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span>{pack.skill}</span>
            </>
          )}
          <span className="text-muted-foreground/60">·</span>
          <span>{detail.status === 'active' ? '進行中' : detail.status}</span>
        </div>
      </header>

      {/* Question + choices compact bar */}
      <section className="rounded-2xl border bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xs font-semibold text-muted-foreground">題目</h2>
          {question?.answer && (
            <Badge variant="outline" className="border-border/60 bg-background/40 px-2 py-0 text-[11px]">
              Correct: {question.answer}
            </Badge>
          )}
        </div>
        <div className="mt-2 space-y-3 text-sm leading-relaxed text-foreground">
          <p className="whitespace-pre-line">{question?.stem || '題目載入中'}</p>
          {question?.choices && question.choices.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {question.choices.map((choice, index) => (
                <span key={`${choice}-${index}`} className="flex items-baseline gap-1">
                  <span className="font-medium text-foreground">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span>{choice}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Explanation */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">詳解</h2>
          {backpackNoteId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/backpack?noteId=${backpackNoteId}`}>在 Backpack 中查看詳解</Link>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">尚未建立 Backpack 筆記</span>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          {question?.explanation ? (
            <MarkdownRenderer content={question.explanation} />
          ) : (
            <p className="text-sm text-muted-foreground">
              詳解內容將在 MCP 串接完成後顯示。
            </p>
          )}
          {/* Actions row */}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-4">
            <Button asChild size="sm" variant="outline">
              <Link
                href={
                  question
                    ? `/ask?${new URLSearchParams({
                        question: question.stem ?? '',
                        questionId: question.id,
                      }).toString()}`
                    : '/ask'
                }
              >
                重新練習
              </Link>
            </Button>
            <Button size="sm" variant="ghost" disabled>
              標記為已複習（即將推出）
            </Button>
          </div>
        </div>
      </section>

      {/* Attempts meta — compact summary with optional details */}
      <section className="mt-2 text-xs text-muted-foreground">
        <details className="rounded-2xl border bg-card px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
            <span>
              📅 作答紀錄：首次 {formatDate(firstAttemptedAt)} · 最近作答{' '}
              {formatDate(detail.last_attempted_at)} · 作答次數 {attemptCount ?? '—'}
            </span>
            <span className="text-[11px] text-muted-foreground/80">查看更多</span>
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground/80">建立時間</div>
              <div className="mt-0.5 font-medium text-foreground">{formatDate(detail.created_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground/80">作答次數</div>
              <div className="mt-0.5 font-medium text-foreground">{attemptCount ?? '—'}</div>
            </div>
          </div>
        </details>
      </section>
    </main>
  )
}

