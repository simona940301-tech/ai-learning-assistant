'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface RAGMarkdownRendererProps {
    markdown: string
    subject?: string
}

/**
 * Unified Markdown renderer for RAG analysis results
 * Based on ExplainCardV2/MarkdownExplain design patterns
 */
export function RAGMarkdownRenderer({ markdown, subject }: RAGMarkdownRendererProps) {
    return (
        <div className="prose prose-sm max-w-none">
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
                            {children}
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
                            {children}
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
                {markdown}
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
