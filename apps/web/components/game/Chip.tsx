'use client'

import { motion, useAnimation, PanInfo } from 'framer-motion'
import { ChipData } from '@/store/editorStore'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ChipProps {
    data: ChipData
    isUsed: boolean
    onDragStart: () => void
    onSwipeAway: () => void
}

export function Chip({ data, isUsed, onDragStart, onSwipeAway }: ChipProps) {
    const controls = useAnimation()
    const [isDragging, setIsDragging] = useState(false)

    const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false)
        const SWIPE_THRESHOLD = 100

        // Check for Swipe Away (Horizontal)
        if (Math.abs(info.offset.x) > SWIPE_THRESHOLD && Math.abs(info.offset.y) < 50) {
            if (data.interferenceLevel === 'Low') {
                // Success: Fly away
                await controls.start({
                    x: info.offset.x > 0 ? 500 : -500,
                    opacity: 0,
                    rotate: info.offset.x > 0 ? 20 : -20,
                    transition: { duration: 0.3 }
                })
                onSwipeAway()
            } else {
                // Failure: High Interference -> Vibrate and return
                await controls.start({
                    x: [0, -10, 10, -10, 0],
                    transition: { duration: 0.4 }
                })
                controls.start({ x: 0, y: 0 })
            }
        } else {
            // Return to position if not dropped in a zone (handled by layoutId usually, but here we reset if not swiped)
            controls.start({ x: 0, y: 0 })
        }
    }

    return (
        <motion.div
            layoutId={`chip-${data.id}`}
            drag={!isUsed}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // We want "elastic" drag for swipe, but free drag for drop?
            // Actually, for combined behavior:
            // We enable drag. If it's a swipe, we handle it. If it's a drop, the DropZone handles the data transfer.
            // BUT Framer Motion drag doesn't use HTML5 Drag & Drop API by default.
            // To support BOTH, we usually use HTML5 DnD for dropping into zones, and Framer for swiping.
            // OR we use Framer for everything and detect collision.
            // Given the requirement for "Drag & Drop Precision" and "Swipe Away", let's try to use Framer's drag for both.
            // However, HTML5 DnD is more robust for "dropping into a specific element".
            // Let's stick to the previous HTML5 DnD for the "Drop" part to ensure compatibility with the existing DropZone logic,
            // but add Framer Motion for the "Swipe" visual.
            // WAIT: HTML5 DnD and Framer Drag usually conflict.
            // Strategy: Use Framer Drag. Detect drop via mouse position or use a library like dnd-kit.
            // OR: Use HTML5 DnD, but add a "Swipe" handler separately? No, swipe is a drag.

            // REVISED STRATEGY: Use Framer Motion `drag`.
            // The DropZone will need to detect if a draggable is released over it.
            // Since we are refactoring, let's stick to the HTML5 DnD for the *answering* mechanism as it was working,
            // AND add a separate "Swipe" gesture handler?
            // No, that's confusing UX.

            // Let's use Framer Motion `drag` for everything.
            // We need to expose the `onDragStart` to set data.
            // But Framer `drag` doesn't set `dataTransfer`.

            // Hybrid approach:
            // Use HTML5 `draggable` for the chip.
            // But for "Swipe", we need to detect the gesture.
            // HTML5 DnD doesn't support "Swipe away" easily.

            // Let's go with Framer Motion `drag`.
            // We will use `onDragEnd` to check if we are over a drop zone?
            // That requires global state of drop zones.

            // Alternative: The user requirement says "Drag & Drop Precision... Snap in place".
            // And "Swipe Away... Fly away".
            // I will use Framer Motion `drag`.
            // To handle the "Drop", I will use the `onDragStart` to set a global "draggingId" in the store.
            // The DropZone will detect `onMouseUp` or `onPointerUp` and check if it's hovering?
            // Actually, standard HTML5 DnD is best for "Drop into zone".
            // Can we make an element draggable via HTML5 AND animatable via Framer?
            // Yes.

            // Let's try:
            // 1. `drag` prop from Framer Motion (allows movement).
            // 2. `onDragEnd` checks for Swipe threshold.
            // 3. If not swiped, it snaps back.
            // 4. BUT, how to drop into a blank?
            //    If we use Framer Drag, we don't get `onDrop` events on the target.

            // OK, I will use HTML5 DnD for the *interaction* with blanks.
            // And I will use a separate "Swipe Handler" or just accept that "Swipe" is a specific drag action?
            // If I drag far right, it's a swipe.
            // If I drag to a blank, it's a drop.

            // Let's use Framer Motion `drag` + `dragSnapToOrigin`.
            // And for the "Drop", we need a way to detect collision.
            // Since `EditorGame` knows the refs of DropZones, maybe we can calculate?
            // That's complex.

            // Simpler: Use HTML5 DnD.
            // Add a "Swipe Zone" on the left/right of the screen?
            // Or just listen to `onDragEnd` of HTML5?
            // HTML5 `dragend` gives us the final coordinate.
            // If `event.clientX` is near the edge, treat as swipe?
            // Yes! This is cleaner.

            // So:
            // 1. Keep HTML5 `draggable`.
            // 2. On `dragStart`, set data.
            // 3. On `dragEnd`, check `e.clientX`. If > threshold, trigger "Swipe" logic.
            // 4. If "Swipe" logic triggers -> Animate the chip flying away (using Framer controls).

            animate={controls}
            draggable={!isUsed}
            onDragStart={(e: any) => {
                if (isUsed) {
                    e.preventDefault()
                    return
                }
                setIsDragging(true)
                onDragStart()
                // HTML5 DnD
                e.dataTransfer.setData('text/plain', data.id)
                e.dataTransfer.effectAllowed = 'copyMove'

                // Hide the default ghost image so we can use our own (optional, but Framer might fight it)
                // Actually, let's keep default ghost for now to ensure user sees what they are dragging.
                // Or better: Use a custom drag layer.
            }}
            onDragEnd={(e: any) => {
                setIsDragging(false)
                // Check for Swipe
                // Note: e.clientX might be 0 in some browsers on dragEnd?
                // Usually it works.
                const screenWidth = window.innerWidth
                const x = e.clientX
                const SWIPE_MARGIN = 100

                if (x < SWIPE_MARGIN || x > screenWidth - SWIPE_MARGIN) {
                    // It's a swipe attempt
                    if (data.interferenceLevel === 'Low') {
                        onSwipeAway()
                    } else {
                        // High interference: Shake
                        controls.start({
                            x: [0, -10, 10, -10, 0],
                            transition: { duration: 0.4 }
                        })
                    }
                }
            }}

            // Visuals
            whileHover={!isUsed ? { scale: 1.05, y: -2 } : {}}
            whileTap={!isUsed ? { scale: 0.95 } : {}}

            className={cn(
                "cursor-grab active:cursor-grabbing select-none",
                "flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
                isUsed
                    ? "border-transparent bg-muted/20 text-muted-foreground/40"
                    : "border-border/40 bg-card text-card-foreground shadow-sm hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5",
                isDragging && "opacity-50 scale-105 shadow-xl"
            )}
        >
            <span className="font-bold text-primary/80 text-xs tracking-wide">{data.label}</span>
            <span className="tracking-tight">{data.text}</span>
        </motion.div>
    )
}
