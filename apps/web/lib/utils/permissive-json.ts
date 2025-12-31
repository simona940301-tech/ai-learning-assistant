/**
 * 🚀 Permissive JSON Parser - Best-effort parsing for streaming
 * 
 * Handles incomplete JSON from streaming responses:
 * - {"summary": "這是一份關於... → extracts partial data
 * - Gracefully handles missing closing braces
 * - Returns whatever is parseable
 */

export function parsePartialJSON(jsonString: string): any {
    if (!jsonString || jsonString.trim().length === 0) {
        return null
    }

    // Try normal JSON.parse first (fastest path)
    try {
        return JSON.parse(jsonString)
    } catch (e) {
        // Normal parse failed, try best-effort parsing
    }

    try {
        // Strategy 1: Try to complete the JSON by adding missing braces
        let completed = jsonString.trim()

        // Count opening and closing braces
        const openBraces = (completed.match(/{/g) || []).length
        const closeBraces = (completed.match(/}/g) || []).length
        const openBrackets = (completed.match(/\[/g) || []).length
        const closeBrackets = (completed.match(/]/g) || []).length

        // Add missing closing braces/brackets
        completed += ']'.repeat(Math.max(0, openBrackets - closeBrackets))
        completed += '}'.repeat(Math.max(0, openBraces - closeBraces))

        // Try parsing the completed version
        return JSON.parse(completed)
    } catch (e) {
        // Strategy 2: Extract what we can using regex
        const result: any = {}

        // Extract string fields
        const stringMatches = jsonString.matchAll(/"(\w+)"\s*:\s*"([^"]*)/g)
        for (const match of stringMatches) {
            result[match[1]] = match[2]
        }

        // Extract array fields (simplified - just detect presence)
        const arrayMatches = jsonString.matchAll(/"(\w+)"\s*:\s*\[/g)
        for (const match of arrayMatches) {
            result[match[1]] = [] // Mark as array, will be filled later
        }

        // Return whatever we extracted
        return Object.keys(result).length > 0 ? result : null
    }
}

/**
 * Safe field extractor - gets field value with fallback
 */
export function extractField(obj: any, field: string, defaultValue: any = null): any {
    if (!obj) return defaultValue
    return obj[field] !== undefined ? obj[field] : defaultValue
}
