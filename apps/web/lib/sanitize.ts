/**
 * DOMPurify wrapper for XSS protection
 *
 * Security: All user-generated content must be sanitized before rendering
 * Minimalism: Whitelist only necessary tags and attributes
 */

import DOMPurify from 'dompurify'

/**
 * Allowed HTML tags for passage/explanation content
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'mark',
  'em',
  'strong',
  'b',
  'i',
  'u',
  'span',
  'div',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code',
  'pre',
]

/**
 * Allowed HTML attributes
 */
const ALLOWED_ATTR = [
  'class',
  'id',
  'href',
  'title',
  'aria-label',
  'aria-describedby',
  'data-*', // Allow data attributes for React
]

/**
 * DOMPurify configuration for passage content
 */
const PASSAGE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: true,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
}

/**
 * Stricter configuration for inline content (options, short text)
 */
const INLINE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['mark', 'em', 'strong', 'b', 'i', 'u', 'span', 'code'],
  ALLOWED_ATTR: ['class', 'data-*'],
  ALLOW_DATA_ATTR: true,
  KEEP_CONTENT: true,
}

/**
 * Sanitize passage/explanation HTML
 *
 * Use for: Article content, full explanations, markdown-rendered text
 *
 * @param html - Raw HTML string
 * @returns Sanitized HTML safe for dangerouslySetInnerHTML
 */
export function sanitizePassage(html: string): string {
  if (!html) return ''

  try {
    return DOMPurify.sanitize(html, PASSAGE_CONFIG)
  } catch (error) {
    console.error('[sanitize] Failed to sanitize passage:', error)
    // Fallback: Strip all HTML tags
    return html.replace(/<[^>]*>/g, '')
  }
}

/**
 * Sanitize inline HTML (options, short text)
 *
 * Use for: Multiple choice options, brief explanations, labels
 *
 * @param html - Raw HTML string
 * @returns Sanitized HTML with limited tags
 */
export function sanitizeInline(html: string): string {
  if (!html) return ''

  try {
    return DOMPurify.sanitize(html, INLINE_CONFIG)
  } catch (error) {
    console.error('[sanitize] Failed to sanitize inline:', error)
    return html.replace(/<[^>]*>/g, '')
  }
}

/**
 * Strip all HTML tags (for plain text extraction)
 *
 * Use for: Analytics, logging, accessibility labels
 *
 * @param html - Raw HTML string
 * @returns Plain text with all tags removed
 */
export function stripHtml(html: string): string {
  if (!html) return ''

  // First sanitize to remove dangerous content
  const sanitized = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })

  // Then remove any remaining tags
  return sanitized.replace(/<[^>]*>/g, '').trim()
}

/**
 * Check if string contains potentially dangerous content
 *
 * Use for: Pre-validation, logging suspicious input
 *
 * @param html - String to check
 * @returns true if dangerous patterns detected
 */
export function containsDangerousContent(html: string): boolean {
  if (!html) return false

  const dangerous = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<meta/i,
  ]

  return dangerous.some((pattern) => pattern.test(html))
}

/**
 * Validate and sanitize passage with logging
 *
 * Use for: Debug mode, security audits
 *
 * @param html - Raw HTML string
 * @param source - Source identifier for logging
 * @returns Sanitized HTML with console warnings if dangerous content detected
 */
export function sanitizeWithLogging(html: string, source: string): string {
  if (containsDangerousContent(html)) {
    console.warn(`[sanitize] Dangerous content detected in ${source}:`, html.substring(0, 100))
  }

  return sanitizePassage(html)
}

/**
 * Batch sanitize array of strings
 *
 * Use for: Options arrays, evidence spans, list items
 *
 * @param items - Array of HTML strings
 * @param inline - Use inline config if true, passage config if false
 * @returns Array of sanitized strings
 */
export function sanitizeArray(items: string[], inline = true): string[] {
  const sanitizer = inline ? sanitizeInline : sanitizePassage
  return items.map((item) => sanitizer(item))
}

// Export type for use in components
export type SanitizedHTML = string & { __sanitized: never }

/**
 * Type guard for sanitized HTML (runtime check)
 */
export function isSanitized(html: any): html is SanitizedHTML {
  // This is a marker function - actual sanitization happens in sanitize* functions
  return typeof html === 'string'
}
