'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/tutor-types';

interface BatchListProps {
  questions: Question[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export default function BatchList({ questions, selectedIds, onToggle }: BatchListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto max-w-3xl space-y-3"
    >
      <div className="mb-4 text-xs uppercase tracking-[0.3em] text-white/35">批次題目清單</div>
      {questions.map((q, idx) => {
        const isSelected = selectedIds.includes(q.id);
        return (
          <motion.button
            key={q.id}
            onClick={() => onToggle(q.id)}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className={cn(
              'flex w-full items-start gap-4 rounded-2xl border border-white/8 bg-[#141A20] p-4 text-left transition hover:border-white/15',
              isSelected && 'border-[#6EC1E4]/50 bg-[#141A20]/80 shadow-[0_0_12px_rgba(110,193,228,0.2)]'
            )}
          >
            <div
              className={cn(
                'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition',
                isSelected
                  ? 'border-[#6EC1E4] bg-[#6EC1E4] shadow-[0_0_8px_rgba(110,193,228,0.4)]'
                  : 'border-white/20 bg-white/5'
              )}
            >
              {isSelected && <Check className="h-3.5 w-3.5 text-[#0E1116]" />}
            </div>
            <div className="flex-1">
              <p className="line-clamp-2 text-sm leading-relaxed text-[#F1F5F9]">{q.text}</p>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
