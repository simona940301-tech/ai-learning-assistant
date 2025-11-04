import type { ExplainCard, EnglishQuestionInput } from '@/lib/contracts/explain'
import { ExplainCardSchema } from '@/lib/contracts/explain'

export interface ValidationResult {
  ok: boolean
  card: ExplainCard
  issues: string[]
}

/**
 * Validate ExplainCard completeness, alignment, and semantic hygiene
 */
export function validateCard(card: ExplainCard, input: EnglishQuestionInput): ValidationResult {
  const issues: string[] = []
  
  // 1. Schema validation
  const schemaResult = ExplainCardSchema.safeParse(card)
  if (!schemaResult.success) {
    issues.push(`Schema validation failed: ${schemaResult.error.message}`)
    return { ok: false, card, issues }
  }
  
  // 2. Completeness check (based on kind)
  const completenessIssues = checkCompleteness(card)
  issues.push(...completenessIssues)
  
  // 3. Alignment check (correct answer must be in options)
  const alignmentIssues = checkAlignment(card, input)
  issues.push(...alignmentIssues)
  
  // 4. Semantic hygiene (no subject labels, no empty paragraphs)
  const hygieneIssues = checkSemanticHygiene(card)
  issues.push(...hygieneIssues)
  
  // 5. Length check (option reasons should be reasonable)
  const lengthIssues = checkLengths(card)
  issues.push(...lengthIssues)
  
  // Log issues if any
  if (issues.length > 0) {
    console.warn('[ExplainPipeline] Validation issues:', issues)
  }

  // Check if card has minimum required fields (partial success allowed)
  const hasMinimalFields = !!(card.correct && card.translation)
  const hasCriticalIssues = issues.some(issue =>
    issue.includes('Schema validation failed') ||
    issue.includes('subject label')
  )

  // Allow partial success if no critical issues and has minimal fields
  return {
    ok: hasMinimalFields && !hasCriticalIssues,
    card,
    issues,
  }
}

/**
 * Check required fields based on card.kind
 */
function checkCompleteness(card: ExplainCard): string[] {
  const issues: string[] = []
  
  switch (card.kind) {
    case 'E1': // Meaning & Usage
      if (!card.translation) issues.push('E1 requires translation')
      if (card.cues.length === 0) issues.push('E1 requires cues')
      if (card.options.length === 0) issues.push('E1 requires options analysis')
      if (!card.correct) issues.push('E1 requires correct answer')
      break
    
    case 'E2': // Grammar & Syntax
      if (!card.translation) issues.push('E2 requires translation (can be brief)')
      if (card.steps.length === 0) issues.push('E2 requires steps')
      if (card.options.length === 0) issues.push('E2 requires options analysis')
      if (!card.correct) issues.push('E2 requires correct answer')
      break
    
    case 'E3': // Logic & Connector
      if (!card.translation) issues.push('E3 requires translation')
      if (card.cues.length === 0) issues.push('E3 requires cues (logic type)')
      if (card.options.length === 0) issues.push('E3 requires options analysis')
      if (!card.correct) issues.push('E3 requires correct answer')
      break
    
    case 'E4': // Reading & Context
      // E4 stores questions in meta.questions, steps are optional for backward compat
      // No longer require steps for E4 since explanation is in meta.questions
      if (!card.correct) issues.push('E4 requires correct answer')
      break
    
    case 'E5': // Dialog & Pragmatics
      if (!card.translation) issues.push('E5 requires translation (dialog)')
      if (card.cues.length === 0) issues.push('E5 requires cues (tone/intent)')
      if (card.options.length === 0) issues.push('E5 requires options analysis')
      if (!card.correct) issues.push('E5 requires correct answer')
      break
    
    case 'FALLBACK':
      if (!card.translation) issues.push('FALLBACK requires translation')
      if (card.options.length === 0) issues.push('FALLBACK requires options analysis')
      if (!card.correct) issues.push('FALLBACK requires correct answer')
      break
  }
  
  return issues
}

/**
 * Check that correct answer key exists in options
 */
function checkAlignment(card: ExplainCard, input: EnglishQuestionInput): string[] {
  const issues: string[] = []
  
  if (card.correct) {
    const optionKeys = card.options.map((o) => o.key)
    const inputKeys = input.options.map((o) => o.key)
    
    if (!optionKeys.includes(card.correct.key) && !inputKeys.includes(card.correct.key)) {
      issues.push(`Correct answer key "${card.correct.key}" not found in options`)
    }
  }
  
  return issues
}

/**
 * Check semantic hygiene: no subject labels, no empty strings
 */
function checkSemanticHygiene(card: ExplainCard): string[] {
  const issues: string[] = []
  
  // Check for subject labels (case-insensitive)
  const allText = [
    card.translation,
    ...card.cues,
    ...card.options.flatMap((o) => [o.text, o.zh, o.reason]),
    ...card.steps.flatMap((s) => [s.title, s.detail]),
    card.correct?.reason,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  
  if (/\b(subject|科目|english|math|chinese)\s*[:：]/i.test(allText)) {
    issues.push('Found subject label in card content (should not display subject tags)')
  }
  
  // Check for empty strings in important fields
  if (card.translation === '') issues.push('Translation is empty string')
  
  card.cues.forEach((cue, i) => {
    if (cue.trim() === '') issues.push(`Cue[${i}] is empty`)
  })
  
  card.options.forEach((opt, i) => {
    if (opt.reason && opt.reason.trim() === '') {
      issues.push(`Option[${i}].reason is empty string`)
    }
  })
  
  return issues
}

/**
 * Check that text lengths are reasonable
 */
function checkLengths(card: ExplainCard): string[] {
  const issues: string[] = []
  
  const MAX_REASON_LENGTH = 160
  
  card.options.forEach((opt, i) => {
    if (opt.reason && opt.reason.length > MAX_REASON_LENGTH) {
      // Truncate instead of failing
      opt.reason = opt.reason.slice(0, MAX_REASON_LENGTH - 1) + '…'
      issues.push(`Option[${i}].reason truncated (was > ${MAX_REASON_LENGTH} chars)`)
    }
  })
  
  if (card.correct?.reason && card.correct.reason.length > MAX_REASON_LENGTH) {
    card.correct.reason = card.correct.reason.slice(0, MAX_REASON_LENGTH - 1) + '…'
    issues.push(`Correct.reason truncated (was > ${MAX_REASON_LENGTH} chars)`)
  }
  
  return issues
}

