'use client'

import { motion } from 'framer-motion'
import { FileText, File, Image as ImageIcon, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BackpackFile } from '@/lib/types'

interface ContentCardProps {
  item: BackpackFile & { is_notebook_entry?: boolean; source_type?: string }
  onClick: () => void
  onImportToAsk?: (type: 'summary' | 'solve') => void
  getRelativeTime: (date: string) => string
  subjectName: string
  isEditMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
  isSelectMode?: boolean // 🎯 Phase 3: 多選模式
}

export function ContentCard({
  item,
  onClick,
  onImportToAsk,
  getRelativeTime,
  subjectName,
  isEditMode = false,
  isSelected = false,
  onToggleSelect,
  isSelectMode = false,
}: ContentCardProps) {
  // 🎯 Phase 3: 選擇模式或編輯模式都顯示選擇框
  const showCheckbox = isEditMode || isSelectMode
  const getFileIcon = () => {
    switch (item.type) {
      case 'pdf':
        return File
      case 'image':
        return ImageIcon
      default:
        return FileText
    }
  }

  const FileIcon = getFileIcon()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        onClick={showCheckbox ? onToggleSelect : onClick}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg',
          'border border-border bg-card',
          'hover:bg-muted/50 transition-colors',
          'cursor-pointer',
          showCheckbox && isSelected && 'border-primary bg-primary/10'
        )}
      >
        {/* Left Icon / Checkbox */}
        {showCheckbox ? (
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
            <FileIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          </div>
        )}

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {/* Layer 1: Main Title (truncated) */}
          <h3 className="font-semibold text-base text-foreground mb-1 line-clamp-1">
            {item.title}
          </h3>

          {/* Layer 2: Info Band & Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{subjectName}</span>
              <span>•</span>
              <span>{getRelativeTime(item.updated_at)}</span>
            </div>

            {/* Ask CTA (only in normal mode) */}
            {!showCheckbox && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (onImportToAsk) {
                    onImportToAsk('solve')
                  }
                }}
                className="text-xs px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                style={{ height: '24px', lineHeight: '1' }}
              >
                提問
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

