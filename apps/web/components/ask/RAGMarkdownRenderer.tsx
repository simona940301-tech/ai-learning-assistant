'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface RAGMarkdownRendererProps {
    content?: string
    markdown?: string
    subject?: string
    className?: string
}

/**
 * Helper to parse source citations and render them as minimalist chips
 * Pattern: (來源: filename.pdf) or (Source: filename.pdf)
 */
function renderWithSourceChips(text: string | React.ReactNode): React.ReactNode {
    if (typeof text !== 'string') return text

    // Regex to capture the full citation group: (來源: ...)
    // Supports: 來源, Source, source, from
    const regex = /(\((?:來源|Source|source|from):\s*[^)]+\))/g

    const parts = text.split(regex)

    if (parts.length === 1) return text

    return parts.map((part, index) => {
        const match = part.match(/\((?:來源|Source|source|from):\s*([^)]+)\)/)
        if (match) {
            const fullSource = match[1].trim()
            // Minimalist truncation: "math_ch1.pdf" -> "math_ch1..."
            // Keep it very short as requested
            const truncated = fullSource.length > 12
                ? fullSource.substring(0, 8) + '...'
                : fullSource

            return (
                <span
                    key={index}
                    className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded-md text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700 align-baseline select-none cursor-help transition-colors hover:bg-stone-200 dark:hover:bg-stone-700"
                    title={fullSource}
                >
                    {truncated}
                </span>
            )
        }
        return part
    })
}

/**
 * Unified Markdown renderer for RAG analysis results
 * Based on ExplainCardV2/MarkdownExplain design patterns
 */
export function RAGMarkdownRenderer({ content, markdown, subject, className }: RAGMarkdownRendererProps) {
    const text = content ?? markdown ?? ''

    return (
        <div className={cn("prose prose-sm max-w-none", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // h1: Subject title
                    h1: ({ children }) => (
                        <div className="mb-6 pb-4 border-b border-border">
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                {children}
                            </h1>
                        </div>
                    ),

                    // h2: Main sections (重點統整, 考題預測)
                    h2: ({ children }) => {
                        const text = String(children)
                        const isHighlight = text.includes('🟫') || text.includes('🟦') || text.includes('📋')

                        return (
                            <h2
                                className={cn(
                                    'text-xl font-semibold mt-8 mb-4 first:mt-0',
                                    isHighlight ? 'text-primary' : 'text-[#4B3425]'
                                )}
                            >
                                {children}
                            </h2>
                        )
                    },

                    // h3: Subsections
                    h3: ({ children }) => (
                        <h3 className="text-lg font-medium text-[#5C4033] mt-6 mb-3">
                            {children}
                        </h3>
                    ),

                    // Lists: Clean spacing
                    ul: ({ children }) => (
                        <ul className="space-y-2 my-4">
                            {children}
                        </ul>
                    ),

                    li: ({ children }) => (
                        <li className="text-foreground/90 leading-relaxed">
                            {renderWithSourceChips(children)}
                        </li>
                    ),

                    // Strong: Definitions and key points
                    strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">
                            {children}
                        </strong>
                    ),

                    // Blockquote: Source attribution
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4">
                            {children}
                        </blockquote>
                    ),

                    // Horizontal rule: Section divider
                    hr: () => (
                        <hr className="my-8 border-border" />
                    ),

                    // Paragraphs: Comfortable spacing
                    p: ({ children }) => (
                        <p className="text-foreground/90 leading-relaxed my-3">
                            {renderWithSourceChips(children)}
                        </p>
                    ),

                    // Code: Inline code
                    code: ({ children, className }) => {
                        const isInline = !className
                        if (isInline) {
                            return (
                                <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-sm">
                                    {children}
                                </code>
                            )
                        }
                        return (
                            <code className={className}>
                                {children}
                            </code>
                        )
                    },
                }}
            >
                {text}
            </ReactMarkdown>
        </div>
    )
}

/**
 * Get subject icon emoji
 */
function getSubjectIcon(subject?: string): string {
    const icons: Record<string, string> = {
        chinese: '📚',
        english: '🔤',
        math: '🔢',
        science: '🔬',
        social: '🌍',
        other: '📖',
    }
    return icons[subject || 'other'] || '📖'
}
