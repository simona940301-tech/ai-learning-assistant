import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export const ReviewMode: React.FC = () => {
    const { mistakeQueue, words, restartGame, loadWords } = useGameStore();

    // Filter words to only show those in mistakeQueue
    const reviewWords = words.filter(word => mistakeQueue.includes(word.id));

    const handleContinue = () => {
        // Continue to next session logic
        // This effectively "restarts" a session but we might want a specific action for "continue from review"
        // For now, let's treat it as starting a new fresh session logic-wise or just loading more words
        loadWords();
        // We'll need to make sure useGameStore handles the status change in loadWords or explicit call
        // But per plan, loadWords is what we do on "Swipe Right". 
        // Reuse restartGame for now which resets everything, or maybe we need a dedicated "startNextSession"
        // Let's use a simple approach: reset session counter and load new words.
        // Actually, the user might want to re-review these specific cards?
        // The prompt says: "Review Mode... Load mistakes...".
        // After review, usually they go back to playing?
        // Let's provide a "Back to Game" or "Next Session" button.
        // Given the prompt "Review Mode... 3. Game Status: Pause count", we need a way to exit.
        restartGame(); // Simple reset for now
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full flex flex-col bg-white dark:bg-zinc-900 overflow-hidden"
        >
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
                <button onClick={handleContinue} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <ArrowLeft className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                </button>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Review Mistakes</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {reviewWords.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
                        <p>No mistakes to review!</p>
                        <button
                            onClick={handleContinue}
                            className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-medium"
                        >
                            Start New Session
                        </button>
                    </div>
                ) : (
                    reviewWords.map(word => (
                        <div key={word.id} className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-100 dark:border-zinc-700/50">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{word.text}</h3>
                                <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                    Missed
                                </span>
                            </div>
                            <p className="text-blue-600 dark:text-blue-400 font-medium mb-2">{word.definition_zh}</p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">{`"${word.example_en}"`}</p>
                        </div>
                    ))
                )}
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={handleContinue}
                    className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
                >
                    Start Next Session
                </button>
            </div>
        </motion.div>
    );
};
