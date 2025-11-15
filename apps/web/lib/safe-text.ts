/**
 * Safe text utility functions
 * 
 * Provides safe string operations that never throw errors
 * All functions return a fallback value if input is invalid
 */

/**
 * Safely get text value, with fallback
 */
export function safeText(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) {
    return fallback
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return String(value)
  } catch {
    return fallback
  }
}

/**
 * Safely trim text, with fallback
 */
export function safeTrim(value: unknown, fallback: string = ''): string {
  const text = safeText(value, fallback)
  try {
    return text.trim()
  } catch {
    return fallback
  }
}

/**
 * Safely convert to uppercase, with fallback
 */
export function safeToUpperCase(value: unknown, fallback: string = ''): string {
  const text = safeText(value, fallback)
  try {
    return text.toUpperCase()
  } catch {
    return fallback
  }
}

/**
 * Safely match regex pattern, returns null if no match
 */
export function safeMatch(text: string, pattern: RegExp): RegExpMatchArray | null {
  if (!text || typeof text !== 'string') {
    return null
  }
  try {
    return text.match(pattern)
  } catch {
    return null
  }
}

/**
 * Safely match all regex patterns, returns empty array if no matches
 */
export function safeMatchAll(text: string, pattern: RegExp): RegExpMatchArray[] {
  if (!text || typeof text !== 'string') {
    return []
  }
  try {
    const matches: RegExpMatchArray[] = []
    let match: RegExpMatchArray | null
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
    
    while ((match = globalPattern.exec(text)) !== null) {
      matches.push(match)
      // Prevent infinite loop
      if (match[0].length === 0) {
        break
      }
    }
    return matches
  } catch {
    return []
  }
}


