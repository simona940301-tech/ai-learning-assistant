import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveBackpackNote } from '@/lib/supabase'
import { trackAPICall, trackError } from '@/lib/heartbeat'
import type { ContractV2Response } from '@/lib/contract-v2'

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

// Legacy schema for backward compatibility
const SaveLegacySchema = z.object({
  user_id: z.string().min(1),
  question: z.string().min(1),
  canonical_skill: z.string().min(1),
  note_md: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()

    // Try Contract v2 format first
    const contractParse = SaveFromContractSchema.safeParse(body)
    if (contractParse.success) {
      const { user_id, contract_response } = contractParse.data

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
        user_id,
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
      const { user_id, question, canonical_skill, note_md } = legacyParse.data

      const data = await saveBackpackNote({
        user_id,
        question,
        canonical_skill,
        note_md,
      })

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
