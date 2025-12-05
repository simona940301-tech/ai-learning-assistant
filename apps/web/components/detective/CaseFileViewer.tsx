'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CaseParagraph } from '@/lib/detective/types'
import { useDetectiveStore } from '@/lib/detective/store'
import { useDetectiveTelemetry } from '@/lib/detective/telemetry'
import { cn } from '@/lib/utils'

interface CaseFileViewerProps {
    paragraphs: CaseParagraph[]
    className?: string
}

export function CaseFileViewer({ paragraphs, className }: CaseFileViewerProps) {
    const { highlightText, highlightedEvidence, currentQuota } = useDetectiveStore()
    const { trackHighlight } = useDetectiveTelemetry()
    const [hoveredParagraph, setHoveredParagraph] = useState<string | null>(null)

    const handleParagraphClick = (paragraph: CaseParagraph) => {
        if (currentQuota <= 0) {
            // Trigger "Chief Slam" or shake animation here if handled locally, 
            // or rely on the store/global state to trigger it.
            return
        }

        // Check if already highlighted
        const isAlreadyHighlighted = highlightedEvidence.some(e => e.paragraphId === paragraph.id)
        if (isAlreadyHighlighted) return

        highlightText({
            text: paragraph.text,
            paragraphId: paragraph.id,
            startOffset: 0, // Simplified for now: whole paragraph
            endOffset: paragraph.text.length
        })

        trackHighlight(paragraph.text.length, paragraph.id, currentQuota - 1)

        // Trigger AI Analysis
        // In a real app, we'd probably use a React Query mutation or similar
        fetch('/api/detective/analyze', {
            method: 'POST',
            body: JSON.stringify({
                question: "What inconsistency suggests the victim might not have poured the drink himself?", // TODO: Get actual current question
                evidence: paragraph.text,
                context: paragraph.text, // Simplified context
                mode: 'single'
            })
        })
            .then(res => res.json())
            .then(data => {
                useDetectiveStore.getState().addNarrativeLog({
                    speaker: 'Old Detective',
                    message: data.feedback,
                    type: data.isValid ? 'success' : 'warning'
                })
            })
            .catch(err => {
                console.error(err)
            })
    }

    return (
        <div className={cn("space-y-6 p-6 font-serif text-lg leading-relaxed text-gray-300", className)}>
            {paragraphs.map((p) => {
                const isHighlighted = highlightedEvidence.some(e => e.paragraphId === p.id)

                return (
                    <motion.div
                        key={p.id}
                        className={cn(
                            "relative p-4 rounded-sm transition-colors duration-300 cursor-pointer border-l-2",
                            isHighlighted
                                ? "bg-yellow-900/20 border-yellow-500 text-yellow-100"
                                : "border-transparent hover:bg-slate-800/50 hover:border-slate-600"
                        )}
                        onMouseEnter={() => setHoveredParagraph(p.id)}
                        onMouseLeave={() => setHoveredParagraph(null)}
                        onClick={() => handleParagraphClick(p)}
                        whileHover={!isHighlighted ? {
                            scale: 1.01,
                            x: [0, 1, -1, 0], // Oscillating effect
                            transition: {
                                x: { repeat: Infinity, duration: 0.2 } // Rapid "nervous" oscillation
                            }
                        } : {}}
                    >
                        {/* Spotlight Effect Overlay */}
                        {!isHighlighted && hoveredParagraph === p.id && (
                            <motion.div
                                layoutId="spotlight"
                                className="absolute inset-0 bg-white/5 pointer-events-none mix-blend-overlay rounded-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            />
                        )}

                        {p.isImage ? (
                            <img src={p.imageUrl} alt="Case Evidence" className="max-w-full rounded-md opacity-90 grayscale hover:grayscale-0 transition-all" />
                        ) : (
                            <p>{p.text}</p>
                        )}

                        {/* Highlight Marker */}
                        {isHighlighted && (
                            <motion.span
                                layoutId={`highlight-${p.id}`}
                                className="absolute top-2 right-2 text-xs text-yellow-500 font-mono"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                EVIDENCE #{highlightedEvidence.findIndex(e => e.paragraphId === p.id) + 1}
                            </motion.span>
                        )}
                    </motion.div>
                )
            })}
        </div>
    )
}
