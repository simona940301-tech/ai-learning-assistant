/**
 * AI Structure: Generate structured explanation with machine-verifiable JSON
 * 
 * Outputs:
 * 1. Human-readable Markdown (Lite Spec v1)
 * 2. Machine JSON with character spans for alignment verification
 */

import { chatCompletionJSON } from '@/lib/openai'

export interface AiMachineBlock {
  qno?: string
  start_end?: [number, number]
  options?: Array<{
    key: string
    start_end?: [number, number]
  }>
  missing?: string[]
}

export interface AiMachine {
  blocks: AiMachineBlock[]
  kind_guess?: 'grammar' | 'cloze' | 'reading' | 'translation' | 'other'
  confidence?: number
}

export interface AiStructureResult {
  humanMarkdown: string
  machine?: AiMachine
  status: 'ok' | 'retry' | 'degraded'
  errors?: string[]
}

/**
 * Normalize text for comparison (same as option-parser)
 */
function normalize(text: string): string {
  return text
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[（(]/g, '(')
    .replace(/[）)]/g, ')')
    .replace(/[。．]/g, '.')
    .replace(/\u3000/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check if a span matches expected text
 */
function sliceEquals(
  raw: string,
  start: number,
  end: number,
  expected: string
): boolean {
  const slice = normalize(raw.slice(start, end))
  const exp = normalize(expected)
  // Remove option labels like (A), (B) before comparison
  const cleanSlice = slice.replace(/^\s*[（(]?\s*[A-E]\s*[）).、:]?\s*/, '')
  const cleanExp = exp.replace(/^\s*[（(]?\s*[A-E]\s*[）).、:]?\s*/, '')
  return cleanSlice === cleanExp
}

/**
 * Validate alignment: check if option spans match raw text
 */
function validateAlignment(
  raw: string,
  machine: AiMachine
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const block of machine.blocks) {
    if (!block.start_end) continue

    const [start, end] = block.start_end
    if (start < 0 || end > raw.length || start >= end) {
      errors.push(`Invalid block span: [${start}, ${end}] for length ${raw.length}`)
      continue
    }

    if (block.options) {
      for (const opt of block.options) {
        if (!opt.start_end) {
          errors.push(`Missing span for option ${opt.key}`)
          continue
        }

        const [optStart, optEnd] = opt.start_end
        if (optStart < start || optEnd > end || optStart >= optEnd) {
          errors.push(
            `Option ${opt.key} span [${optStart}, ${optEnd}] out of block range [${start}, ${end}]`
          )
          continue
        }

        // Try to extract option text from raw (basic validation)
        const optText = raw.slice(optStart, optEnd)
        if (!/[A-E]/.test(optText)) {
          errors.push(`Option ${opt.key} span does not contain option marker`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate structure: check if blocks and options are valid
 */
function validateStructure(machine: AiMachine): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!machine.blocks || machine.blocks.length === 0) {
    errors.push('No blocks found')
  }

  for (const block of machine.blocks) {
    if (block.options) {
      if (block.options.length < 2) {
        errors.push(`Block has less than 2 options: ${block.options.length}`)
      }
      if (block.options.length > 6) {
        errors.push(`Block has more than 6 options: ${block.options.length}`)
      }

      // Check for duplicate keys
      const keys = block.options.map((o) => o.key)
      const uniqueKeys = new Set(keys)
      if (keys.length !== uniqueKeys.size) {
        errors.push(`Duplicate option keys in block: ${keys.join(', ')}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate semantics: check if ANSWER exists in options
 */
function validateSemantics(
  humanMarkdown: string,
  machine: AiMachine
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Extract ANSWER from markdown
  const answerMatch = humanMarkdown.match(/^ANSWER:\s*(.+)$/im)
  if (!answerMatch) {
    errors.push('ANSWER not found in markdown')
    return { valid: false, errors }
  }

  const answerText = answerMatch[1].trim().toUpperCase()
  const answerKey = answerText.match(/^[A-E]/)?.[0]

  // Check if answer key exists in any block
  if (answerKey) {
    const hasKey = machine.blocks.some((block) =>
      block.options?.some((opt) => opt.key === answerKey)
    )
    if (!hasKey) {
      errors.push(`Answer key ${answerKey} not found in any block options`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Parse AI output: split human markdown and machine JSON
 */
function parseAiOutput(output: string): { humanMarkdown: string; machineJson?: string } {
  const separator = '---'
  const parts = output.split(separator)

  if (parts.length === 1) {
    // No separator, assume all markdown
    return { humanMarkdown: output.trim() }
  }

  const humanMarkdown = parts[0].trim()
  const machineJson = parts.slice(1).join(separator).trim()

  return { humanMarkdown, machineJson }
}

/**
 * Generate structured explanation with AI
 */
export async function generateAiStructure(
  rawInput: string,
  retryOnFailure: boolean = true
): Promise<AiStructureResult> {
  const SYSTEM_PROMPT = `You transform messy exam text into two synchronized outputs:

(1) Human-readable Markdown using a minimal anchor format:

- Start by printing the question text as the first visible content.
- Use these anchors (order flexible; some may be missing): ANSWER:, WHY:, OPTIONS:, EVIDENCE:, FOCUS:, TRAPS:, ZH:, VOCAB:
- ANSWER: and WHY: must be one line each.
- OPTIONS: must be a verbatim echo from the original text; never paraphrase or invent items.
- Keep each section ≤ 400 characters. Avoid tables.

(2) Machine-checkable JSON for alignment against the original raw text:

- Include the question blocks with character spans [start,end) that slice the raw input exactly.
- Each option includes its [start,end) span.
- Include a coarse kind_guess (grammar/cloze/reading/translation/other) and a confidence 0..1.

Never output code fences around JSON. Never add commentary outside the two outputs.`

  const USER_PROMPT = `RAW INPUT (verbatim):

<<<
${rawInput}
>>>

TASK:

1) Print the human-readable explanation first, following the anchor rules above (Lite Spec v1).

2) Then print a blank line with '---'.

3) Then print only the JSON on the next line, with this schema:

{
  "blocks": [
    {
      "qno": "(1) | Q1 | 1",
      "start_end": [qStart, qEnd],
      "options": [
        {"key": "A", "start_end": [oAStart, oAEnd]},
        {"key": "B", "start_end": [oBStart, oBEnd]},
        {"key": "C", "start_end": [oCStart, oCEnd]},
        {"key": "D", "start_end": [oDStart, oDEnd]}
      ]
    }
  ],
  "kind_guess": "grammar|cloze|reading|translation|other",
  "confidence": 0.0
}

CONSTRAINTS:

- OPTIONS spans must slice the exact original characters (after normalizing fullwidth/whitespace).
- If an item is missing from RAW INPUT, include it under "missing": ["A",...], and omit that option's span.
- If there are multiple questions, include multiple blocks in order of appearance.
- Do not fabricate text. Prefer leaving fields missing with an explicit reason.
- Temperature = 0 behavior is assumed; be deterministic.

Return the two outputs now.`

  try {
    // Call OpenAI API
    const response = await chatCompletionJSON({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT },
      ],
      temperature: 0,
      max_tokens: 4000,
    })

    const output = response.content || ''
    const { humanMarkdown, machineJson } = parseAiOutput(output)

    if (!machineJson) {
      return {
        humanMarkdown,
        status: 'degraded',
        errors: ['Machine JSON not found in AI output'],
      }
    }

    // Parse machine JSON
    let machine: AiMachine
    try {
      machine = JSON.parse(machineJson) as AiMachine
    } catch (e) {
      return {
        humanMarkdown,
        status: 'degraded',
        errors: [`Failed to parse machine JSON: ${e instanceof Error ? e.message : 'Unknown error'}`],
      }
    }

    // Run three validation gates
    const alignment = validateAlignment(rawInput, machine)
    const structure = validateStructure(machine)
    const semantics = validateSemantics(humanMarkdown, machine)

    const allErrors = [...alignment.errors, ...structure.errors, ...semantics.errors]

    if (allErrors.length === 0) {
      return {
        humanMarkdown,
        machine,
        status: 'ok',
      }
    }

    // Retry once if enabled
    if (retryOnFailure && alignment.errors.length > 0) {
      console.warn('[ai-structure] Validation failed, retrying...', allErrors)

      // Retry with feedback
      const retryPrompt = `${USER_PROMPT}

VALIDATION FAILED:
${allErrors.join('\n')}

Please fix the span values to match the RAW INPUT exactly. Do not rewrite the text, only adjust the numeric spans.`

      const retryResponse = await chatCompletionJSON({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: retryPrompt },
        ],
        temperature: 0,
        max_tokens: 4000,
      })

      const retryOutput = retryResponse.content || ''
      const retryParsed = parseAiOutput(retryOutput)

      if (retryParsed.machineJson) {
        try {
          const retryMachine = JSON.parse(retryParsed.machineJson) as AiMachine
          const retryAlignment = validateAlignment(rawInput, retryMachine)
          const retryStructure = validateStructure(retryMachine)
          const retrySemantics = validateSemantics(retryParsed.humanMarkdown, retryMachine)

          const retryErrors = [
            ...retryAlignment.errors,
            ...retryStructure.errors,
            ...retrySemantics.errors,
          ]

          if (retryErrors.length === 0) {
            return {
              humanMarkdown: retryParsed.humanMarkdown,
              machine: retryMachine,
              status: 'ok',
            }
          }

          return {
            humanMarkdown: retryParsed.humanMarkdown,
            machine: retryMachine,
            status: 'degraded',
            errors: retryErrors,
          }
        } catch (e) {
          // Retry parse failed
        }
      }
    }

    // Return degraded result
    return {
      humanMarkdown,
      machine,
      status: 'degraded',
      errors: allErrors,
    }
  } catch (error) {
    console.error('[ai-structure] Error generating structure:', error)
    return {
      humanMarkdown: `無法生成結構化詳解：${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 'degraded',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}




