/**
 * Kind Alias Normalization Layer - Canonical Format
 * 
 * 使用 canonical kinds: vocab, grammar, cloze, reading, discourse, translation, writing
 * 確保所有別名映射到統一的 canonical kind
 */

export type CanonicalKind = 
  | 'vocab'          // Vocabulary (字彙題)
  | 'grammar'        // Grammar (語法題)
  | 'cloze'          // Cloze (克漏字)
  | 'reading'        // Reading (閱讀理解)
  | 'discourse'      // Paragraph Organization (篇章結構-選句)
  | 'translation'    // Translation (翻譯)
  | 'writing'        // Writing (寫作)

/**
 * Legacy CanonicalKind (for backward compatibility)
 * Maps to new canonical format
 */
export type LegacyCanonicalKind = 
  | 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'unknown'

/**
 * Comprehensive alias mapping to canonical kinds
 */
const CANONICAL_MAP: Record<string, CanonicalKind> = {
  // vocab
  vocab: 'vocab',
  vocabulary: 'vocab',
  e1: 'vocab',
  E1: 'vocab',
  e1_vocab: 'vocab',
  E1_VOCAB: 'vocab',
  E1_VOCABULARY: 'vocab',
  vocabularyVM: 'vocab',
  
  // grammar
  grammar: 'grammar',
  e2: 'grammar',
  E2: 'grammar',
  e2_grammar: 'grammar',
  E2_GRAMMAR: 'grammar',
  grammarVM: 'grammar',
  
  // cloze
  cloze: 'cloze',
  e3: 'cloze',
  E3: 'cloze',
  e3_cloze: 'cloze',
  E3_CLOZE: 'cloze',
  clozeVM: 'cloze',
  
  // reading
  reading: 'reading',
  e4: 'reading',
  E4: 'reading',
  e4_reading: 'reading',
  E4_READING: 'reading',
  readingVM: 'reading',
  
  // discourse (Paragraph Organization)
  discourse: 'discourse',
  paragraph: 'discourse',
  paragraphOrganization: 'discourse',
  e5: 'discourse', // E5 在舊系統可能是 discourse
  E5: 'discourse',
  e5_discourse: 'discourse',
  E5_DISCOURSE: 'discourse',
  e6: 'discourse',
  E6: 'discourse',
  e6_discourse: 'discourse',
  E6_DISCOURSE: 'discourse',
  paragraphOrganizationVM: 'discourse',
  
  // translation
  translation: 'translation',
  e5_translation: 'translation',
  E5_TRANSLATION: 'translation',
  translationVM: 'translation',
  
  // writing
  writing: 'writing',
  e6_writing: 'writing',
  E6_WRITING: 'writing',
  e8: 'writing',
  E8: 'writing',
  e8_writing: 'writing',
  E8_WRITING: 'writing',
  writingVM: 'writing',
}

/**
 * Legacy map (for backward compatibility with E1-E8)
 */
const LEGACY_MAP: Record<string, LegacyCanonicalKind> = {
  // E1 - Vocabulary
  'E1': 'E1',
  'e1': 'E1',
  'vocab': 'E1',
  'VOCAB': 'E1',
  'vocabulary': 'E1',
  'VOCABULARY': 'E1',
  'E1_VOCAB': 'E1',
  'E1_VOCABULARY': 'E1',
  'vocabularyVM': 'E1',
  
  // E2 - Grammar
  'E2': 'E2',
  'e2': 'E2',
  'grammar': 'E2',
  'GRAMMAR': 'E2',
  'E2_GRAMMAR': 'E2',
  'grammarVM': 'E2',
  
  // E3 - Cloze
  'E3': 'E3',
  'e3': 'E3',
  'cloze': 'E3',
  'CLOZE': 'E3',
  'E3_CLOZE': 'E3',
  'clozeVM': 'E3',
  
  // E4 - Reading
  'E4': 'E4',
  'e4': 'E4',
  'reading': 'E4',
  'READING': 'E4',
  'E4_READING': 'E4',
  'readingVM': 'E4',
  
  // E5 - Translation
  'E5': 'E5',
  'e5': 'E5',
  'translation': 'E5',
  'TRANSLATION': 'E5',
  'E5_TRANSLATION': 'E5',
  'translationVM': 'E5',
  
  // E6 - Paragraph Organization
  'E6': 'E6',
  'e6': 'E6',
  'discourse': 'E6',
  'DISCOURSE': 'E6',
  'paragraph': 'E6',
  'PARAGRAPH': 'E6',
  'paragraphOrganization': 'E6',
  'PARAGRAPH_ORGANIZATION': 'E6',
  'E6_DISCOURSE': 'E6',
  'paragraphOrganizationVM': 'E6',
  
  // E7 - Contextual Completion
  'E7': 'E7',
  'e7': 'E7',
  'contextual': 'E7',
  'CONTEXTUAL': 'E7',
  'contextualCompletion': 'E7',
  'CONTEXTUAL_COMPLETION': 'E7',
  'E7_CONTEXTUAL': 'E7',
  'contextualCompletionVM': 'E7',
  
  // E8 - Writing
  'E8': 'E8',
  'e8': 'E8',
  'writing': 'E8',
  'WRITING': 'E8',
  'E8_WRITING': 'E8',
  'writingVM': 'E8',
  
  // Fallback
  'unknown': 'unknown',
  'UNKNOWN': 'unknown',
  'fallback': 'unknown',
  'FALLBACK': 'unknown',
  'generic': 'unknown',
  'GENERIC': 'unknown',
}

/**
 * Normalize any kind alias to canonical form (new format)
 * Returns undefined if not found (for Zod validation)
 */
export function toCanonicalKind(kind?: string | null): CanonicalKind | undefined {
  if (!kind) return undefined
  
  const normalized = String(kind).trim()
  
  // Direct lookup
  if (normalized in CANONICAL_MAP) {
    return CANONICAL_MAP[normalized]
  }
  
  // Case-insensitive fallback
  const lowerCase = normalized.toLowerCase()
  if (lowerCase in CANONICAL_MAP) {
    return CANONICAL_MAP[lowerCase]
  }
  
  console.warn(`[kind-alias] Unknown kind: "${kind}" → returning undefined`)
  return undefined
}

/**
 * Normalize to legacy format (for backward compatibility)
 */
export function toLegacyCanonicalKind(kind?: string | null): LegacyCanonicalKind {
  if (!kind) return 'unknown'
  
  const normalized = String(kind).trim()
  
  // Direct lookup
  if (normalized in LEGACY_MAP) {
    return LEGACY_MAP[normalized]
  }
  
  // Case-insensitive fallback
  const lowerCase = normalized.toLowerCase()
  if (lowerCase in LEGACY_MAP) {
    return LEGACY_MAP[lowerCase]
  }
  
  console.warn(`[kind-alias] Unknown kind: "${kind}" → fallback to "unknown"`)
  return 'unknown'
}

/**
 * Convert canonical kind to legacy format (for existing components)
 */
export function canonicalToLegacy(canonical: CanonicalKind): LegacyCanonicalKind {
  const map: Record<CanonicalKind, LegacyCanonicalKind> = {
    'vocab': 'E1',
    'grammar': 'E2',
    'cloze': 'E3',
    'reading': 'E4',
    'discourse': 'E6',
    'translation': 'E5',
    'writing': 'E8',
  }
  return map[canonical] || 'unknown'
}

/**
 * Get human-readable label for canonical kind
 */
export function getKindLabel(kind: CanonicalKind | LegacyCanonicalKind): string {
  // Handle canonical format
  const canonicalLabels: Record<CanonicalKind, string> = {
    'vocab': '字彙題',
    'grammar': '語法題',
    'cloze': '克漏字',
    'reading': '閱讀理解',
    'discourse': '篇章結構（選句）',
    'translation': '翻譯',
    'writing': '寫作',
  }
  
  if (kind in canonicalLabels) {
    return canonicalLabels[kind as CanonicalKind]
  }
  
  // Handle legacy format
  const legacyLabels: Record<LegacyCanonicalKind, string> = {
    'E1': '字彙題',
    'E2': '語法題',
    'E3': '克漏字',
    'E4': '閱讀理解',
    'E5': '翻譯',
    'E6': '篇章結構（選句）',
    'E7': '篇章結構（克漏字）',
    'E8': '寫作',
    'unknown': '題型未知',
  }
  
  return legacyLabels[kind as LegacyCanonicalKind] || legacyLabels.unknown
}

/**
 * Check if kind is a valid recognized type
 */
export function isKnownKind(kind: CanonicalKind | LegacyCanonicalKind): boolean {
  if (kind === 'unknown') return false
  return true
}
