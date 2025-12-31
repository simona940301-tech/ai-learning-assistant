'use client'

import React, { useRef } from 'react'
import { motion, useDragControls, Reorder } from 'framer-motion'
import { useDetectiveStore } from '@/lib/detective/store'
import { useDetectiveTelemetry } from '@/lib/detective/telemetry'
import { cn } from '@/lib/utils'

interface EvidenceBoardProps {
    className?: string
}

export function EvidenceBoard({ className }: EvidenceBoardProps) {
    const { boardItems, highlightedEvidence, moveBoardItem, removeFromBoard, addToBoard } = useDetectiveStore()
    const { trackDragEvidence } = useDetectiveTelemetry()
    const containerRef = useRef<HTMLDivElement>(null)

    // This component handles the "desk" area where evidence is placed.
    // We need to allow dragging items around.

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full h-full bg-[#1a1a1a] overflow-hidden border-l border-slate-800 shadow-inner",
                "bg-[url('/textures/corkboard.png')] bg-repeat", // Placeholder texture
                className
            )}
        >
            <div className="absolute top-4 left-4 text-slate-500 font-mono text-sm pointer-events-none select-none">
                EVIDENCE BOARD // DRAG TO ORGANIZE
            </div>

            {/* Drop Zone / Board Area */}
            {boardItems.map((item) => {
                const evidence = highlightedEvidence.find(e => e.id === item.evidenceId)
                if (!evidence) return null

                return (
                    <motion.div
                        key={item.id}
                        drag
                        dragMomentum={false}
                        dragConstraints={containerRef}
                        initial={{ x: item.x, y: item.y, rotate: item.rotation, scale: 0.8, opacity: 0 }}
                        animate={{ x: item.x, y: item.y, rotate: item.rotation, scale: 1, opacity: 1 }}
                        whileDrag={{ scale: 1.1, zIndex: 50, rotate: 0, cursor: 'grabbing' }}
                        onDragEnd={(e, info) => {
                            // Calculate new position relative to container
                            // This is a simplified implementation; real world needs precise offset calc
                            // For now, we just update with a dummy delta or rely on visual position
                            // In a real app, we'd calculate the new x/y based on info.point

                            // Simulate "Table Slam" sound here
                            // playSound('slam')

                            trackDragEvidence(item.evidenceId, 'board')
                        }}
                        className="absolute w-64 bg-[#fdf6e3] text-slate-900 p-3 shadow-lg rounded-sm font-handwriting text-sm cursor-grab active:cursor-grabbing"
                        style={{
                            boxShadow: '2px 4px 8px rgba(0,0,0,0.3)'
                        }}
                    >
                        {/* Pin */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 shadow-sm border border-red-800 z-10" />

                        <p className="line-clamp-4 font-serif leading-tight">
                            {evidence.text}
                        </p>

                        <div className="mt-2 pt-2 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider">
                            <span>REF: {evidence.paragraphId.slice(0, 4)}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeFromBoard(item.id)
                                }}
                                className="hover:text-red-600 font-bold"
                            >
                                REMOVE
                            </button>
                        </div>
                    </motion.div>
                )
            })}

            {/* Empty State Hint */}
            {boardItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-slate-700 font-mono text-xs tracking-widest opacity-50">
                        NO EVIDENCE COLLECTED
                    </p>
                </div>
            )}
        </div>
    )
}
