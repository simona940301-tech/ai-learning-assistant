import type { EnglishRoute, EnglishQuestionInput } from '@/lib/contracts/explain'
import { parseReading } from './reading-parser'

/**
 * Unicode normalization & text cleaning (first step)
 * Normalizes fullwidth chars, special spaces, brackets before pattern matching
 */
function normalizeInput(raw: string): string {
  return raw
    .normalize("NFKC")                           // Unicode 正規化
    .replace(/\u3000/g, " ")                     // 全形空白 -> 半形空白
    .replace(/\u00A0|\u200B|\uFEFF/g, "")        // NBSP/ZWSP/BOM 移除
    .replace(/[（）]/g, (m) => (m === "（" ? "(" : ")")) // 中文括號 -> 半形
    .replace(/[０-９]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 65248)) // 全形數字 -> 半形
    .replace(/[Ａ-Ｚ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0)) // 全形大寫字母 -> 半形
    .replace(/[ａ-ｚ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0)) // 全形小寫字母 -> 半形
    .replace(/\s{2,}/g, " ")                     // 多空白折成單空白
    .replace(/\)\(/g, ") (")                     // )( -> ) (
    .trim()
}

/**
 * Detect choice shape: sentences | words/phrases | mixed | none
 * Sentences: starts with capital & ends with punctuation (.?!), tokens >= 6
 * Words/phrases: no ending punctuation & tokens <= 5
 * Mixed: neither reaches 60% threshold
 */
function detectChoiceShape(arr: string[]): 'sentences' | 'words/phrases' | 'mixed' | 'none' {
  if (!arr || arr.length === 0) return 'none'
  
  const sentenceLike = arr.filter((t) => {
    const s = t.trim()
    const tokens = s.split(/\s+/).length
    return /^[A-Z]/.test(s) && /[.?!]$/.test(s) && tokens >= 4
  }).length
  
  const wordLike = arr.filter((t) => {
    const s = t.trim()
    const tokens = s.split(/\s+/).length
    return !/[.?!]$/.test(s) && tokens <= 5
  }).length
  
  if (sentenceLike / arr.length >= 0.6) return 'sentences'
  if (wordLike / arr.length >= 0.6) return 'words/phrases'
  return 'mixed'
}

/**
 * Legacy router - DEPRECATED
 * Replaced by TARS+KCE engine at /api/explain
 * This function is kept for backward compatibility only
 */
export async function classifyEnglishType(input: EnglishQuestionInput): Promise<EnglishRoute> {
  const { stem, options } = input
  const signals: string[] = []
  
  // ====== Initial Debug Log ======
  console.log('[router.kdebug]', JSON.stringify({
    phase: 'start',
    stemLength: stem.length,
    optionsCount: options.length,
    options: options.map(o => ({ key: o.key, textLength: o.text.length }))
  }))
  
  // ====== Step 1: Normalize input (Unicode, spaces, brackets) ======
  const normalizedStem = normalizeInput(stem)
  
  // Normalize text for pattern matching
  const stemLower = normalizedStem.toLowerCase().trim()
  const optionTexts = options.map((o) => o.text.toLowerCase().trim())
  const stemCompact = normalizedStem.replace(/\s+/g, ' ')
  const passageLength = stemCompact.length
  
  // ====== Normalize numbered blanks (support multiple formats) ======
  // Support: (1)(2), （１）（２）, ① ②, ❶ ❷, _ (1) _
  const normalizeBlanks = (text: string): { normalized: string; blankMatches: string[] } => {
    let normalized = text
    
    // Full-width digits → half-width: （１）→ (1)
    normalized = normalized.replace(/（(\d+)）/g, '($1)')
    
    // Circle numbers → parentheses: ① → (1), ❷ → (2)
    const circleMap: Record<string, string> = {
      '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10',
      '❶': '1', '❷': '2', '❸': '3', '❹': '4', '❺': '5', '❻': '6', '❼': '7', '❽': '8', '❾': '9', '❿': '10',
    }
    Object.entries(circleMap).forEach(([circle, num]) => {
      normalized = normalized.replace(new RegExp(circle, 'g'), `(${num})`)
    })
    
    // Match all numbered blank patterns: (1), (2), ( 1 ), etc. (tolerant of inner spaces)
    const blankMatches = Array.from(normalized.matchAll(/\(\s*\d+\s*\)/g)).map(m => m[0])

    return { normalized, blankMatches }
  }

  // ====== Step 2: Normalize numbered blanks (after initial normalization) ======
  const { normalized: normalizedAfterBlanks, blankMatches: normalizedBlankMatches } = normalizeBlanks(normalizedStem)

  // Extract numbered blanks: support arbitrary starting numbers (e.g., (24)(25)(26)), tolerant of inner spaces
  const blankMatches = Array.from(normalizedAfterBlanks.matchAll(/\(\s*(\d+)\s*\)/g))
  const blankNumbers = blankMatches.map(m => parseInt(m[1], 10))
  const numberedBlankCount = blankNumbers.length
  
  // Likely paragraph/cloze if 2+ numbered blanks (allow non-sequential, OCR tolerance)
  const likelyParagraphOrCloze = numberedBlankCount >= 2
  const hasNumberedBlanks = likelyParagraphOrCloze
  
  // Extract options for choice shape detection
  const optionTextsArray = options.map(o => o.text.trim())
  const choicesShape = detectChoiceShape(optionTextsArray)
  const optionsCount = options.length
  const passageChars = normalizedAfterBlanks.replace(/\([A-D]\)/g, "").length
  
  // ====== Debug Log: After Detection ======
  console.log('[router.kdebug]', JSON.stringify({
    phase: 'detection',
    blankNumbers,
    numberedBlankCount,
    likelyParagraphOrCloze,
    choicesShape,
    optionsCount,
    passageChars,
    passageLength,
  }))
  
  // Detect parens blank for E1: ( ) or （ ）
  const hasParensBlankSingleLine = /\([A-D]\)|\([\)（]/.test(normalizedAfterBlanks) || stemLower.includes('( )') || stemLower.includes('（ ）')
  
  // Legacy compatibility: map choicesShape to old format
  const allSingleWords = optionTexts.every((t) => t.split(/\s+/).length === 1)
  let legacyChoicesShape: 'words' | 'phrases' | 'sentences' | 'unknown' = 'unknown'
  
  if (choicesShape === 'sentences') {
    legacyChoicesShape = 'sentences'
  } else if (choicesShape === 'words/phrases') {
    legacyChoicesShape = allSingleWords ? 'words' : 'phrases'
  } else {
    legacyChoicesShape = 'unknown'
  }
  
  // Check for forced kind flags
  const forcedKindFlag = (process.env.FORCE_KIND as any) || null
  
  // ====== Classification Logic (STRICT PRIORITY: E1 → E6 → E7 → E4) ======
  
  // E2: Grammar (文法題) - HIGHEST PRIORITY (before E1)
  // Detect grammar-focused questions by option patterns
  const isE2Grammar = (): boolean => {
    if (!hasParensBlankSingleLine) return false
    if (optionsCount !== 4) return false
    if (hasNumberedBlanks) return false

    // Grammar signal: options are grammatical forms (pronouns, conjunctions, verb tense/aspect forms)
    // Exclude: single past participles used as vocab (praised, criticized, etc.)
    const grammarKeywords = /^(as|while|if|though|what|which|that|it|been|being|to\s+\w+|as\s+\w+|while\s+\w+)$/i
    const grammarOptionCount = optionTexts.filter(text => grammarKeywords.test(text.trim())).length

    // If 3+ options are grammar keywords → likely E2
    if (grammarOptionCount >= 3) return true

    // Additional pattern: options are verb tense forms (gerunds, infinitives, compound forms)
    // Exclude: single words ending in -ing/-ed (which are likely vocab)
    const isVerbForm = /^(to\s+\w+|as\s+to\s+\w+|as\s+\w+ing|while\s+\w+|have\s+\w+|has\s+\w+|had\s+\w+|been\s+\w+)$/i
    const verbFormCount = optionTexts.filter(text => isVerbForm.test(text.trim())).length
    if (verbFormCount >= 2) return true

    return false
  }

  if (isE2Grammar()) {
    const finalKind = 'E2'
    logDebug({
      blankNumbers,
      numberedBlankCount,
      likelyParagraphOrCloze,
      choicesShape,
      optionsCount,
      passageChars,
      confidence: 0.85,
      finalKind,
    })
    signals.push('grammar_pattern')
    return finalize(finalKind, 0.85, '文法結構（單句＋語法形式選項）')
  }

  // ====== Core Classification Logic (with confidence scoring) ======
  let kind: EnglishRoute['type'] | 'unknown' = 'unknown'
  let confidence = 0
  
  // E6/E7: Paragraph Organization or Contextual Completion
  if (likelyParagraphOrCloze) {
    if (choicesShape === 'sentences') {
      kind = 'E6'
      confidence = 1
    } else if (choicesShape === 'words/phrases') {
      kind = 'E7'
      confidence = 1
    } else {
      // Mixed: use ratio to decide
      const sentenceRatio = optionTextsArray.filter((t) => {
        const s = t.trim()
        const tokens = s.split(/\s+/).length
        return /^[A-Z]/.test(s) && /[.?!]$/.test(s) && tokens >= 6
      }).length / optionsCount
      
      kind = sentenceRatio >= 0.6 ? 'E6' : 'E7'
      confidence = 0.8
    }
  } else {
    // E1 or E4: Check for single parens blank (with or without space)
    const hasSingleParensBlank = /\(\s*\)/.test(normalizedAfterBlanks) || /\(\)/.test(normalizedAfterBlanks)
    
    if (hasSingleParensBlank && choicesShape === 'words/phrases' && optionsCount === 4 && passageChars < 300) {
      kind = 'E1'
      confidence = 1
    } else {
      // Fallback to E4 (will be guarded by reading-parser)
      kind = 'E4'
      confidence = 0.7
    }
  }
  
  // Minimum confidence threshold
  if (confidence < 0.7) kind = 'unknown'
  
  // ====== Debug Log: After Core Classification ======
  console.log('[router.kdebug]', JSON.stringify({
    phase: 'core_classification',
    kind,
    confidence,
    likelyParagraphOrCloze,
    choicesShape,
    optionsCount,
    passageChars,
    passageLength,
  }))
  
  // E1: Vocabulary (單字題) - Apply new logic
  if (kind === 'E1' && confidence >= 0.9) {
    const finalKind = 'E1'
    logDebug({
      blankNumbers,
      numberedBlankCount,
      likelyParagraphOrCloze,
      choicesShape,
      optionsCount,
      passageChars,
      confidence,
      finalKind,
    })
    signals.push('vocabulary_pattern', 'multi_question_supported')
    return finalize(finalKind, confidence, '單字題（單行題幹＋括號空格＋四選項）')
  }
  
  // Legacy E1 detection (fallback)
  const isE1SingleChoice = (): boolean => {
    if (!hasParensBlankSingleLine) return false
    if (optionsCount !== 4) return false
    if (choicesShape !== 'words/phrases') return false
    if (hasNumberedBlanks) return false
    if (passageLength > 300) return false
    const sentenceCount = normalizedAfterBlanks.split(/[.!?]+/).filter(Boolean).length
    if (sentenceCount > 3) return false
    return true
  }
  
  if (isE1SingleChoice() && kind !== 'E1') {
    const finalKind = 'E1'
    logDebug({
      blankNumbers,
      numberedBlankCount,
      likelyParagraphOrCloze,
      choicesShape,
      optionsCount,
      passageChars,
      confidence: 0.9,
      finalKind,
    })
    signals.push('vocabulary_pattern', 'multi_question_supported')
    return finalize(finalKind, 0.9, '單字題（單行題幹＋括號空格＋四選項）')
  }
  
  // E6: Paragraph Organization (篇章結構) - Apply new logic
  if (kind === 'E6' && confidence >= 0.8 && passageLength >= 200 && optionsCount >= 4 && optionsCount <= 6) {
    const finalKind = 'E6'
    logDebug({
      blankNumbers,
      numberedBlankCount,
      likelyParagraphOrCloze,
      choicesShape,
      optionsCount,
      passageChars,
      confidence,
      finalKind,
    })
    signals.push('paragraph_organization_pattern')
    return finalize(finalKind, confidence, '篇章結構（編號空格＋完整句子選項）')
  }
  
  // E7: Contextual Completion (文意選填) - Apply new logic
  if (kind === 'E7' && confidence >= 0.8) {
    const finalKind = 'E7'
    logDebug({
      blankNumbers,
      numberedBlankCount,
      likelyParagraphOrCloze,
      choicesShape,
      optionsCount,
      passageChars,
      confidence,
      finalKind,
    })
    signals.push('contextual_completion_pattern')
    return finalize(finalKind, confidence, '文意選填（編號空格＋詞/片語選項）')
  }
  
  // E5: Dialog & Pragmatics
  const dialogPatterns = [/^[A-Z]:\s*/m, /\?.*\n.*[A-Z]:/]
  const isDialog = dialogPatterns.some((p) => p.test(stem))
  if (isDialog) {
    const finalKind = 'E5'
    logDebug({
      hasNumberedBlanks,
      hasParensBlankSingleLine,
      choicesShape,
      optionsCount,
      passageChars: passageLength,
      forcedKindFlag,
      finalKind,
      reason: 'E5: 對話格式',
    })
    return finalize(finalKind, 0.9, '對話格式偵測')
  }
  
  // E3: Cloze (multiple blanks within same passage, but NOT numbered blanks)
  const underscoreBlanks = stem.match(/_{3,}/g)?.length ?? 0
  const hasClozePattern = underscoreBlanks >= 2
  if (hasClozePattern && !hasNumberedBlanks) {
    const finalKind = 'E3'
    logDebug({
      hasNumberedBlanks,
      hasParensBlankSingleLine,
      choicesShape,
      optionsCount,
      passageChars: passageLength,
      forcedKindFlag,
      finalKind,
      reason: 'E3: 多個底線空格',
    })
    return finalize(finalKind, 0.88, '同篇文章包含多個底線空格，判定為 Cloze 題型')
  }
  
  // E4: Reading Comprehension - LOWEST PRIORITY (only if none of above match)
  // CRITICAL: Add guard to prevent E4 from swallowing E6/E7
  const sentenceCount = stemLower.split(/[.!?]+/).filter(Boolean).length
  const questionLineMatches = normalizedStem.match(/(?:^|\n)(?:q\d+|\(\d+\)|\d+\.)/gi) ?? []
  const hasMultipleQuestionMarkers = questionLineMatches.length >= 2
  
  // GUARD: Skip E4 if has numbered blanks (should be E6/E7)
  if (hasNumberedBlanks) {
    const finalKind = 'FALLBACK'
    logDebug({
      hasNumberedBlanks,
      hasParensBlankSingleLine,
      choicesShape,
      optionsCount,
      passageChars: passageLength,
      forcedKindFlag,
      finalKind,
      reason: 'FALLBACK: 有編號空格但不符合 E6/E7 條件',
    })
    console.warn('[router] Has numbered blanks but failed E6/E7 detection, using FALLBACK', {
      blankNumbers,
      blankCount: numberedBlankCount,
      normalizedBlankMatches: normalizedBlankMatches.length,
      choicesShape,
      optionsCount,
      passageLength,
    })
    return finalize(finalKind, 0.5, '有編號空格但不符合 E6/E7 條件')
  }
  
  // E4: Reading - 使用 parser 偵測 passage + 多題
  // CRITICAL: Only parse if passage is long AND no numbered blanks
  if (passageLength > 100 && !hasNumberedBlanks && (hasMultipleQuestionMarkers || sentenceCount > 2)) {
    const parsed = parseReading(normalizedAfterBlanks)
    if (parsed && parsed.passage && parsed.passage.length > 50 && parsed.questions.length >= 1) {
      const groupId = parsed.groupId || ''
      const finalKind = 'E4'
      logDebug({
        hasNumberedBlanks,
        hasParensBlankSingleLine,
        choicesShape,
        optionsCount,
        passageChars: passageLength,
        forcedKindFlag,
        finalKind,
        reason: 'E4: 篇章理解（多題共用）',
      })
      if (process.env.NODE_ENV !== 'production') {
        console.log('[router] reading detected — qs:', parsed.questions.length, 'group:', groupId, 'passageLen:', parsed.passage.length)
      }
      return finalizeWithGroupId(finalKind, 0.86, '篇章理解（多題共用）', groupId)
    }
  }
  
  // E4: Reading & Context (multi-sentence) - fallback
  if (sentenceCount > 3 && !hasNumberedBlanks) {
    const finalKind = 'E4'
    logDebug({
      hasNumberedBlanks,
      hasParensBlankSingleLine,
      choicesShape,
      optionsCount,
      passageChars: passageLength,
      forcedKindFlag,
      finalKind,
      reason: 'E4: 多句篇章理解',
    })
    return finalize(finalKind, 0.85, '多句篇章理解')
  }
  
  // E2: Grammar & Syntax
  const grammarPatterns = [
    /\b(have|has|had|will|would|should|could|may|might|must)\b/,
    /\b(is|are|was|were|be|been|being)\b/,
    /\b(if|unless|whether|although|though|despite|while)\b/,
    /\b(who|whom|whose|which|that|where|when)\b/,
    /\b(ing|ed)\b/,
  ]
  const hasGrammarSignals = grammarPatterns.some((p) => p.test(stemLower))
  if (hasGrammarSignals && !allSingleWords && !hasNumberedBlanks) {
    const finalKind = 'E2'
    logDebug({
      hasNumberedBlanks,
      hasParensBlankSingleLine,
      choicesShape,
      optionsCount,
      passageChars: passageLength,
      forcedKindFlag,
      finalKind,
      reason: 'E2: 文法結構標記',
    })
    return finalize(finalKind, 0.75, '文法結構標記')
  }
  
  // E1: Meaning & Usage (fallback for single sentence + single word options)
  if (sentenceCount <= 1 && allSingleWords && !hasNumberedBlanks) {
    const finalKind = 'E1'
    logDebug({
      hasNumberedBlanks,
      hasParensBlankSingleLine,
      choicesShape,
      optionsCount,
      passageChars: passageLength,
      forcedKindFlag,
      finalKind,
      reason: 'E1: 語意判斷型（單句單詞選項）',
    })
    return finalize(finalKind, 0.8, '語意判斷型（單句單詞選項）')
  }
  
  // FALLBACK: Low confidence
  const finalKind = 'FALLBACK'
  logDebug({
    hasNumberedBlanks,
    hasParensBlankSingleLine,
    choicesShape,
    optionsCount,
    passageChars: passageLength,
    forcedKindFlag,
    finalKind,
    reason: 'FALLBACK: 無法明確分類',
  })
  return finalize(finalKind, 0.5, '無法明確分類，使用保底模板')
  
  function logDebug(metrics: {
    blankNumbers?: number[]
    numberedBlankCount?: number
    likelyParagraphOrCloze?: boolean
    choicesShape?: string
    optionsCount?: number
    passageChars?: number
    confidence?: number
    finalKind?: string
    hasNumberedBlanks?: boolean
    hasParensBlankSingleLine?: boolean
    forcedKindFlag?: string | null
    reason?: string
  }) {
    console.log('[router.kdebug]', JSON.stringify(metrics))
  }

  function finalize(type: EnglishRoute['type'], confidence: number, reason: string): EnglishRoute {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[english/router] detected kind =', type, {
        hasNumberedBlanks,
        choicesShape,
        passageLength,
        optionsCount,
        reason,
      })
    }
    return {
      type,
      confidence,
      signals,
      reason,
    }
  }

  function finalizeWithGroupId(
    type: EnglishRoute['type'],
    confidence: number,
    reason: string,
    groupId: string
  ): EnglishRoute {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[english/router] detected kind =', type, {
        hasNumberedBlanks,
        choicesShape,
        passageLength,
        optionsCount,
        groupId,
        reason,
      })
    }
    return {
      type,
      confidence,
      signals: [...signals, `groupId:${groupId}`],
      reason,
    }
  }
}

