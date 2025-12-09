'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Check local storage for "has seen"
function hasSeenTutorial(featureKey: string): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(`tutorial_seen_${featureKey}`);
}

function markTutorialSeen(featureKey: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`tutorial_seen_${featureKey}`, 'true');
}

interface TutorialBubbleProps {
    featureKey: string;
    message: string;
    trigger?: boolean; // Defaults to true (show immediately if valid)
    onComplete?: () => void;
    className?: string; // For positioning
    position?: 'top' | 'bottom' | 'center' | 'relative'; // Default center
}

export const TutorialBubble: React.FC<TutorialBubbleProps> = ({
    featureKey,
    message,
    trigger = true,
    onComplete,
    className,
    position = 'center'
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show if triggered and NOT seen yet
        if (trigger && !hasSeenTutorial(featureKey)) {
            // Delay slightly to ensure UI is ready and user notices it
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 600); // 0.6s delay
            return () => clearTimeout(timer);
        }
    }, [trigger, featureKey]);

    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                markTutorialSeen(featureKey);
                onComplete?.();
            }, 3000); // 3 seconds max display

            return () => clearTimeout(timer);
        }
    }, [isVisible, featureKey, onComplete]);

    // Position styles
    const positionStyles = {
        top: 'top-20 left-1/2 -translate-x-1/2',
        bottom: 'bottom-32 left-1/2 -translate-x-1/2', // Moved up a bit to clear bottom bars
        center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        relative: '' // Use className for manual positioning
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={cn(
                        "absolute z-[60] pointer-events-none max-w-[280px] w-full",
                        position !== 'relative' && "fixed",
                        position === 'relative' ? '' : positionStyles[position],
                        className
                    )}
                >
                    <div className="bg-zinc-900/80 dark:bg-zinc-100/90 backdrop-blur-md text-white dark:text-zinc-900 px-5 py-3 rounded-2xl shadow-xl border border-white/10 dark:border-black/5 text-center">
                        <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap tracking-wide">
                            {message}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
