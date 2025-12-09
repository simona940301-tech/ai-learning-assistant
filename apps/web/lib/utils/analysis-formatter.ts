import type { FileAnalysis } from '@/lib/types'

/**
 * Format full analysis content for saving
 */
export const formatFullContent = (
    analysis: FileAnalysis,
    options: {
        includeKeyConcepts: boolean
        includeExamPredictions: boolean
    } = { includeKeyConcepts: true, includeExamPredictions: true }
): string => {
    let md = ''

    // 1. Summary (always included)
    const summary = analysis.structuredNotes || analysis.quickSummary
    if (summary) {
        md += summary + '\n\n'
    }

    // 2. Core Concepts (optional)
    if (options.includeKeyConcepts && analysis.coreConcepts && analysis.coreConcepts.length > 0) {
        md += '---\n\n## 🔑 關鍵概念\n\n'
        analysis.coreConcepts.forEach((c) => {
            md += `### ${c.concept}\n${c.explanation}\n`
            if (c.importance) md += `**重要性**: ${c.importance}\n`
            md += '\n'
        })
    }

    // 3. Exam Predictions (optional)
    if (options.includeExamPredictions && analysis.examPredictions && analysis.examPredictions.length > 0) {
        md += '---\n\n## 📝 考題預測\n\n'
        // Handle both singular (legacy) and plural property names if needed, 
        // though the type definition usually enforces one. 
        // Based on previous code, it seems to use `examPredictions`.

        analysis.examPredictions.forEach((item, i) => {
            // Check if it's a question set or single question
            // The type definition might be complex, so we'll handle it defensively similar to the component

            // Helper to clean question content (simplified version of what's in the component)
            const cleanContent = (raw?: string) => {
                if (!raw) return ''
                return raw.replace(/^\s*[A-D][\.\、\)]\s+/gm, '').trim()
            }

            if ('type' in item && (item as any).type === 'question_set' || (item as any).questions) {
                // Question Set
                md += `### 題組 ${i + 1}\n`
                if ('context' in item) {
                    md += `${(item as any).context}\n\n`
                }

                if ('questions' in item && Array.isArray((item as any).questions)) {
                    (item as any).questions.forEach((q: any, qIdx: number) => {
                        md += `#### ${qIdx + 1}. ${cleanContent(q.question)}\n`
                        if (q.options && Array.isArray(q.options)) {
                            q.options.forEach((opt: any, oIdx: number) => {
                                const label = typeof opt === 'object' && opt.label ? opt.label : String.fromCharCode(65 + oIdx)
                                const text = typeof opt === 'object' && opt.text ? opt.text : opt
                                md += `- ${label}. ${text}\n`
                            })
                        }
                        if (q.answer) md += `**答案**: ${q.answer}\n`
                        if (q.analysis) md += `**解析**: ${q.analysis}\n`
                        md += '\n'
                    })
                }
            } else {
                // Single Question
                md += `### 題目 ${i + 1}\n`
                const q = item as any
                md += `${cleanContent(q.question)}\n`

                if (q.options && Array.isArray(q.options)) {
                    q.options.forEach((opt: any, oIdx: number) => {
                        const label = typeof opt === 'object' && opt.label ? opt.label : String.fromCharCode(65 + oIdx)
                        const text = typeof opt === 'object' && opt.text ? opt.text : opt
                        md += `- ${label}. ${text}\n`
                    })
                }

                if (q.answer) md += `**答案**: ${q.answer}\n`
                if (q.analysis) md += `**解析**: ${q.analysis}\n`
                md += '\n'
            }
        })
    }

    return md
}
