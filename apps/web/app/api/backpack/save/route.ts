import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveBackpackNote } from '@/lib/supabase'
import { trackAPICall, trackError } from '@/lib/heartbeat'
import type { ContractV2Response } from '@/lib/contract-v2'
export const dynamic = 'force-dynamic'

import { getSupabaseClient, getApiUser } from '@/lib/api/auth'

// Schema for saving from Contract v2 response
const SaveFromContractSchema = z.object({
  user_id: z.string().min(1),
  contract_response: z.object({
    phase: z.string(),
    subject: z.string(),
    keypoint: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      category: z.string().optional(),
    }).optional(),
    question: z.object({
      stem: z.string(),
    }).optional(),
    explanation: z.object({
      summary: z.string(),
      steps: z.array(z.string()),
      checks: z.array(z.string()),
      error_hints: z.array(z.string()),
      extensions: z.array(z.string()),
    }).optional(),
  }),
})

// Enhanced schema with conversation history support
const SaveEnhancedSchema = z.object({
  user_id: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().min(1),
  content: z.string().min(1),
  include_conversation: z.boolean().optional(),
  conversation_history: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    createdAt: z.string().optional(),
  })).optional(),
})

// Legacy schema for backward compatibility
const SaveLegacySchema = z.object({
  user_id: z.string().min(1),
  question: z.string().min(1),
  canonical_skill: z.string().min(1),
  note_md: z.string().min(1),
  subject: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // SECURITY FIX: Always require authentication
    // Previous implementation had conditional auth which was insecure
    const { user, errorType } = await getApiUser(request)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
            ? 'Authentication required'
            : 'Authentication error occurred'

      trackError(`Backpack save unauthorized: ${errorType}`)
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message,
          errorType,
        },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Try Enhanced format first (with conversation history)
    const enhancedParse = SaveEnhancedSchema.safeParse(body)
    if (enhancedParse.success) {
      const { user_id, title, subject, content, include_conversation, conversation_history } = enhancedParse.data
      // SECURITY: Always use authenticated user ID, ignore client-provided user_id
      const finalUserId = user.id

      // Build markdown content with conversation if requested
      let finalContent = content

      if (include_conversation && conversation_history && conversation_history.length > 0) {
        finalContent += '\n\n---\n\n## 📝 AI 問答記錄\n\n'

        for (const message of conversation_history) {
          if (message.role === 'user') {
            finalContent += `### 問：\n${message.content}\n\n`
          } else if (message.role === 'assistant') {
            finalContent += `### 答：\n${message.content}\n\n`
          }
        }
      }

      // Save to notebook_entries
      const supabase = getSupabaseClient(request)
      const { data, error } = await supabase
        .from('notebook_entries')
        .insert({
          user_id: finalUserId,
          title,
          content_md: finalContent,
          source_type: 'summary',
          tags: [subject],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to save to notebook: ${error.message}`)
      }

      const latency = Date.now() - startTime
      trackAPICall('/api/backpack/save', latency, true)

      return NextResponse.json({ data, saved: true })
    }

    // Try Contract v2 format
    const contractParse = SaveFromContractSchema.safeParse(body)
    if (contractParse.success) {
      const { user_id, contract_response } = contractParse.data
      // SECURITY: Always use authenticated user ID, ignore client-provided user_id
      const finalUserId = user.id

      // Extract data from Contract v2 response
      const question = contract_response.question?.stem || 'No question provided'
      const canonical_skill = contract_response.keypoint?.name || contract_response.subject

      // Build markdown note from explanation
      let note_md = `# ${canonical_skill}\n\n`

      if (contract_response.explanation) {
        const { summary, steps, checks, error_hints } = contract_response.explanation

        note_md += `## 概念總結\n${summary}\n\n`

        if (steps.length > 0) {
          note_md += `## 解題步驟\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`
        }

        if (checks.length > 0) {
          note_md += `## 檢查清單\n${checks.map(c => `- ${c}`).join('\n')}\n\n`
        }

        if (error_hints.length > 0) {
          note_md += `## 常見錯誤\n${error_hints.map(e => `- ${e}`).join('\n')}\n\n`
        }
      }

      const data = await saveBackpackNote({
        user_id: finalUserId,
        question,
        canonical_skill,
        note_md,
      })

      const latency = Date.now() - startTime
      trackAPICall('/api/backpack/save', latency, true)

      return NextResponse.json({ data, saved: true })
    }

    // Fallback to legacy format
    const legacyParse = SaveLegacySchema.safeParse(body)
    if (legacyParse.success) {
      const { user_id, question, canonical_skill, note_md, subject } = legacyParse.data
      // SECURITY: Always use authenticated user ID, ignore client-provided user_id
      const finalUserId = user.id

      // Use subject if provided, otherwise fallback to canonical_skill
      // This ensures we use the user-confirmed subject from the dialog
      const finalSubject = subject || canonical_skill

      // Save to notebook_entries (not backpack_notes)
      const supabase = getSupabaseClient(request)
      const { data, error } = await supabase
        .from('notebook_entries')
        .insert({
          user_id: finalUserId,
          title: question,
          content_md: note_md,
          source_type: 'summary', // RAG analysis summary
          tags: [finalSubject],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to save to notebook: ${error.message}`)
      }

      const latency = Date.now() - startTime
      trackAPICall('/api/backpack/save', latency, true)

      return NextResponse.json({ data, saved: true })
    }

    // If neither format matches, return validation error
    trackError('Invalid save request format')
    return NextResponse.json(
      {
        error: 'invalid_format',
        message: 'Request must match either Contract v2 or legacy format',
      },
      { status: 400 }
    )

  } catch (error) {
    const latency = Date.now() - startTime
    trackAPICall('/api/backpack/save', latency, false)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    trackError(`Backpack save error: ${errorMessage}`)
    console.error('Backpack save error', error)

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
