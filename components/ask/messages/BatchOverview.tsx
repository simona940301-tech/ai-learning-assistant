'use client';

import { motion } from 'framer-motion';
import type { QuickAnswer } from '@/lib/tutor-types';

interface BatchOverviewProps {
  quickAnswers: QuickAnswer[];
  onBack: () => void;
}

export default function BatchOverview({ quickAnswers, onBack }: BatchOverviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto max-w-3xl space-y-4"
    >
      <div className="mb-4 text-xs uppercase tracking-[0.3em] text-white/35">快速解答總覽</div>
      {quickAnswers.map((ans, idx) => (
        <motion.div
          key={ans.questionId}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.06 }}
          className="rounded-2xl border border-white/8 bg-[#141A20] p-5"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.2em] text-white/40">題目 {idx + 1}</span>
            {ans.suggestedAnswer && (
              <span className="rounded-full border border-[#6EC1E4]/30 bg-[#18232B] px-3 py-1 text-xs font-semibold text-[#6EC1E4]">
                建議答案：{ans.suggestedAnswer}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-[#E2EAF2]">{ans.oneLiner}</p>
        </motion.div>
      ))}

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onBack}
        className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-6 py-3 text-sm font-semibold text-[#E6EDF4] shadow-[0_6px_18px_rgba(0,0,0,0.3)] transition hover:bg-white/10"
      >
        回到清單
      </motion.button>
    </motion.div>
  );
}
