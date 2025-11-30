/**
 * Smart text chunking that preserves document structure
 * Instead of naive substring, this extracts important sections
 */

interface Section {
    title: string
    content: string
    importance: number
    startIndex: number
}

/**
 * Smart chunk: Extract most important sections up to maxChars
 */
export function smartChunk(text: string, maxChars: number): string {
    // 1. Detect sections by headers
    const sections = extractSections(text)

    if (sections.length === 0) {
        // Fallback to simple substring if no structure detected
        return text.substring(0, maxChars)
    }

    // 2. Rank by importance
    const ranked = rankByImportance(sections, text)

    // 3. Select top sections until maxChars
    let result = ''
    let charCount = 0

    for (const section of ranked) {
        const sectionText = `${section.title}\n${section.content}\n\n`

        if (charCount + sectionText.length > maxChars) {
            // Add partial content if space remains
            const remaining = maxChars - charCount
            if (remaining > 200) {
                result += sectionText.substring(0, remaining) + '...\n'
            }
            break
        }

        result += sectionText
        charCount += sectionText.length
    }

    return result || text.substring(0, maxChars)
}

/**
 * Extract key paragraphs for preview (Layer 1)
 * Gets beginning + conclusion for quick overview
 */
export function extractPreviewText(text: string, maxChars: number = 1500): string {
    // Get first 1000 chars
    const beginning = text.substring(0, 1000)

    // Try to find conclusion section (without ES2018+ flags)
    const conclusionPatterns = [
        /(?:結論|總結|摘要|結語)[：:]\s*([\s\S]+?)(?:\n\n|\n[一二三四五六七八九十]|$)/,
        /(?:conclusion|summary|abstract)[：:]\s*([\s\S]+?)(?:\n\n|$)/i
    ]

    let conclusion = ''
    for (const pattern of conclusionPatterns) {
        const match = text.match(pattern)
        if (match && match[1]) {
            conclusion = match[1].substring(0, 500)
            break
        }
    }

    const combined = beginning + (conclusion ? '\n\n【結論】\n' + conclusion : '')
    return combined.substring(0, maxChars)
}

/**
 * Extract sections from text based on headers
 */
function extractSections(text: string): Section[] {
    const sections: Section[] = []

    // Detect headers with various patterns
    const headerPatterns = [
        { regex: /^#{1,6}\s+(.+)$/gm, type: 'markdown' },           // # Header
        { regex: /^([一二三四五六七八九十百千]+)[、.]\s*(.+)$/gm, type: 'chinese' },  // 一、Header
        { regex: /^(\d+)[、.]\s*(.+)$/gm, type: 'number' },         // 1. Header
        { regex: /^([A-Z])[、.]\s*(.+)$/gm, type: 'letter' },       // A. Header
        { regex: /^(.+)\n[=]{3,}$/gm, type: 'underline' }           // Header\n===
    ]

    const matches: Array<{ title: string; index: number }> = []

    for (const { regex, type } of headerPatterns) {
        let match
        // Create a new RegExp instance for each iteration
        const pattern = new RegExp(regex.source, regex.flags)
        while ((match = pattern.exec(text)) !== null) {
            const title = match[1] || match[0]
            matches.push({
                title: title.trim(),
                index: match.index
            })
        }
    }

    // Sort by position
    matches.sort((a, b) => a.index - b.index)

    // Remove duplicates (same position)
    const uniqueMatches = matches.filter((match, index) => {
        if (index === 0) return true
        return match.index !== matches[index - 1].index
    })

    // Extract content between headers
    for (let i = 0; i < uniqueMatches.length; i++) {
        const current = uniqueMatches[i]
        const next = uniqueMatches[i + 1]

        const content = text.substring(
            current.index,
            next ? next.index : text.length
        ).trim()

        sections.push({
            title: current.title,
            content: content,
            importance: 0, // Will be calculated
            startIndex: current.index
        })
    }

    // If no sections found, treat whole text as one section
    if (sections.length === 0) {
        sections.push({
            title: '內容',
            content: text,
            importance: 1,
            startIndex: 0
        })
    }

    return sections
}

/**
 * Rank sections by importance
 * Factors: position, length, keyword density
 */
function rankByImportance(sections: Section[], fullText: string): Section[] {
    // Important keywords that indicate key content
    const keywords = [
        '重點', '核心', '關鍵', '重要', '必考', '常考',
        '定義', '公式', '定理', '原理', '概念',
        'important', 'key', 'core', 'essential', 'critical'
    ]

    sections.forEach((section, index) => {
        let score = 0

        // 1. Position score (0-1, earlier is better)
        // First section gets 1.0, last gets 0.0
        score += (1 - index / Math.max(sections.length - 1, 1)) * 0.3

        // 2. Length score (0-1, normalized)
        // Longer sections are more substantial
        const maxLength = Math.max(...sections.map(s => s.content.length), 1)
        score += (section.content.length / maxLength) * 0.3

        // 3. Keyword score (0-1)
        // Count keyword occurrences
        const keywordCount = keywords.reduce((count, keyword) => {
            const regex = new RegExp(keyword, 'gi')
            const matches = section.content.match(regex)
            return count + (matches ? matches.length : 0)
        }, 0)
        score += Math.min(keywordCount / 5, 1) * 0.4

        section.importance = score
    })

    // Sort by importance (descending)
    return sections.sort((a, b) => b.importance - a.importance)
}

/**
 * Extract key sentences from text (alternative to chunking)
 */
export function extractKeySentences(text: string, maxSentences: number = 10): string {
    // Split into sentences
    const sentences = text
        .split(/[。！？.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10)

    if (sentences.length <= maxSentences) {
        return sentences.join('。') + '。'
    }

    // Score sentences by keyword density
    const keywords = ['重點', '核心', '關鍵', '重要', '定義', '公式']

    const scored = sentences.map((sentence, index) => {
        let score = 0

        // Position bonus (first and last sentences)
        if (index === 0 || index === sentences.length - 1) {
            score += 0.5
        }

        // Keyword bonus
        keywords.forEach(keyword => {
            if (sentence.includes(keyword)) {
                score += 1
            }
        })

        // Length bonus (prefer medium-length sentences)
        const idealLength = 50
        const lengthScore = 1 - Math.abs(sentence.length - idealLength) / idealLength
        score += lengthScore * 0.3

        return { sentence, score }
    })

    // Sort by score and take top N
    const topSentences = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSentences)
        .map(s => s.sentence)

    return topSentences.join('。') + '。'
}
