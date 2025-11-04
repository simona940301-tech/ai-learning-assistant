import { motion } from 'framer-motion'
import { Loader2, RefreshCw, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActionDuoProps {
  onSave: () => void
  onRetry: () => void
  isSaving: boolean
  isRetrying: boolean
  savedStatus: 'idle' | 'saved'
}

const ActionDuo = ({ onSave, onRetry, isSaving, isRetrying, savedStatus }: ActionDuoProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col gap-3 sm:flex-row sm:gap-4"
    >
      <button
        onClick={onSave}
        disabled={isSaving}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-full border border-[#6EC1E4]/30 bg-[#182028] px-6 py-3 text-sm font-semibold text-[#6EC1E4] shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:border-[#6EC1E4]/60 hover:shadow-[0_0_14px_rgba(110,193,228,0.35)]',
          isSaving && 'opacity-80'
        )}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        存入書包
        {savedStatus === 'saved' && <span className="text-[11px] text-[#6EC1E4]">已儲存 ✓</span>}
      </button>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-[#E2EAF2] shadow-[0_6px_18px_rgba(0,0,0,0.3)] transition hover:bg-white/10',
          isRetrying && 'opacity-80'
        )}
      >
        {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        再練一題
      </button>
    </motion.div>
  )
}

export default ActionDuo
