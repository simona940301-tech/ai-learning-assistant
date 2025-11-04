import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { orchestrateEnglishExplanation } from '@/lib/english'
import { ExplainCardSchema } from '@/lib/contracts/explain'

// Input Schema with tolerance
const InputSchema = z
  .object({
    text: z.string().trim().optional(),
    imageBase64: z.string().trim().optional(),
    voiceText: z.string().trim().optional(),
    subjectHint: z.enum(['english', 'math', 'chinese', 'social', 'science']).optional(),
    // Legacy support
    questionText: z.string().trim().optional(),
    // For English router (optional)
    options: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
  })
  .refine(
    (d) => !!(d.text || d.imageBase64 || d.voiceText || d.questionText),
    { message: 'One of text/imageBase64/voiceText/questionText is required' }
  )

/**
 * Detect subject from question text (simple heuristic)
 */
async function detectSubjectFromText(text: string): Promise<'english' | 'math' | 'chinese' | 'social' | 'science'> {
  const lower = text.toLowerCase()
  
  // 檢查是否為閱讀理解題型（包含 passage + questions）
  const questionMarkerRegex = /(?:question|問題|q\d+|\([0-9０-９]+\)|（[0-9０-９]+）|（\s*）\s*\([0-9]+\))/i
  const optionRegex = /\([A-DＡ-Ｄ]\)|（[A-DＡ-Ｄ]）/
  
  const hasReadingPattern = 
    // 包含長段落（>200 字）
    (text.length > 200 && /[a-z]{3,}/i.test(text)) ||
    // 包含問題標記（Question, 問題, Q, (1), (２), （ ）(１) 等）
    questionMarkerRegex.test(text) ||
    // 包含選項格式
    optionRegex.test(text)
  
  // English: 包含英文單詞和常見模式
  const hasEnglishWords = /[a-z]{3,}/i.test(lower)
  const hasEnglishOptions = /\([A-D]\)|（[A-D]）|\([A-DＡ-Ｄ]\)|（[A-DＡ-Ｄ]）/i.test(text)
  const hasQuestionMarkers = /(?:question|問題|q\d+|\([0-9]+\)|（[0-9]+）)/i.test(text)
  
  // 如果明確是閱讀理解或英文題型，優先返回 english
  if (hasReadingPattern || (hasEnglishWords && (hasEnglishOptions || hasQuestionMarkers))) {
    return 'english'
  }
  
  // Math: 包含數字、運算符、方程式
  const hasMathPattern = /[\d+\-*/=]+/.test(text) || /[xy]\^?\d/.test(lower)
  const hasMathKeywords = /\b(cos|sin|tan|log|ln|integral|derivative|matrix|vector|三角形|向量|矩陣|函數|方程式)\b/i.test(text)
  
  // 如果沒有明顯的英文內容，且包含數學模式，才判斷為 math
  if (hasMathPattern && hasMathKeywords && !hasEnglishWords) {
    return 'math'
  }
  
  // Default: 如果包含英文單詞，優先判斷為 english
  return hasEnglishWords ? 'english' : 'english'
}

/**
 * Extract pure stem from question text (remove options)
 */
function extractStemFromQuestion(
  text: string,
  options: Array<{ key: string; text: string }>,
  opts?: { preserveOptions?: boolean }
): string {
  const preserveOptions = opts?.preserveOptions ?? false

  // If preserveOptions is true, return normalized text without stripping options
  if (preserveOptions) {
    // Only do minimal normalization: trim and normalize whitespace
    return text.replace(/\s+/g, ' ').trim()
  }

  let stem = text

  // Remove all options from the text
  for (const opt of options) {
    // Try to remove various option formats
    const patterns = [
      new RegExp(`\\(${opt.key}\\)\\s*${opt.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
      new RegExp(`${opt.key}\\)\\s*${opt.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
      new RegExp(`${opt.key}\\.\\s*${opt.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
    ]

    for (const pattern of patterns) {
      stem = stem.replace(pattern, '')
    }
  }

  // Clean up extra whitespace and newlines
  stem = stem.replace(/\s+/g, ' ').trim()

  return stem
}

/**
 * Detect if text should preserve options for reading comprehension
 * Heuristic: long passage + option markers + possibly multiple questions
 */
function shouldPreserveOptions(text: string, options: Array<{ key: string; text: string }> | null): {
  preserve: boolean
  reason: string
  details: {
    hasOptionLabels: boolean
    looksLikePassage: boolean
    multiQuestionHint: boolean
    textLength: number
  }
} {
  const FEATURE_FLAG = process.env.NEXT_PUBLIC_PRESERVE_OPTIONS_READING !== '0'

  if (!FEATURE_FLAG) {
    return {
      preserve: false,
      reason: 'feature flag disabled',
      details: { hasOptionLabels: false, looksLikePassage: false, multiQuestionHint: false, textLength: text.length },
    }
  }

  // Check for option labels (A-D markers)
  const optionLabelRegex = /(^|\s)[\(（]?[A-Da-d][\)）\.、]/m
  const matches = text.match(optionLabelRegex)
  const hasOptionLabels = matches !== null && matches.length >= 2

  // Check if looks like a passage (long text or multiple paragraphs)
  const textLength = text.length
  const sentenceCount = (text.match(/[.!?。！？]/g) || []).length
  const paragraphBreaks = (text.match(/\n\s*\n/g) || []).length
  const looksLikePassage = textLength >= 400 || sentenceCount >= 3 || paragraphBreaks >= 1

  // Check for multiple question hints (Q1, Q2, etc.)
  const multiQuestionRegex = /Q\d+|問題\s*\d+|Question\s+\d+|\([0-9０-９]+\)|（[0-9０-９]+）/gi
  const questionMatches = text.match(multiQuestionRegex)
  const multiQuestionHint = questionMatches !== null && questionMatches.length >= 2

  // Decide: preserve if has option labels AND looks like passage
  const preserve = hasOptionLabels && looksLikePassage

  const reason = preserve
    ? `hasOptionLabels=${hasOptionLabels}, looksLikePassage=${looksLikePassage}, length=${textLength}`
    : 'heuristic not triggered'

  return {
    preserve,
    reason,
    details: {
      hasOptionLabels,
      looksLikePassage,
      multiQuestionHint,
      textLength,
    },
  }
}

/**
 * Parse options from question text (e.g., "(A) text (B) text")
 * Enhanced to handle various formats with better debugging
 */
function parseOptionsFromText(text: string): Array<{ key: string; text: string }> | null {
  console.log('[parseOptionsFromText] Input text length:', text.length)
  console.log('[parseOptionsFromText] Input text preview:', text.substring(0, 200) + '...')
  
  // Try multiple patterns with explicit flags
  const patterns = [
    // Full-width letters with regular parentheses: (Ａ), (Ｂ), (Ｃ), (Ｄ)
    { regex: /\(([Ａ-Ｅ])\)\s*([^\(\)]+?)(?=\s*\([Ａ-Ｅ]\)|$)/gi, name: 'fullwidth_parentheses' },
    // Regular parentheses: (A), (B), (C), (D)
    { regex: /\(([A-E])\)\s*([^\(\)]+?)(?=\s*\([A-E]\)|$)/gi, name: 'parentheses' },
    // Full-width letter with paren: Ａ), Ｂ), Ｃ), Ｄ)
    { regex: /\b([Ａ-Ｅ])\)\s+([^\n]+)/gi, name: 'fullwidth_letter_paren' },
    // Regular letter with paren: A), B), C), D)
    { regex: /\b([A-E])\)\s+([^\n]+)/gi, name: 'letter_paren' },
    // Full-width letter with dot: Ａ., Ｂ., Ｃ., Ｄ.
    { regex: /^([Ａ-Ｅ])\.\s+([^\n]+)/gim, name: 'fullwidth_letter_dot' },
    // Regular letter with dot: A., B., C., D.
    { regex: /^([A-E])\.\s+([^\n]+)/gim, name: 'letter_dot' },
    // 支持換行格式：每行一個選項
    { regex: /^\(([Ａ-Ｅ])\)\s+(.+)$/gim, name: 'fullwidth_multiline' },
    { regex: /^\(([A-E])\)\s+(.+)$/gim, name: 'multiline' },
  ]
  
  for (const { regex, name } of patterns) {
    console.log(`[parseOptionsFromText] Trying pattern: ${name}`)
    
    // Reset regex lastIndex
    regex.lastIndex = 0
    
    const matches: RegExpExecArray[] = []
    let match: RegExpExecArray | null
    
    while ((match = regex.exec(text)) !== null) {
      matches.push(match)
      if (matches.length > 10) break // Prevent infinite loop
    }
    
    console.log(`[parseOptionsFromText] Pattern ${name} found ${matches.length} matches`)
    
    if (matches.length >= 2) {
      const result = matches.map((m) => {
        // Convert full-width letters to regular letters
        let key = m[1].toUpperCase()
        if (key === 'Ａ') key = 'A'
        else if (key === 'Ｂ') key = 'B'
        else if (key === 'Ｃ') key = 'C'
        else if (key === 'Ｄ') key = 'D'
        else if (key === 'Ｅ') key = 'E'
        
        return {
          key,
          text: m[2].trim(),
        }
      })
      
      console.log('[parseOptionsFromText] Success with pattern:', name)
      console.log('[parseOptionsFromText] Result:', result)
      
      return result
    }
  }
  
  console.warn('[parseOptionsFromText] No options found in text')
  console.warn('[parseOptionsFromText] Text content:', text)
  return null
}

// Removed convertEnglishCardToLegacyFormat - API now returns only new ExplainCard format

/**
 * POST: Solve question
 */
export async function POST(request: NextRequest) {
  const start = Date.now()
  
  try {
    // Parse and validate input
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { errorCode: 'INVALID_JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    const input = InputSchema.parse(body)
    const questionText = input.text || input.questionText || input.voiceText || ''

    // Detect subject if not provided
    const subject = input.subjectHint || (await detectSubjectFromText(questionText))
    
    // ====== NEW: English Router Pipeline ======
    if (subject === 'english' && process.env.EN_EXPLAIN_ROUTER_V1 !== 'false') {
      console.log('[route-solver] Using English explanation pipeline...')
      
      // Parse options from question text if not provided
      const options = input.options || parseOptionsFromText(questionText)
      
      console.log('[route-solver] Parsed options:', options)
      
      // 即使沒有 options，如果文本包含閱讀理解標記，也嘗試處理
      if (!options || options.length === 0) {
        // 檢查是否為閱讀理解題型（包含 passage + questions）
        const questionMarkerRegex2 = /(?:question|問題|q\d+|\([0-9]+\)|（[0-9]+）|（\s*）\s*\([0-9]+\))/i
        const hasReadingPattern = 
          questionText.length > 200 ||
          questionMarkerRegex2.test(questionText) ||
          questionText.includes('?')
        
        if (hasReadingPattern) {
          console.log('[route-solver] Reading pattern detected but no options found, using full text as stem')
          // 對於閱讀理解題，即使沒有 options 也繼續處理
          const englishResult = await orchestrateEnglishExplanation({
            stem: questionText,
            options: [], // 空 options，讓 parser 自己解析
            meta: { subjectHint: subject },
          })

          console.log('[route-solver] English result received:', {
            cardId: englishResult.card.id,
            kind: englishResult.card.kind,
            routing: englishResult.routing.type,
          })

          const cardValidation = ExplainCardSchema.safeParse(englishResult.card)
          if (!cardValidation.success) {
            console.error('[route-solver] Card validation failed:', cardValidation.error.issues)
            // 繼續 fallback
          } else {
            // API Boundary: Log before returning
            const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true'
            if (DEBUG) {
              const card = cardValidation.data
              const meta = card.meta as any
              const sampleQuestions = Array.isArray(meta?.questions) ? meta.questions : []
              console.log('[API boundary] explain.keys:', Object.keys(card))
              console.log('[API boundary] sample meta.questions:', sampleQuestions.map((q: any) => ({
                id: q.id,
                keys: Object.keys(q),
                reasoning: q.reasoning ? String(q.reasoning).substring(0, 60) : 'missing',
                counterpoints: q.counterpoints ? Object.keys(q.counterpoints) : 'missing',
                common_mistake: q.common_mistake ? String(q.common_mistake).substring(0, 60) : 'missing',
                evidence: q.evidence ? String(q.evidence).substring(0, 60) : 'missing',
              })))
            }
            
            return NextResponse.json({
              subject: 'english',
              question: questionText,
              explanation: {
                card: cardValidation.data,
              },
              routing: englishResult.routing,
              meta: {
                questionId: cardValidation.data.id,
                subjectHint: 'english' as const,
                pipeline: 'english_router_v1',
              },
              _meta: { latency_ms: Date.now() - start },
            })
          }
        } else {
          console.warn('[route-solver] No options found for English question, falling back to hybrid solve')
        }
      } else {
        // Detect if we should preserve options for reading comprehension
        const preserveDecision = shouldPreserveOptions(questionText, options)

        if (preserveDecision.preserve) {
          console.log('[english/router] preserveOptions=true reason:', preserveDecision.reason)
          console.log('[english/router] preserve details:', preserveDecision.details)
        }

        // Extract stem (preserve options for reading, strip for other types)
        const stem = extractStemFromQuestion(questionText, options, {
          preserveOptions: preserveDecision.preserve,
        })

        if (!preserveDecision.preserve) {
          console.log('[route-solver] Pure stem (options stripped):', stem.substring(0, 200))
        } else {
          console.log('[route-solver] Full stem (options preserved):', stem.substring(0, 200))
        }

        console.log('[route-solver] Calling orchestrateEnglishExplanation...')
        const englishResult = await orchestrateEnglishExplanation({
          stem: stem,
          options,
          meta: { subjectHint: subject },
        })

        console.log('[route-solver] English result received:', {
          cardId: englishResult.card.id,
          kind: englishResult.card.kind,
          routing: englishResult.routing.type,
        })

        // Validate card with schema before returning
        const cardValidation = ExplainCardSchema.safeParse(englishResult.card)

        if (!cardValidation.success) {
          console.error('[route-solver] Card validation failed:', cardValidation.error.issues)
          console.warn('[route-solver] Using fallback card due to validation failure')

          // Generate fallback card
          const fallbackCard = {
            id: nanoid(),
            question: stem,
            kind: 'FALLBACK' as const,
            translation: '解析生成失敗，請稍後再試',
            cues: [],
            options: options.map((opt) => ({
              key: opt.key,
              text: opt.text,
              verdict: 'unknown' as const,
            })),
            steps: [],
            vocab: [],
            nextActions: [
              { label: '換同型題', action: 'drill-similar' },
              { label: '加入錯題本', action: 'save-error' },
            ],
          }

          return NextResponse.json({
            subject: 'english',
            question: questionText,
            explanation: {
              card: fallbackCard,
            },
            routing: { type: 'FALLBACK', confidence: 0.5, signals: ['validation_failed'] },
            meta: {
              questionId: fallbackCard.id,
              subjectHint: 'english' as const,
              pipeline: 'english_router_v1_fallback',
            },
            _meta: { latency_ms: Date.now() - start },
          })
        }

        // API Boundary: Log before returning
        const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true'
        if (DEBUG) {
          const card = cardValidation.data
          const meta = card.meta as any
          const sampleQuestions = Array.isArray(meta?.questions) ? meta.questions : []
          console.log('[API boundary] explain.keys:', Object.keys(card))
          console.log('[API boundary] sample meta.questions:', sampleQuestions.map((q: any) => ({
            id: q.id,
            keys: Object.keys(q),
            reasoning: q.reasoning ? String(q.reasoning).substring(0, 60) : 'missing',
            counterpoints: q.counterpoints ? Object.keys(q.counterpoints) : 'missing',
            common_mistake: q.common_mistake ? String(q.common_mistake).substring(0, 60) : 'missing',
            evidence: q.evidence ? String(q.evidence).substring(0, 60) : 'missing',
          })))
        }
        
        // Return validated card
        return NextResponse.json({
          subject: 'english',
          question: questionText,
          explanation: {
            card: cardValidation.data,
          },
          routing: englishResult.routing,
          meta: {
            questionId: cardValidation.data.id,
            subjectHint: 'english' as const,
            pipeline: 'english_router_v1',
          },
          _meta: { latency_ms: Date.now() - start },
        })
      }
    }
    
    // ====== Fallback: Original Hybrid Solve ======
    // For non-English subjects, return a minimal fallback card
    // TODO: Implement proper routers for math/chinese/etc
    console.warn('[route-solver] No English router match, returning minimal fallback')

    return NextResponse.json({
      subject: subject,
      question: questionText,
      explanation: {
        card: {
          id: `fallback_${Date.now()}`,
          question: questionText,
          kind: 'FALLBACK',
          translation: '此科目尚未支援詳細解析',
          cues: [],
          options: [],
          steps: [],
          vocab: [],
          nextActions: [
            { label: '換同型題', action: 'drill-similar' },
            { label: '加入錯題本', action: 'save-error' },
          ],
        },
      },
      meta: {
        questionId: `fallback_${Date.now()}`,
        subjectHint: subject,
        pipeline: 'fallback_minimal',
      },
      _meta: { latency_ms: Date.now() - start },
    })
  } catch (error) {
    console.error('[route-solver] error:', error)
    
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          errorCode: 'INVALID_INPUT',
          message: error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join('; '),
          errors: error.issues,
        },
        { status: 400 }
      )
    }

    // Generic errors
    return NextResponse.json(
      {
        errorCode: 'ROUTE_SOLVER_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET: Health probe
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/ai/route-solver',
    timestamp: new Date().toISOString(),
  })
}
