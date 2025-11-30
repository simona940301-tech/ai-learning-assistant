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
    <div className="relative mx-auto flex w-full max-w-md items-center justify-center gap-3 rounded-full bg-background/60 p-1.5">
      {TABS.map(({ key, label }) => {
        const isActive = key === active
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            data-tab={key}
            className={cn(
              'relative flex-1 rounded-full px-6 py-2.5 text-base font-medium transition-all duration-200',
              isActive
                ? 'text-primary-foreground'
                : 'text-foreground/60 hover:text-foreground/80'
            )}
          >
            <AnimatePresence>
              {isActive && (
                <motion.span
                  layoutId="ask-tab-pill"
                  className="absolute inset-0 rounded-full bg-primary shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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
