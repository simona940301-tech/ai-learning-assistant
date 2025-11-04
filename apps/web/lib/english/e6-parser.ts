/**
 * E6 Parser: Parse paragraph organization questions
 * Extracts numbered blanks, creates anchor IDs, normalizes formats
 */
import { OptionKey } from '@/lib/explain-normalizer'

export type E6Blank = {
  blankIndex: number
  anchorId: string
  charSpan?: { start: number; end: number }
  paragraphIndex?: number
  normalizedMarker: string // (1), (2), etc.
}

export type E6Parsed = {
  passage: string
  blanks: E6Blank[]
  normalizedPassage: string
  warnings: string[]
}

/**
 * Normalize blank markers: support (1), （１）, ①, ❶, _ (1) _
 */
function normalizeBlankMarkers(text: string): { normalized: string; markers: Array<{ original: string; normalized: string; index: number }> } {
  let normalized = text
  const markers: Array<{ original: string; normalized: string; index: number }> = []
  
  // Full-width digits → half-width: （１）→ (1)
  normalized = normalized.replace(/（(\d+)）/g, (match, num) => {
    const normalizedMarker = `(${num})`
    markers.push({ original: match, normalized: normalizedMarker, index: normalized.indexOf(normalizedMarker) })
    return normalizedMarker
  })
  
  // Circle numbers → parentheses: ① → (1), ❷ → (2)
  const circleMap: Record<string, string> = {
    '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10',
    '❶': '1', '❷': '2', '❸': '3', '❹': '4', '❺': '5', '❻': '6', '❼': '7', '❽': '8', '❾': '9', '❿': '10',
  }
  
  Object.entries(circleMap).forEach(([circle, num]) => {
    const regex = new RegExp(circle, 'g')
    normalized = normalized.replace(regex, (match) => {
      const normalizedMarker = `(${num})`
      markers.push({ original: match, normalized: normalizedMarker, index: normalized.indexOf(normalizedMarker) })
      return normalizedMarker
    })
  })
  
  // Normalize spaces: \u3000 → regular space, merge consecutive spaces
  normalized = normalized.replace(/\u3000/g, ' ')
  normalized = normalized.replace(/[ \t]+/g, ' ')
  
  // Normalize semicolons: ；→ ;
  normalized = normalized.replace(/；/g, ';')
  
  return { normalized, markers }
}

/**
 * Extract blanks with anchor IDs and character spans
 */
export function parseE6Passage(raw: string): E6Parsed {
  const warnings: string[] = []
  
  if (!raw || !raw.trim()) {
    return {
      passage: '',
      blanks: [],
      normalizedPassage: '',
      warnings: ['Empty input'],
    }
  }
  
  // Normalize blank markers
  const { normalized, markers } = normalizeBlankMarkers(raw)
  
  // Find all numbered blanks: (1), (2), etc.
  const blankMatches = Array.from(normalized.matchAll(/\((\d+)\)/g))
  
  if (blankMatches.length < 2) {
    warnings.push('Less than 2 numbered blanks detected')
  }
  
  // Build blanks array with anchor IDs
  const blanks: E6Blank[] = []
  blankMatches.forEach((match, idx) => {
    if (match.index === undefined) return
    
    const blankIndex = parseInt(match[1], 10)
    const anchorId = `blank-${blankIndex}`
    
    // Find character span (approximate)
    const start = match.index
    const end = start + match[0].length
    
    // Estimate paragraph index (simple heuristic: count newlines before)
    const paragraphIndex = normalized.slice(0, start).split(/\n{2,}/).length - 1
    
    blanks.push({
      blankIndex,
      anchorId,
      charSpan: { start, end },
      paragraphIndex: paragraphIndex >= 0 ? paragraphIndex : 0,
      normalizedMarker: match[0],
    })
  })
  
  // Create normalized passage with anchor markers
  let normalizedPassage = normalized
  blanks.forEach((blank) => {
    // Replace (n) with <mark data-blank="n" id="blank-n">____</mark>
    const regex = new RegExp(`\\(${blank.blankIndex}\\)`, 'g')
    normalizedPassage = normalizedPassage.replace(regex, `<mark data-blank="${blank.blankIndex}" id="${blank.anchorId}" class="blank-marker">____</mark>`)
  })
  
  return {
    passage: raw,
    blanks,
    normalizedPassage,
    warnings,
  }
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(html: string): string {
  // Simple sanitization: only allow safe tags and attributes
  // In production, use DOMPurify or similar
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
}

