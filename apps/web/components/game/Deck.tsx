import React, { useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Card } from './Card';
import { FlowControlCard } from './FlowControlCard';
import { VocabularyCaptureModal } from './VocabularyCaptureModal';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, CheckCircle } from 'lucide-react';
import { TutorialBubble } from '@/components/ui/tutorial-bubble';

export const Deck: React.FC = () => {
    const {
        words,
        currentIndex,
        swipe,
        loadWords,
        mistakeQueue,
        restartGame,
        sessionCounter,
        handleFlowControlSwipe,
        // 🎯 Vocabulary Notebook State
        // 🎯 Vocabulary Notebook State
        sessionId,
        savedVocabularyIds,
        captureModalOpen,
        openCaptureModal,
        closeCaptureModal,
        markWordsAsSaved,
        importantQueue, // 🎯 New
        toggleImportant, // 🎯 New
    } = useGameStore();

    const [isExiting, setIsExiting] = React.useState(false); // 🎯 Control early exit

    useEffect(() => {
        loadWords(); // No arguments needed now as they are in store state
    }, []);

    // Session Limit Logic for Flow Control Card
    const SESSION_LIMIT = 20;
    const showFlowControl = sessionCounter >= SESSION_LIMIT || isExiting;

    // Wrap handleFlowControlSwipe to reset exit state
    const onFlowSwipe = (direction: 'left' | 'right') => {
        if (isExiting && direction === 'right') {
            // Exit without saving
            // Use window.history.back() or router... but router is not imported here.
            // Wait, this is a client component. I should import useRouter.
            window.history.back(); // Simple fallback
            return;
        }
        handleFlowControlSwipe(direction);
        setIsExiting(false);
    };

    // End of Game State (Ran out of words completely)
    if (words.length === 0) {
        return <div className="flex items-center justify-center h-full" style={{ color: 'hsl(var(--muted-foreground))' }}>載入中...</div>;
    }

    const isFinished = currentIndex >= words.length;

    if (isFinished && !showFlowControl) {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-6 text-center space-y-6">
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                    <CheckCircle size={48} className="text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold">全部卡片已複習完成！</h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                    你已經完成了所有卡片的複習。
                </p>

                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-green-600">{words.length - mistakeQueue.length}</div>
                        <div className="text-xs text-zinc-500 uppercase">已掌握</div>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-red-500">{mistakeQueue.length}</div>
                        <div className="text-xs text-zinc-500 uppercase">需複習</div>
                    </div>
                </div>

                <button
                    onClick={restartGame}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                    <RotateCcw size={18} />
                    重新開始
                </button>
            </div>
        );
    }

    // 🚀 OPTIMIZED: Only render 2 cards for better performance (current + 1 behind)
    const visibleCards = words.slice(currentIndex, currentIndex + 2).reverse();

    return (
        <div className="relative w-full h-[60vh] flex items-center justify-center px-4">
            {/* Exit Button - Minimalist Top Right */}
            <div className="absolute top-[-60px] right-4 z-50">
                <button
                    onClick={() => setIsExiting(true)}
                    className="p-3 bg-white/80 dark:bg-zinc-800/90 rounded-full text-zinc-500 hover:text-red-500 transition-colors shadow-sm"
                >
                    <RotateCcw className="w-5 h-5 opacity-0 absolute" /> {/* Hidden but keeps layout if needed? No, just use X */}
                    <span className="text-xs font-bold">Exit</span>
                </button>
            </div>

            {/* Card Stack - 🚀 OPTIMIZED with hardware acceleration */}
            <div className="relative w-full h-full flex items-center justify-center will-change-transform">
                <AnimatePresence mode="popLayout">
                    {visibleCards.map((word, index) => {
                        const isTop = word.id === words[currentIndex].id;
                        const cardIndex = visibleCards.length - 1 - index; // 0 for top, 1 for behind
                        return (
                            <motion.div
                                key={word.id}
                                className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center"
                                initial={false}
                                animate={{
                                    scale: isTop ? 1 : 0.95,
                                    y: isTop ? 0 : 12,
                                    opacity: isTop ? 1 : 0.5,
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 30,
                                }}
                                style={{
                                    zIndex: index,
                                    willChange: 'transform, opacity',
                                }}
                            >
                                <Card
                                    data={word}
                                    onSwipe={swipe}
                                    // Disable card interaction if Flow Control is showing
                                    active={isTop && !showFlowControl}
                                    isImportant={importantQueue.includes(word.id)} // 🎯 Pass status
                                    toggleImportant={() => toggleImportant(word.id)} // 🎯 Pass action
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Flow Control Card Overlay */}
                <AnimatePresence>
                    {showFlowControl && (
                        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center z-50">
                            <FlowControlCard
                                masteredCount={Math.max(0, (isExiting ? sessionCounter : SESSION_LIMIT) - mistakeQueue.length)}
                                reviewCount={mistakeQueue.length}
                                onSwipe={onFlowSwipe}
                                onOpenCaptureModal={openCaptureModal}
                                isExit={isExiting} // 🎯 Pass exit state
                            />
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* 🎯 Vocabulary Capture Modal */}
            <VocabularyCaptureModal
                isOpen={captureModalOpen}
                // If Exiting, we might want to capture ALL played words? 
                // User said: "ensure these words can be saved".
                // Usually "these" implies the ones I just saw.
                // Current logic: mistakeQueue OR importantQueue.
                // Let's stick to Mistake+Important for now as default behavior.
                // If user wants ALL, they can't easy select all.
                // But typically we don't save "Mastered" words.
                words={words.filter(w => mistakeQueue.includes(w.id) || importantQueue.includes(w.id))}
                sessionId={sessionId}
                savedVocabularyIds={savedVocabularyIds}
                onClose={() => {
                    closeCaptureModal();
                    // If we closed the modal after clicking "Save & Quit" (Left Swipe > Save),
                    // we should probably Exit the game now?
                    // The modal has "onSuccess" which calls markWordsAsSaved.
                    // onClose is just closing the modal.
                    // If it was an Exit flow, we should probably exit.
                    if (isExiting) {
                        window.history.back();
                    }
                }}
                onSuccess={(result) => {
                    const savedTexts = result.details
                        .filter((d: any) => d.status === 'saved')
                        .map((d: any) => d.word);
                    markWordsAsSaved(savedTexts);
                }}
            />
            {/* 🎯 Tutorial: Swipe Hints */}
            <TutorialBubble
                featureKey="lyrical_flow_swipe"
                message={`第一次玩嗎？\n試著向右滑動代表「記住了」\n向左滑動代表「再複習」`}
                position="bottom"
            />
        </div>
    );
};
