'use client'

import { motion } from 'framer-motion'
import { Folder, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FolderCardProps {
  subject: {
    id: string
    name: string
  }
  count: number
  type: 'note' | 'wrong' | 'book'
  onClick: () => void
}

const typeLabels = {
  note: '筆記',
  wrong: '錯題',
  book: '題本',
}

export function FolderCard({ subject, count, type, onClick }: FolderCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg',
          'border border-border bg-card',
          'hover:bg-muted/50 transition-colors',
          'text-left'
        )}
      >
        {/* Folder Icon */}
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-muted">
          <Folder className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground mb-0.5">
            {subject.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {count} 個{typeLabels[type]}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 text-muted-foreground/60 flex-shrink-0" strokeWidth={1.75} />
      </button>
    </motion.div>
  )
}

