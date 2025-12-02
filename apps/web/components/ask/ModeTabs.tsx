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
    <div className="relative mx-auto flex w-full max-w-md items-center justify-center gap-3">
      {TABS.map(({ key, label }) => {
        const isActive = key === active
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            data-tab={key}
            className={cn(
              'relative flex-1 px-6 py-2.5 text-[15px] font-medium transition-all duration-200',
              'border-b-[1px]',
              isActive
                ? 'text-foreground border-[#D3BFA8]'
                : 'text-foreground/60 hover:text-foreground/80 border-transparent'
            )}
          >
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ModeTabs
