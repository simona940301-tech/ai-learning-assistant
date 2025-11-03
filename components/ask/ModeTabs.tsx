import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const TABS: Array<{ key: 'solve' | 'summary'; label: string }> = [
  { key: 'solve', label: '解題' },
  { key: 'summary', label: '重點統整' },
]

interface ModeTabsProps {
  active: 'solve' | 'summary'
  onChange: (tab: 'solve' | 'summary') => void
}

const ModeTabs = ({ active, onChange }: ModeTabsProps) => {
  return (
    <div className="relative mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-white/5 bg-[#12181C]/80 px-2 py-1.5 backdrop-blur">
      {TABS.map(({ key, label }) => {
        const isActive = key === active
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'relative flex-1 rounded-2xl px-5 py-2 text-sm font-semibold tracking-wide text-white/60 transition',
              isActive ? 'text-[#F1F5F9]' : 'hover:text-[#F1F5F9]'
            )}
          >
            <AnimatePresence>
              {isActive && (
                <motion.span
                  layoutId="ask-tab-pill"
                  className="absolute inset-0 rounded-2xl bg-[#141A20] shadow-[0_0_12px_rgba(110,193,228,0.4)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </AnimatePresence>
            <span className="relative z-10">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ModeTabs
