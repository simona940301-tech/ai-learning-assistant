import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ConceptChip } from '@/lib/tutor-types'

interface ConceptChipsProps {
  concepts: ConceptChip[]
  selectedId: string | null
  onSelect: (concept: ConceptChip) => void
}

const ConceptChips = ({ concepts, selectedId, onSelect }: ConceptChipsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mx-auto max-w-2xl space-y-3"
    >
      <div className="text-xs uppercase tracking-[0.3em] text-white/30">考點聚焦</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {concepts.map((concept) => {
          const isActive = selectedId === concept.id
          return (
            <button
              key={concept.id}
              onClick={() => onSelect(concept)}
              className={cn(
                'rounded-2xl border border-white/8 bg-[#141A20] px-5 py-3.5 text-center text-sm font-semibold text-[#F1F5F9] shadow-[0_4px_14px_rgba(0,0,0,0.3)] transition hover:border-[#6EC1E4]/40 hover:shadow-[0_0_14px_rgba(110,193,228,0.25)]',
                isActive && 'border-[#6EC1E4]/70 bg-[#18232B] shadow-[0_0_16px_rgba(110,193,228,0.35)]'
              )}
            >
              {concept.label}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

export default ConceptChips
