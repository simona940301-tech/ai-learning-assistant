'use client'

import { motion } from 'framer-motion'
import { FileText, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorBookCardProps {
  item: any
  onClick: () => void
  subjectName: string
  getRelativeTime: (date: string) => string
  isEditMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}

export function ErrorBookCard({
  item,
  onClick,
  subjectName,
  getRelativeTime,
  isEditMode = false,
  isSelected = false,
  onToggleSelect,
}: ErrorBookCardProps) {
  const question = item.pack_questions
  const pack = item.packs

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        onClick={isEditMode ? onToggleSelect : onClick}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg',
          'border border-border bg-card',
          'hover:bg-muted/50 transition-colors',
          'cursor-pointer',
          isEditMode && isSelected && 'border-primary bg-primary/10'
        )}
      >
        {/* Left Icon / Checkbox */}
        {isEditMode ? (
          <div
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect?.()
            }}
            className={cn(
              'flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border-2 transition-colors',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted'
            )}
          >
            {isSelected && <Check className="h-5 w-5" />}
          </div>
        ) : (
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          </div>
        )}

        {/* Right Content - Three Layers */}
        <div className="flex-1 min-w-0">
          {/* Layer 1: Main Title */}
          <h3 className="font-semibold text-base text-foreground mb-2 line-clamp-2">
            {question?.stem || '題目'}
          </h3>

          {/* Layer 2: Info Band */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span>{subjectName}</span>
            {pack?.skill && (
              <>
                <span>•</span>
                <span>{pack.skill}</span>
              </>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  )
}

