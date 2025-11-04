/**
 * Normalize ExplainCard from various API response formats and produce a UI-friendly view.
 * Handles field name differences (options/choices, vocab/vocabulary)
 * Handles nesting differences (explanation.card vs card vs root)
 */

export type OptionKey = 'A' | 'B' | 'C' | 'D'

export type NormalizedExplainView = {
  stemEn: string
  stemZh?: string
  reasoning: string[]
  options: Array<{
    key: OptionKey
    word: string
    pos: string
    zh: string
    reason: string
    correct: boolean
  }>
  answerKey: OptionKey
  answerWord: string
  vocab: Array<{
    word: string
    pos: string
    zh: string
    note: string
  }>
}

export type NormalizedCard = {
  id: string
  question: string
  kind: 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'FALLBACK'
  translation?: string
  cues: string[]
  options: Array<{
    key: string
    text: string
    pos?: string
    zh?: string
    reason?: string
    verdict: 'fit' | 'unfit' | 'unknown'
  }>
  steps: Array<{ title: string; detail?: string }>
  correct?: {
    key: string
    text: string
    reason?: string
  }
  vocab: Array<{
    term: string
    pos?: string
    zh?: string
    note?: string
    context?: string
  }>
  nextActions: Array<{
    label: string
    action: string
  }>
  presentation: NormalizedExplainView
}

const POS_MAP: Record<string, string> = {
  noun: 'n.',
  n: 'n.',
  v: 'v.',
  verb: 'v.',
  adj: 'adj.',
  adjective: 'adj.',
  adv: 'adv.',
  adverb: 'adv.',
  phr: 'phr.',
  phrase: 'phr.',
  idiom: 'idiom',
}

const STOPWORDS = new Set([
  'the',
  'there',
  'this',
  'that',
  'those',
  'these',
  'and',
  'but',
  'for',
  'with',
  'from',
  'were',
  'have',
  'has',
  'been',
  'being',
  'into',
  'about',
  'after',
  'before',
  'their',
  'would',
  'could',
  'should',
  'because',
  'since',
  'than',
  'then',
  'when',
  'where',
  'what',
  'which',
  'while',
  'whose',
  'upon',
  'through',
  'among',
  'around',
  'between',
  'under',
  'over',
  'reading',
  'passage',
  'article',
  'therefore',
])

function compactPos(value?: string): string {
  if (!value) return ''

  const tokens = value
    .split(/[\/,\s]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)

  if (!tokens.length) return ''

  const mapped = Array.from(
    new Set(
      tokens.map((token) => {
        const sanitized = token.replace(/\./g, '')
        const normalized = POS_MAP[sanitized] ?? token
        if (normalized === 'idiom') return normalized
        return normalized.endsWith('.') ? normalized : `${normalized}.`
      })
    )
  )

  return mapped.join('/')
}

function normalizeZh(value?: string): string {
  if (!value) return ''
  const cleaned = value.replace(/[,，;]/g, '；')
  const parts = cleaned
    .split(/；/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.slice(0, 2).join('；')
}

function truncateReason(value?: string): string {
  const base = (value ?? '').trim()
  if (!base) return '無資料'
  const maxLength = 20
  const chars = Array.from(base)
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join('')}...` : base
}

function normalizeNote(value?: string): string {
  return (value ?? '').trim()
}

function deriveReasoning(cues: string[], steps: Array<{ title: string; detail?: string }>): string[] {
  const cueCandidates = cues
    .map((cue) => cue?.trim())
    .filter((cue): cue is string => Boolean(cue))

  if (cueCandidates.length) {
    return Array.from(new Set(cueCandidates)).slice(0, 3)
  }

  const stepCandidates = steps
    .map((step) => step.detail || step.title)
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry))

  return Array.from(new Set(stepCandidates)).slice(0, 3)
}

type RawVocab = {
  term: string
  pos?: string
  zh?: string
  note?: string
  context?: string
}

function extractContextVocabulary(
  question: string,
  optionWords: string[],
  rawVocab: RawVocab[],
  limit = 4
): NormalizedExplainView['vocab'] {
  if (!question) return []

  const optionSet = new Set(optionWords.map((word) => word.toLowerCase()))
  const candidates: string[] = []
  const seen = new Set<string>()
  const WORD_REGEX = /[A-Za-z-]+/g
  const matches = question.matchAll(WORD_REGEX)

  for (const match of matches) {
    const word = match[0].toLowerCase()
    if (word.length < 3) continue
    if (STOPWORDS.has(word)) continue
    if (optionSet.has(word)) continue
    if (seen.has(word)) continue
    seen.add(word)
    candidates.push(word)
    if (candidates.length >= limit) break
  }

  const materialized = candidates.map((word, index) => {
    const vocabMatch = rawVocab.find((entry) => (entry.term ?? '').toLowerCase() === word)
    const pos = compactPos(vocabMatch?.pos)
    const zh = normalizeZh(vocabMatch?.zh)
    const note = normalizeNote(vocabMatch?.note ?? vocabMatch?.context)
    const displayWord = word
    return {
      word: displayWord,
      pos: pos || '—',
      zh: zh || '—',
      note: note || `語境：題幹「${displayWord}」`,
    }
  })

  if (materialized.length) {
    return materialized
  }

  const fallback = rawVocab
    .filter((item) => !!item.term && !optionSet.has(item.term.toLowerCase()))
    .slice(0, limit)
    .map((item) => ({
      word: item.term.trim(),
      pos: compactPos(item.pos) || '—',
      zh: normalizeZh(item.zh) || '—',
      note: normalizeNote(item.note ?? item.context) || '語境：題幹',
    }))

  return fallback
}

function createPresentation(card: {
  question: string
  translation?: string
  cues: string[]
  steps: Array<{ title: string; detail?: string }>
  options: Array<{ key: string; text: string; pos?: string; zh?: string; reason?: string; verdict: 'fit' | 'unfit' | 'unknown' }>
  correct?: { key: string; text: string; reason?: string }
  vocab: Array<{ term: string; pos?: string; zh?: string; note?: string; context?: string }>
}): NormalizedExplainView {
  const reasoning = deriveReasoning(card.cues, card.steps)

  const optionViews = card.options.slice(0, 4).map((opt, index) => {
    const key = (opt.key || String.fromCharCode(65 + index)).toUpperCase().slice(0, 1) as OptionKey
    const compact = compactPos(opt.pos)
    const zh = normalizeZh(opt.zh)
    const word = (opt.text ?? '').trim() || `word${key}`
    return {
      key,
      word,
      pos: compact || '—',
      zh: zh || '—',
      reason: truncateReason(opt.reason),
      correct: opt.verdict === 'fit',
    }
  })

  const answerKey = (card.correct?.key ?? optionViews[0]?.key ?? 'A').toUpperCase().slice(0, 1) as OptionKey

  const vocabView = extractContextVocabulary(
    card.question,
    optionViews.map((opt) => opt.word.toLowerCase()),
    card.vocab
  )

  return {
    stemEn: (card.question ?? '').trim(),
    stemZh: card.translation?.trim(),
    reasoning,
    options: optionViews,
    answerKey,
    answerWord: (card.correct?.text ?? optionViews.find((opt) => opt.key === answerKey)?.word ?? '').trim(),
    vocab: vocabView,
  }
}

/**
 * Build a UI view from any card-like object (normalized or direct API response).
 */
export function buildExplainView(card: any): NormalizedExplainView {
  if (card?.presentation) {
    return card.presentation as NormalizedExplainView
  }

  const options = Array.isArray(card?.options)
    ? card.options.map((opt: any, index: number) => ({
        key: opt.key ?? opt.id ?? String.fromCharCode(65 + index),
        text: opt.text ?? opt.label ?? '',
        pos: opt.pos ?? opt.partOfSpeech ?? opt.speech ?? opt.lexical ?? undefined,
        zh: opt.zh ?? opt.translation ?? opt.chinese ?? undefined,
        reason: opt.reason ?? opt.explanation ?? undefined,
        verdict: opt.verdict ?? (opt.correct ? 'fit' : opt.incorrect ? 'unfit' : 'unknown'),
      }))
    : []

  const vocab = Array.isArray(card?.vocab)
    ? card.vocab.map((v: any) => ({
        term: v.term ?? v.word ?? v.text ?? '',
        pos: v.pos ?? v.partOfSpeech ?? undefined,
        zh: v.zh ?? v.translation ?? v.chinese ?? undefined,
        note: v.note ?? v.usage ?? undefined,
        context: v.context ?? v.example ?? undefined,
      }))
    : []

  const cues = Array.isArray(card?.cues) ? card.cues : []
  const steps = Array.isArray(card?.steps) ? card.steps : []

  return createPresentation({
    question: card?.question ?? card?.stem ?? '',
    translation: card?.translation ?? card?.translate ?? card?.cn,
    cues,
    steps,
    options,
    correct: card?.correct,
    vocab,
  })
}

/**
 * Normalize a card from any API response format to our standard shape
 */
export function normalizeCard(raw: any): NormalizedCard {
  // Handle nested structure: explanation.card, card, or root
  const node = raw?.explanation?.card ?? raw?.card ?? raw ?? {}

  // Kind/Type with fallback
  const kind = (node.kind ?? node.type ?? 'FALLBACK') as NormalizedCard['kind']

  // Options with multiple possible field names
  const rawOptions = node.options ?? node.choices ?? []
  const options = Array.isArray(rawOptions)
    ? rawOptions.map((opt: any) => ({
        key: opt.key ?? opt.id ?? '',
        text: opt.text ?? opt.label ?? '',
        pos: opt.pos ?? opt.partOfSpeech ?? opt.speech ?? opt.lexical ?? undefined,
        zh: opt.zh ?? opt.translation ?? opt.chinese ?? undefined,
        reason: opt.reason ?? opt.explanation ?? undefined,
        verdict: opt.verdict ?? (opt.correct ? 'fit' : opt.incorrect ? 'unfit' : 'unknown'),
      }))
    : []

  // Vocab with multiple possible field names
  const rawVocab = node.vocab ?? node.vocabulary ?? node.words ?? []
  const vocab = Array.isArray(rawVocab)
    ? rawVocab.map((v: any) => ({
        term: v.term ?? v.word ?? v.text ?? '',
        pos: v.pos ?? v.partOfSpeech ?? undefined,
        zh: v.zh ?? v.translation ?? v.chinese ?? undefined,
        note: v.note ?? v.usage ?? undefined,
        context: v.context ?? v.example ?? undefined,
      }))
    : []

  // Translation
  const translation = node.translation ?? node.translate ?? node.cn ?? undefined

  // Cues (hints/clues)
  const rawCues = node.cues ?? node.hints ?? node.clues ?? []
  const cues = Array.isArray(rawCues) ? rawCues : []

  // Steps (for E2, E4)
  const rawSteps = node.steps ?? []
  const steps = Array.isArray(rawSteps)
    ? rawSteps.map((s: any) => ({
        title: s.title ?? s.label ?? '',
        detail: s.detail ?? s.description ?? undefined,
      }))
    : []

  // Correct answer
  const correct = node.correct
    ? {
        key: node.correct.key ?? '',
        text: node.correct.text ?? '',
        reason: node.correct.reason ?? undefined,
      }
    : undefined

  // Metadata
  const id = node.id ?? `card_${Date.now()}`
  const question = node.question ?? node.stem ?? ''

  // Next actions
  const rawNextActions = node.nextActions ?? []
  const nextActions = Array.isArray(rawNextActions)
    ? rawNextActions.map((a: any) => ({
        label: a.label ?? a.name ?? '',
        action: a.action ?? a.type ?? '',
      }))
    : [
        { label: '換同型題', action: 'drill-similar' },
        { label: '加入錯題本', action: 'save-error' },
      ]

  const presentation = createPresentation({
    question,
    translation,
    cues,
    steps,
    options,
    correct,
    vocab,
  })

  return {
    id,
    question,
    kind,
    translation,
    cues,
    options,
    steps,
    correct,
    vocab,
    nextActions,
    presentation,
  }
}

/**
 * Check if a normalized card has minimal required content
 */
export function hasMinimalContent(card: NormalizedCard): boolean {
  return !!(card.translation || card.cues?.length || card.options?.length)
}

/**
 * Get a human-readable status for debugging
 */
export function getCardStatus(card: NormalizedCard): string {
  const parts: string[] = [
    `kind:${card.kind}`,
    `options:${card.options.length}`,
    `vocab:${card.vocab.length}`,
    card.translation ? 'has_translation' : 'no_translation',
    card.cues?.length ? `cues:${card.cues.length}` : 'no_cues',
  ]
  return parts.join(' ')
}
