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
    <div className="relative mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-border bg-card/80 px-2 py-1.5 backdrop-blur shadow-sm">
      {TABS.map(({ key, label }) => {
        const isActive = key === active
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'relative flex-1 rounded-2xl px-5 py-2 text-sm font-semibold tracking-wide transition',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <AnimatePresence>
              {isActive && (
                <motion.span
                  layoutId="ask-tab-pill"
                  className="absolute inset-0 rounded-2xl bg-primary/20 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
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
