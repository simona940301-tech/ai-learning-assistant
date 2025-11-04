'use client'

// LEGACY — retained for archival purposes; Solve flow no longer mounts these chips.
import { motion } from 'framer-motion'

export type ViewOption = 'explain' | 'similar'

interface ViewChipsProps {
  active: ViewOption
  onChange?: (view: ViewOption) => void
}

const CHIPS = [
  { id: 'explain' as const, label: '詳解' },
  { id: 'similar' as const, label: '相似題' },
]

export default function ViewChips({ active, onChange = () => {} }: ViewChipsProps) {
  const handleClick = (id: ViewOption) => {
    onChange(id)
  }

  return (
    <div className="sticky top-16 z-30 flex items-center justify-center gap-2 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl py-3 px-4">
      {CHIPS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => handleClick(id)}
          className={`
            relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors
            ${active === id ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}
          `}
        >
          {active === id && (
            <motion.div
              layoutId="chip-bg"
              className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{label}</span>
        </button>
      ))}
    </div>
  )
}
