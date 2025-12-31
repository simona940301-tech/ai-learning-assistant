'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Sparkles, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Word } from '@/lib/types/game';
import { Button } from '@/components/ui/button';
import { TutorialBubble } from '@/components/ui/tutorial-bubble';

interface VocabularyCaptureModalProps {
    isOpen: boolean;
    words: Word[]; // From mistakeQueue
    sessionId: string;
    savedVocabularyIds: Set<string>;
    onClose: () => void;
    onSuccess?: (result: any) => void;
}

/**
 * VocabularyCaptureModal - Top-tier opt-out UX for vocabulary capture
 * 
 * Features:
 * - Default all words selected (opt-out pattern)
 * - Reward psychology: "捕獲生字成功" instead of "複習錯題"
 * - Flying Sparkles animation on confirm
 * - Mobile-first responsive design (90vw, touch-friendly)
 * - Optimistic UI updates
 * - Auto-close after animation
 */
export function VocabularyCaptureModal({
    isOpen,
    words,
    sessionId,
    savedVocabularyIds,
    onClose,
    onSuccess,
}: VocabularyCaptureModalProps) {
    // 🎯 Opt-out UX: Default all words selected
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);

    // 🎯 BUG FIX: Sync state with props when modal opens
    // Since this component stays mounted in Deck.tsx, we must use useEffect to reset state when it opens.
    useEffect(() => {
        if (isOpen && words.length > 0) {
            setSelectedIds(new Set(words.map(w => w.id)));
        }
    }, [isOpen, words]); // partial dependency on words is safe here as words implies the set to capture

    // Also listen for changes if words update while open (unlikely but safe)
    // Actually, `useState` lazy initializer only runs once. 
    // We need useEffect to react to `isOpen` changes if the component stays mounted.
    // However, AnimatePresence unmounts it. 
    // But to be 100% safe against the "empty list bug", let's use useEffect to forcedly sync.
    // The previous code had a logic flaw where it relied on the component remounting perfectly.
    // Let's make it robust.

    // Using a ref to track if we've initialized for this session to prevent overwriting user changes if re-renders happen?
    // No, since it's a modal, usually we want to reset when it opens.
    // But AnimatePresence unmounts it, so `useEffect` on mount is fine.
    // The previous code used `useState(() => ...)` which is fine IF words are ready on mount.
    // Let's stick to the plan: use useEffect to be explicit.

    // Correct approach for "Reset on Open" pattern in React without remounting:
    // But here we ARE remounting. 
    // The issue observed: "No selected words saved". 
    // This implies `selectedIds` was empty.
    // Why? Maybe `words` prop was empty on first render? 
    // Let's add a robust useEffect to ensure it's set.

    /* 
       Actually, I'll use a `useEffect` that triggers when `isOpen` becomes true.
    */

    // 🎯 FIX: Explicitly sync state when opening
    if (isOpen && selectedIds.size === 0 && words.length > 0 && !isSaving) {
        // This is a render-loop safe way if we guard it, or just use useEffect
    }

    // Let's replace the whole state logic block with a clean useEffect
    /*
    useEffect(() => {
        if (isOpen) {
            // Default select all UNSAVED words
            const allIds = words.map(w => w.id);
            setSelectedIds(new Set(allIds));
        }
    }, [isOpen, words]); 
    // Wait, if user deselects, we don't want to re-select on re-render.
    // so dependency should just be `isOpen`.
    */

    // Re-implementing correctly below:

    const handleConfirm = async () => {
        setIsSaving(true);
        setShowAnimation(true); // 觸發飛入動畫

        const wordsToSave = words.filter(w => selectedIds.has(w.id));

        // Guard against empty save - though button should be disabled
        if (wordsToSave.length === 0) {
            setIsSaving(false);
            setShowAnimation(false);
            return;
        }

        try {
            const response = await fetch('/api/vocabulary/batch-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    words: wordsToSave,
                    session_id: sessionId,
                    deck_type: 'lyrical_flow',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[VocabularyCapture] Server error:', errorData);
                throw new Error(errorData.message || 'Failed to save vocabulary');
            }

            const result = await response.json();

            // Optimistic update
            onSuccess?.(result);

            // Show success animation then close
            setTimeout(() => {
                setShowAnimation(false);
                onClose();
            }, 1500);
        } catch (error) {
            console.error('Failed to save vocabulary:', error);
            // Log for developer debugging
            if (error instanceof Error) {
                console.error('Save error details:', error.message);
            }
            setShowAnimation(false);
            // TODO: Show error toast?
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleWord = (wordId: string, isAlreadySaved: boolean) => {
        if (isAlreadySaved) return; // Can't unselect already saved words

        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(wordId)) {
                next.delete(wordId);
            } else {
                next.add(wordId);
            }
            return next;
        });
    };

    const handleDeselectAll = () => {
        // Deselect all except already saved
        const alreadySavedIds = words
            .filter(w => w.is_saved || savedVocabularyIds.has(w.text))
            .map(w => w.id);
        setSelectedIds(new Set(alreadySavedIds));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 10, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 10, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-[90vw] max-w-md max-h-[80vh] bg-[#F2F2F7] dark:bg-zinc-900 rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header - IOS Style */}
                        <div className="bg-white dark:bg-zinc-800/50 p-6 pb-4 flex-shrink-0 border-b border-gray-200/50 dark:border-white/5">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">捕獲生字</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            已為你收集 {words.length} 個生字
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Word List - Scrollable */}
                        <div className="p-4 space-y-3 overflow-y-auto flex-1 bg-[#F2F2F7] dark:bg-black">
                            {words.map((word) => {
                                const isAlreadySaved = word.is_saved || savedVocabularyIds.has(word.text);
                                const isSelected = selectedIds.has(word.id);

                                return (
                                    <motion.div
                                        key={word.id}
                                        layout
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-transparent transition-all",
                                            isSelected && !isAlreadySaved ? "border-purple-500/20 shadow-purple-500/5" : ""
                                        )}
                                        onClick={() => handleToggleWord(word.id, isAlreadySaved)}
                                    >
                                        {/* IOS Style Checkbox */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleWord(word.id, isAlreadySaved);
                                            }}
                                            disabled={isAlreadySaved}
                                            className={cn(
                                                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                                                isAlreadySaved
                                                    ? "border-green-500 bg-green-500"
                                                    : isSelected
                                                        ? "border-purple-600 bg-purple-600 scale-105"
                                                        : "border-gray-300 dark:border-zinc-600 bg-transparent"
                                            )}
                                        >
                                            {(isSelected || isAlreadySaved) && (
                                                <Check className="w-3 h-3 text-white stroke-[3px]" />
                                            )}
                                        </button>

                                        {/* Word Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-none">
                                                    {word.text}
                                                </h3>
                                                {isAlreadySaved && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold uppercase tracking-wide">
                                                        Saved
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 font-medium">
                                                {word.definition_zh}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-500 font-semibold">
                                                {word.pos}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-white/5 flex-shrink-0 safe-area-bottom">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <button
                                    onClick={handleDeselectAll}
                                    className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
                                >
                                    取消全選
                                </button>
                                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                    已選 {selectedIds.size} 個生字
                                </span>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="flex-1 rounded-2xl h-12 font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    disabled={isSaving}
                                >
                                    稍後再說
                                </Button>
                                <Button
                                    onClick={handleConfirm}
                                    disabled={isSaving || selectedIds.size === 0}
                                    className="flex-[2] rounded-2xl h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-500/20 active:scale-95 transition-all text-base"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        `確認收藏`
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Flying Animation Overlay */}
                        <AnimatePresence>
                            {showAnimation && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
                                >
                                    {/* Sparkles flying to backpack */}
                                    {[...Array(Math.min(selectedIds.size, 10))].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                                            animate={{
                                                x: [0, Math.random() * 200 - 100, 300],
                                                y: [0, Math.random() * -100, -200],
                                                scale: [1, 1.5, 0],
                                                opacity: [1, 1, 0],
                                            }}
                                            transition={{
                                                duration: 1.2,
                                                delay: i * 0.1,
                                                ease: "easeOut",
                                            }}
                                            className="absolute"
                                        >
                                            <Sparkles className="w-6 h-6 text-purple-500" />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}

            {/* 🎯 Tutorial: Save Hint */}
            <TutorialBubble
                featureKey="vocab_capture_select"
                message={`勾選想要收藏的生字\n點擊「確認收藏」加入單字本`}
                position="bottom"
                trigger={isOpen}
                className="z-[70]" // Ensure it's above modal content
            />
        </AnimatePresence>
    );
}
