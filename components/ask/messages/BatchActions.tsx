'use client';

import { motion } from 'framer-motion';
import { BookOpen, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchActionsProps {
  selectedCount: number;
  onStepByStep: () => void;
  onQuickAnswer: () => void;
}

export default function BatchActions({ selectedCount, onStepByStep, onQuickAnswer }: BatchActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto mt-6 flex max-w-3xl flex-col gap-3 sm:flex-row"
    >
      <button
        onClick={onStepByStep}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-full border border-[#6EC1E4]/40 bg-[#18232B] px-6 py-3.5 text-sm font-semibold text-[#6EC1E4] shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:border-[#6EC1E4]/70 hover:shadow-[0_0_16px_rgba(110,193,228,0.4)]'
        )}
      >
        <BookOpen className="h-4 w-4" />
        逐步解析（{selectedCount} 題）
      </button>

      <button
        onClick={onQuickAnswer}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-6 py-3.5 text-sm font-semibold text-[#E6EDF4] shadow-[0_6px_18px_rgba(0,0,0,0.3)] transition hover:bg-white/10'
        )}
      >
        <Zap className="h-4 w-4" />
        快速解答（{selectedCount} 題）
      </button>
    </motion.div>
  );
}
