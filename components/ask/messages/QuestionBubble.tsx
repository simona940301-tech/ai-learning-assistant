'use client';

import { motion } from 'framer-motion';
import type { Question } from '@/lib/tutor-types';

interface QuestionBubbleProps {
  question: Question;
}

export default function QuestionBubble({ question }: QuestionBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mx-auto max-w-2xl rounded-[20px] border border-white/8 bg-[#141A20] p-6 shadow-[0_4px_14px_rgba(0,0,0,0.3)]"
    >
      <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-white/30">題目</div>
      <p className="mb-4 text-base leading-relaxed text-[#F1F5F9]">{question.text}</p>
      {question.options && question.options.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((opt, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/5 bg-[#10161C]/60 px-4 py-2.5 text-sm text-[#E2EAF2]"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
