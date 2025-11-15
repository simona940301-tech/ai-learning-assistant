/**
 * Lite Spec v1 Parser
 * 
 * Parses AI-generated markdown with anchor-based structure:
 * ANSWER:, WHY:, OPTIONS:, EVIDENCE:, FOCUS:, TRAPS:, ZH:, VOCAB:
 */

export interface LiteSpecSections {
  questionText?: string // Original question text (first visible content)
  answer?: string // ANSWER: line
  why?: string // WHY: line
  options?: Array<{ key: string; text: string }> // OPTIONS: block
  evidence?: string // EVIDENCE: block
  focus?: string // FOCUS: block
  traps?: string // TRAPS: block
  zh?: string // ZH: block
  vocab?: string // VOCAB: block
}

/**
 * Parse Lite Spec v1 markdown
 */
export function parseLiteSpec(markdown: string): LiteSpecSections {
  const sections: LiteSpecSections = {}

  // Split by anchor lines
  const anchorPattern = /^(ANSWER|WHY|OPTIONS|EVIDENCE|FOCUS|TRAPS|ZH|VOCAB):\s*(.*)$/im
  const lines = markdown.split(/\n/)

  // Extract question text (content before first anchor)
  const firstAnchorIndex = lines.findIndex((line) => anchorPattern.test(line))
  if (firstAnchorIndex > 0) {
    sections.questionText = lines.slice(0, firstAnchorIndex).join('\n').trim()
  } else {
    // If no anchor found, try to extract from first paragraph
    sections.questionText = lines[0]?.trim() || ''
  }

  let currentSection: keyof LiteSpecSections | null = null
  let currentContent: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(anchorPattern)

    if (match) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        const content = currentContent.join('\n').trim()
        if (content) {
          ;(sections as any)[currentSection] = content
        }
      }

      // Start new section
      const anchor = match[1].toUpperCase()
      const inlineContent = match[2]?.trim() || ''

      switch (anchor) {
        case 'ANSWER':
          currentSection = 'answer'
          currentContent = inlineContent ? [inlineContent] : []
          break
        case 'WHY':
          currentSection = 'why'
          currentContent = inlineContent ? [inlineContent] : []
          break
        case 'OPTIONS':
          currentSection = 'options'
          currentContent = inlineContent ? [inlineContent] : []
          break
        case 'EVIDENCE':
          currentSection = 'evidence'
          currentContent = inlineContent ? [inlineContent] : []
          break
        case 'FOCUS':
          currentSection = 'focus'
          currentContent = inlineContent ? [inlineContent] : []
          break
        case 'TRAPS':
          currentSection = 'traps'
          currentContent = inlineContent ? [inlineContent] : []
          break
        case 'ZH':
          currentSection = 'zh'
          currentContent = inlineContent ? [inlineContent] : []
          break
        case 'VOCAB':
          currentSection = 'vocab'
          currentContent = inlineContent ? [inlineContent] : []
          break
        default:
          currentSection = null
          currentContent = []
      }
    } else if (currentSection) {
      // Continue current section (until next anchor or end)
      // For single-line sections (ANSWER, WHY), only take first line
      if ((currentSection === 'answer' || currentSection === 'why') && currentContent.length > 0) {
        // Already has content, skip
        continue
      }
      currentContent.push(line)
    }
  }

  // Save last section
  if (currentSection && currentContent.length > 0) {
    const content = currentContent.join('\n').trim()
    if (content) {
      ;(sections as any)[currentSection] = content
    }
  }

  // Parse OPTIONS section if present
  if (sections.options && typeof sections.options === 'string') {
    sections.options = parseOptionsBlock(sections.options)
  }

  return sections
}

/**
 * Parse options block into array of {key, text}
 * Supports: (A) text, （A）text, A) text, etc.
 */
function parseOptionsBlock(optionsText: string): Array<{ key: string; text: string }> {
  const options: Array<{ key: string; text: string }> = []

  // Try multiple patterns
  const patterns = [
    /[（(]?\s*([A-Eａ-ｅＡ-Ｅa-e])\s*[）).、:]?\s*([^\n（(]+)/g,
    /^([A-Eａ-ｅＡ-Ｅa-e])\s*[.。、:：]\s*(.+)$/gm,
  ]

  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = pattern.exec(optionsText)) !== null) {
      let key = match[1].toUpperCase()
      // Convert fullwidth to halfwidth
      if (key === 'Ａ') key = 'A'
      else if (key === 'Ｂ') key = 'B'
      else if (key === 'Ｃ') key = 'C'
      else if (key === 'Ｄ') key = 'D'
      else if (key === 'Ｅ') key = 'E'

      const text = match[2]?.trim() || ''
      if (text && !options.find((opt) => opt.key === key)) {
        options.push({ key, text })
      }
    }

    if (options.length >= 2) break
  }

  return options
}

/**
 * Deduplicate adjacent lines with same prefix (first 20 chars)
 */
export function deduplicateLines(text: string): string {
  const lines = text.split(/\n/)
  const deduped: string[] = []
  let prevPrefix = ''

  for (const line of lines) {
    const prefix = line.trim().substring(0, 20)
    if (prefix && prefix === prevPrefix) {
      continue // Skip duplicate
    }
    deduped.push(line)
    prevPrefix = prefix
  }

  return deduped.join('\n')
}

