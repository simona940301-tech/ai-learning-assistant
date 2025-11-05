/**
 * Kind Alias Normalization Layer
 * 
 * Ensures all kind aliases (E1, vocab, vocabulary, E1_VOCAB, etc.) 
 * map to a single canonical kind for consistent rendering.
 */

export type CanonicalKind = 
  | 'E1'  // Vocabulary (字彙題)
  | 'E2'  // Grammar (語法題)
  | 'E3'  // Cloze (克漏字)
  | 'E4'  // Reading (閱讀理解)
  | 'E5'  // Translation (翻譯)
  | 'E6'  // Paragraph Organization (篇章結構-選句)
  | 'E7'  // Contextual Completion (篇章結構-克漏字)
  | 'E8'  // Writing (寫作)
  | 'unknown'

/**
 * Comprehensive alias mapping
 * Handles: E1-E8, full names, snake_case, camelCase, mixed case
 */
const ALIAS_MAP: Record<string, CanonicalKind> = {
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
  
  // E6 - Paragraph Organization (Sentence Selection)
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
 * Normalize any kind alias to canonical form
 */
export function toCanonicalKind(kind?: string | null): CanonicalKind {
  if (!kind) return 'unknown'
  
  const normalized = String(kind).trim()
  
  // Direct lookup
  if (normalized in ALIAS_MAP) {
    return ALIAS_MAP[normalized]
  }
  
  // Case-insensitive fallback
  const lowerCase = normalized.toLowerCase()
  if (lowerCase in ALIAS_MAP) {
    return ALIAS_MAP[lowerCase]
  }
  
  console.warn(`[kind-alias] Unknown kind: "${kind}" → fallback to "unknown"`)
  return 'unknown'
}

/**
 * Get human-readable label for canonical kind
 */
export function getKindLabel(kind: CanonicalKind): string {
  const labels: Record<CanonicalKind, string> = {
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
  return labels[kind] || labels.unknown
}

/**
 * Check if kind is a valid recognized type (not unknown/fallback)
 */
export function isKnownKind(kind: CanonicalKind): boolean {
  return kind !== 'unknown'
}
