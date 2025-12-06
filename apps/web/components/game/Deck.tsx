import React, { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Card } from './Card';
import { FlowControlCard } from './FlowControlCard';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, CheckCircle } from 'lucide-react';

export const Deck: React.FC = () => {
    const {
        words,
        currentIndex,
        swipe,
        loadWords,
        mistakeQueue,
        restartGame,
        sessionCounter,
        handleFlowControlSwipe
    } = useGameStore();

    useEffect(() => {
        loadWords(); // No arguments needed now as they are in store state
    }, []);

    // Session Limit Logic for Flow Control Card
    const SESSION_LIMIT = 20;
    const showFlowControl = sessionCounter >= SESSION_LIMIT;

    // End of Game State (Ran out of words completely)
    // Note: If we are showing Flow Control, we don't show this.
    // We only show this if we really ran out of cards in the `words` array AND we aren't in flow control.
    // But if words are infinite/reloaded, this might not be hit often unless filtered strict.
    if (words.length === 0) {
        return <div className="flex items-center justify-center h-full text-zinc-500">Loading Deck...</div>;
    }

    // Only show "Session Complete" empty state if we are NOT in flow control 
    // AND we are past the end of the cards. 
    // IF we are in flow control, the FlowControlCard will appear On Top.
    // However, if we swipe the last card, currentIndex will be > length.
    // We need to ensure we can see the FlowControlCard even if currentIndex is out of bounds.

    const isFinished = currentIndex >= words.length;

    if (isFinished && !showFlowControl) {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-6 text-center space-y-6">
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                    <CheckCircle size={48} className="text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold">All Cards Reviewed!</h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                    You've gone through the whole deck.
                </p>

                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-green-600">{words.length - mistakeQueue.length}</div>
                        <div className="text-xs text-zinc-500 uppercase">Mastered</div>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-red-500">{mistakeQueue.length}</div>
                        <div className="text-xs text-zinc-500 uppercase">Mistakes</div>
                    </div>
                </div>

                <button
                    onClick={restartGame}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                    <RotateCcw size={18} />
                    Start Over
                </button>
            </div>
        );
    }

    // Determine which cards to render
    // If showFlowControl is true, we might want to hide the regular cards or just overlay?
    // The requirement says "stack on top". So we render cards underneath?
    // Or just render the FlowControlCard as the top-most "Card".

    // Let's render the visible cards. 
    // Note: if currentIndex >= words.length, visibleCards is empty.
    const visibleCards = words.slice(currentIndex, currentIndex + 3).reverse();

    return (
        <div className="relative w-full h-[70vh] flex items-center justify-center px-4">
            {/* Card Stack */}
            <div className="relative w-full h-full flex items-center justify-center">
                <AnimatePresence>
                    {visibleCards.map((word, index) => {
                        const isTop = word.id === words[currentIndex].id;
                        return (
                            <div
                                key={word.id}
                                className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center"
                                style={{
                                    zIndex: index, // Reverse order: 0 is bottom
                                    scale: isTop ? 1 : 0.92 - (visibleCards.length - 1 - index) * 0.04,
                                    y: isTop ? 0 : (visibleCards.length - 1 - index) * 12,
                                }}
                            >
                                <Card
                                    data={word}
                                    onSwipe={swipe}
                                    // Disable card interaction if Flow Control is showing
                                    active={isTop && !showFlowControl}
                                />
                            </div>
                        );
                    })}
                </AnimatePresence>

                {/* Flow Control Card Overlay */}
                <AnimatePresence>
                    {showFlowControl && (
                        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center z-50">
                            <FlowControlCard
                                masteredCount={SESSION_LIMIT - mistakeQueue.length} // Approximation, assuming session started at 0 mistakes relative to this session
                                // Wait, mistakeQueue accumulates. We need mistakes *this session*.
                                // Since we don't track session mistakes separately in store yet (only global queue),
                                // we can surmise that mistakeQueue changes. 
                                // Ideally `sessionCounter` includes all swipes.
                                // For MVP/UX purpose, users likely want "Mistakes this session".
                                // But `mistakeQueue` is global errors.
                                // Let's simplify: "Mastered" = 20 - (Mistakes Added This Session).
                                // Since we don't track "Mistakes This Session" easily without store change,
                                // checking `mistakeQueue` length might show TOTAL mistakes.
                                // For now, let's use `mistakeQueue.length` as "To Review" (Total backlog)
                                // and `20` as completed.
                                // Or, we can assume for the demo that mistakes are cleared on session start (which we handled in restartGame/loadWords).
                                // So `mistakeQueue.length` IS correct for the current session IF we reset it on `loadWords`.
                                // Let's check `loadWords` -> it resets `mistakeQueue: []`. 
                                // Perfect. So `mistakeQueue.length` is exactly what we want for this session.

                                reviewCount={mistakeQueue.length}
                                onSwipe={handleFlowControlSwipe}
                            />
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
