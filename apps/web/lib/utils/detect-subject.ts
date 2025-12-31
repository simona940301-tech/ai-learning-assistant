/**
 * Detect the subject of a question based on its text content
 * Returns Chinese tag name for use in notebook_entries tags
 */

export type SubjectTag = '英文' | '數學' | '國文' | '社會' | '自然'

export function detectSubject(questionText: string): SubjectTag {
    const text = questionText.toLowerCase()

    // Math detection - highest priority for clear math indicators
    const mathPatterns = [
        /\d+\s*[+\-×÷*/=]\s*\d+/,  // Basic arithmetic: 2+3, 5*4
        /[xy]\s*[+\-=]/,            // Algebra: x+5, y-3
        /\b(solve|equation|calculate|derivative|integral|function|formula|theorem)\b/i,
        /[∫∑∏√π∞≠≤≥]/,             // Math symbols
        /\b(sin|cos|tan|log|ln)\b/,
        /求解|計算|方程式|函數|公式|定理|微分|積分/,
    ]

    for (const pattern of mathPatterns) {
        if (pattern.test(text)) {
            return '數學'
        }
    }

    // English detection - check for English-specific patterns
    const hasEnglishWords = /\b[a-z]{3,}\b/i.test(text)
    const englishPatterns = [
        /\b(vocabulary|grammar|tense|verb|noun|adjective|preposition)\b/i,
        /\b(author|passage|paragraph|sentence|word|meaning)\b/i,
        /單字|文法|時態|動詞|名詞|形容詞|介系詞/,
        /\b[A-Z][a-z]+\s+[A-Z][a-z]+/,  // Proper names in English
    ]

    // Count English words vs Chinese characters
    const englishWordCount = (text.match(/\b[a-z]+\b/gi) || []).length
    const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length

    // If predominantly English text or has English-specific patterns
    if (englishWordCount > 10 || (hasEnglishWords && englishWordCount > chineseCharCount)) {
        for (const pattern of englishPatterns) {
            if (pattern.test(text)) {
                return '英文'
            }
        }
        // Default to English if has many English words
        if (englishWordCount > 5) {
            return '英文'
        }
    }

    // Chinese/Classical Chinese detection
    const chinesePatterns = [
        /古文|文言文|詩詞|成語|修辭|國學/,
        /[之乎者也矣焉]/,  // Classical Chinese particles
        /\b(作者|文章|段落|句子|詞語|意思)\b/,
    ]

    for (const pattern of chinesePatterns) {
        if (pattern.test(text)) {
            return '國文'
        }
    }

    // Science detection
    const sciencePatterns = [
        /物理|化學|生物|地球科學|實驗|元素|分子|原子|細胞|DNA/,
        /\b(physics|chemistry|biology|experiment|element|molecule|atom|cell)\b/i,
        /[HCONFe]\d+/,  // Chemical formulas
    ]

    for (const pattern of sciencePatterns) {
        if (pattern.test(text)) {
            return '自然'
        }
    }

    // Social Studies detection
    const socialPatterns = [
        /歷史|地理|公民|政治|經濟|社會|文化|朝代|戰爭|條約/,
        /\b(history|geography|politics|economy|society|culture|dynasty|war|treaty)\b/i,
    ]

    for (const pattern of socialPatterns) {
        if (pattern.test(text)) {
            return '社會'
        }
    }

    // Default: If has significant English content, default to English
    // Otherwise default to Math (since that's what most questions seem to be)
    if (englishWordCount > 3 && englishWordCount > chineseCharCount * 0.5) {
        return '英文'
    }

    return '數學'
}
