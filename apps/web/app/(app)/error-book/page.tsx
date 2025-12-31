import { notFound } from 'next/navigation'
import ErrorBookListClient, { ErrorBookListItem } from './ErrorBookListClient'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, type AuthErrorType } from '@/lib/auth/getCurrentUser'

type ErrorBookRow = {
  id: string
  question_id: string
  status: string
  created_at: string
  last_attempted_at: string | null
  notes: Record<string, unknown> | null
  pack_questions: {
    id: string
    stem: string | null
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

function getPreview(row: ErrorBookRow) {
  const stem = row.pack_questions?.stem || ''
  const cleaned = stem.replace(/\s+/g, ' ').trim()
  if (!cleaned) return '（沒有題幹內容）'
  return cleaned.length > 60 ? `${cleaned.slice(0, 60)}…` : cleaned
}

function extractBackpackNoteId(notes: Record<string, unknown> | null | undefined) {
  if (!notes || typeof notes !== 'object') return null
  const candidate =
    (notes as Record<string, unknown>).backpack_note_id ||
    (notes as Record<string, unknown>).backpackNoteId ||
    null
  return typeof candidate === 'string' ? candidate : null
}

function getAuthErrorMessage(type: AuthErrorType) {
  switch (type) {
    case 'invalid-jwt':
      return '登入狀態失效，請重新整理頁面或重新登入。'
    case 'unauthenticated':
      return '請登入後再查看錯題本。'
    case 'other':
      return '無法取得使用者資訊，請稍後再試。'
    default:
      return ''
  }
}

export default async function ErrorBookPage() {
  const { user, errorType } = await getCurrentUser()

  if (!user) {
    const authMessage = getAuthErrorMessage(errorType)
    if (!authMessage) {
      notFound()
    }
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <ErrorBookListClient items={[]} errorMessage={authMessage} />
      </main>
    )
  }

  // 🎯 SOTA FIX: Use Service Role client to bypass RLS for packs/pack_questions join
  // This is required because PVE packs are private/system-owned and not visible to normal users
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const adminClient = await import('@supabase/supabase-js').then(mod =>
    mod.createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  )

  const { data, error } = await adminClient
    .from('error_book')
    .select(
      `
      *,
      pack_questions (
        id,
        stem,
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
    .eq('status', 'active')
    .order('last_attempted_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[ErrorBookPage] Failed to load error book items', error)
  }

  const rows = (data || []) as ErrorBookRow[]

  const items: ErrorBookListItem[] = rows.map(row => {
    const question = row.pack_questions
    const pack = question?.packs
    const backpackNoteId = extractBackpackNoteId(row.notes)
    return {
      id: row.id,
      questionId: row.question_id,
      preview: getPreview(row),
      subject: pack?.subject,
      packName: pack?.title,
      packSkill: pack?.skill,
      status: row.status,
      createdAt: row.created_at,
      lastAttemptedAt: row.last_attempted_at,
      hasBackpackNote: Boolean(backpackNoteId),
    }
  })

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <ErrorBookListClient items={items} errorMessage={error?.message} />
    </main>
  )
}

