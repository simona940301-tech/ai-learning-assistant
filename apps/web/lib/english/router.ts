import type { EnglishRoute, EnglishQuestionInput } from '@/lib/contracts/explain'
import { parseReading } from './reading-parser'

/**
 * Rule-based English Type Classification
 * Returns type, confidence, and signals for downstream template selection
 * 
 * CRITICAL PRIORITY ORDER: E1 → E6 → E7 → E4 (strict priority)
 */
export async function classifyEnglishType(input: EnglishQuestionInput): Promise<EnglishRoute> {
  const { stem, options } = input
  const signals: string[] = []
  
  // Normalize text for pattern matching
  const stemLower = stem.toLowerCase().trim()
  const optionTexts = options.map((o) => o.text.toLowerCase().trim())
  const stemCompact = stem.replace(/\s+/g, ' ')
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
    
    // Match all numbered blank patterns: (1), (2), etc.
    const blankMatches = Array.from(normalized.matchAll(/\(\d+\)/g)).map(m => m[0])
    
    return { normalized, blankMatches }
  }
  
  // ====== Debug Metrics (準備輸出) ======
  const { normalized: normalizedStem, blankMatches: normalizedBlankMatches } = normalizeBlanks(stem)
  const uniqueNumberedBlanks = new Set(normalizedBlankMatches.map((token) => token.replace(/\D/g, ''))).size
  const hasNumberedBlanks = uniqueNumberedBlanks >= 2 || normalizedBlankMatches.length >= 2
  
  // Detect parens blank for E1: ( ) or （ ）
  const hasParensBlankSingleLine = /\([A-D]\)|\([\)（]/.test(stem) || stemLower.includes('( )') || stemLower.includes('（ ）')
  
  // Detect choices shape
  let choicesShape: 'words' | 'phrases' | 'sentences' | 'unknown' = 'unknown'
  const allSingleWords = optionTexts.every((t) => t.split(/\s+/).length === 1)

  // Enhanced sentence detection for E6/E7 routing
  // A sentence is: long text (8+ words) with more complex structure
  // Phrases: ≤5 words, connectors like "so that", gerunds, simple vocab
  const choicesAreFullSentences = optionTexts.some((text) => {
    const wordCount = text.split(/\s+/).length
    const hasPunctuation = /[.!?。！？]$/.test(text.trim())

    // E7 phrase patterns (exclude from sentence detection)
    const isPhrasePattern = /^(so that|try hard|in order to|as well as|such as|due to|instead of|according to|\w+ing$|\w+ed$)$/i.test(text.trim())
    if (isPhrasePattern && wordCount <= 3) return false

    // E6 sentence patterns: has verb (auxiliary OR main verb) AND 8+ words
    const hasVerb = /\b(am|is|are|was|were|have|has|had|will|would|should|could|may|might|must|do|does|did|can|offer|aim|prevent|address|feel|require)\b/i.test(text)
    const hasSubjectVerbStructure = hasVerb && wordCount >= 8

    // E6 sentences: typically 8+ words with verb, may not end with punctuation
    // E7 phrases: typically ≤5 words, gerunds, connectors, simple words
    return hasSubjectVerbStructure || (hasPunctuation && wordCount >= 8)
  })

  const choicesAreWordsOrPhrases = optionTexts.every((text) => {
    const wordCount = text.split(/\s+/).length
    return wordCount <= 5
  })

  if (allSingleWords) {
    choicesShape = 'words'
  } else if (choicesAreWordsOrPhrases && !choicesAreFullSentences) {
    choicesShape = 'phrases'
  } else if (choicesAreFullSentences) {
    choicesShape = 'sentences'
  }
  
  const optionsCount = options.length
  
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
      hasNumberedBlanks,
      hasParensBlankSingleLine,
      choicesShape,
      optionsCount,
      passageChars: passageLength,
      forcedKindFlag,
      finalKind,
      reason: 'E2: 文法結構（單句＋語法形式選項）',
    })
    signals.push('grammar_pattern')
    return finalize(finalKind, 0.85, '文法結構（單句＋語法形式選項）')
  }

  // E1: Vocabulary (單字題) - SECOND PRIORITY
  // Support multi-question splitting
  const isE1SingleChoice = (): boolean => {
    // Check for E1 patterns: single line with parens blank + 4 word/phrase options
    if (!hasParensBlankSingleLine) return false
    if (optionsCount !== 4) return false
    if (choicesShape !== 'words' && choicesShape !== 'phrases') return false

    // Exclude if has numbered blanks (E6/E7 pattern)
    if (hasNumberedBlanks) return false

    // Relaxed length threshold: E1 can be multi-sentence (up to 300 chars)
    if (passageLength > 300) return false

    // E1 detection: has ( ) blank with word/phrase options, sentence count ≤ 3
    const sentenceCount = stem.split(/[.!?]+/).filter(Boolean).length
    if (sentenceCount > 3) return false // Too many sentences → likely E4

    return true
  }
  
  if (isE1SingleChoice()) {
    const finalKind = 'E1'
    logDebug({
      hasNumberedBlanks,
      hasParensBlankSingleLine,
      choicesShape,
      optionsCount,
      passageChars: passageLength,
      forcedKindFlag,
      finalKind,
      reason: 'E1: 單行題幹＋括號空格＋詞/片語選項',
    })
    signals.push('vocabulary_pattern', 'multi_question_supported')
    return finalize(finalKind, 0.9, '單字題（單行題幹＋括號空格＋四選項）')
  }
  
  // E6: Paragraph Organization (篇章結構) - SECOND PRIORITY
  const isE6ParagraphOrg = (): boolean => {
    if (!hasNumberedBlanks) return false
    if (passageLength < 200) return false // Must be long article
    if (choicesShape !== 'sentences') return false
    if (optionsCount < 4 || optionsCount > 6) return false

    // Enhanced sentence detection: count options that are sentences (8+ words with verb OR 8+ words with punctuation)
    const sentenceCount = optionTexts.filter((text) => {
      const wordCount = text.split(/\s+/).length
      const hasPunctuation = /[.!?。！？]$/.test(text.trim())

      // E7 phrase patterns (exclude from sentence count)
      const isPhrasePattern = /^(so that|try hard|in order to|as well as|such as|due to|instead of|according to|\w+ing$|\w+ed$)$/i.test(text.trim())
      if (isPhrasePattern && wordCount <= 3) return false

      // E6 sentence patterns: has verb (auxiliary OR main verb) AND 8+ words
      const hasVerb = /\b(am|is|are|was|were|have|has|had|will|would|should|could|may|might|must|do|does|did|can|offer|aim|prevent|address|feel|require)\b/i.test(text)
      const hasSubjectVerbStructure = hasVerb && wordCount >= 8

      // E6 options: typically 8+ words with verb structure, may or may not end with punctuation
      return hasSubjectVerbStructure || (hasPunctuation && wordCount >= 8)
    }).length

    const sentenceRatio = sentenceCount / optionsCount
    if (sentenceRatio < 0.5) return false // Less than 50% are sentences

    return true
  }
  
  if (isE6ParagraphOrg()) {
    const finalKind = 'E6'
    logDebug({
      hasNumberedBlanks,
      hasParensBlankSingleLine,
      choicesShape,
      optionsCount,
      passageChars: passageLength,
      forcedKindFlag,
      finalKind,
      reason: 'E6: 文章含編號空格＋完整句子選項',
    })
    signals.push('paragraph_organization_pattern')
    return finalize(finalKind, 0.9, '篇章結構（編號空格＋完整句子選項）')
  }
  
  // E7: Contextual Completion (文意選填) - THIRD PRIORITY
  const isE7ContextualCompletion = (): boolean => {
    if (!hasNumberedBlanks) return false
    // Must be words or phrases, not sentences
    if (choicesShape === 'sentences' || choicesShape === 'unknown') return false
    return choicesShape === 'words' || choicesShape === 'phrases'
  }
  
  if (isE7ContextualCompletion()) {
    const finalKind = 'E7'
    logDebug({
      hasNumberedBlanks,
      hasParensBlankSingleLine,
      choicesShape,
      optionsCount,
      passageChars: passageLength,
      forcedKindFlag,
      finalKind,
      reason: 'E7: 文章含編號空格＋詞/片語選項',
    })
    signals.push('contextual_completion_pattern')
    return finalize(finalKind, 0.9, '文意選填（編號空格＋詞/片語選項）')
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
      uniqueNumberedBlanks,
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
    const parsed = parseReading(normalizedStem)
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
    hasNumberedBlanks: boolean
    hasParensBlankSingleLine: boolean
    choicesShape: string
    optionsCount: number
    passageChars: number
    forcedKindFlag: string | null
    finalKind: string
    reason: string
  }) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[router.kdebug]', JSON.stringify(metrics))
    }
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

