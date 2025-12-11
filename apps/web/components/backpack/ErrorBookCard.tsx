'use client'

import { motion } from 'framer-motion'
import { FileText, Check, ChevronRight, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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
  const pack = item.pack_questions?.packs
  const tags = item.knowledge_tags || []

  // Difficulty visualizer
  const difficultyColor = {
    1: 'bg-green-100 text-green-700',
    2: 'bg-blue-100 text-blue-700',
    3: 'bg-amber-100 text-amber-700',
    4: 'bg-orange-100 text-orange-700',
    5: 'bg-red-100 text-red-700'
  }[question?.difficulty as 1 | 2 | 3 | 4 | 5 || 3] || 'bg-slate-100 text-slate-700'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: isEditMode ? 1 : 0.99 }}
      className="group relative"
    >
      <div
        onClick={isEditMode ? onToggleSelect : onClick}
        className={cn(
          'relative flex items-start gap-4 p-4 rounded-xl',
          'bg-white border border-slate-100 shadow-sm',
          'cursor-pointer overflow-hidden',
          'transition-all duration-300',
          'hover:shadow-md hover:border-slate-200',
          isEditMode && isSelected && 'ring-2 ring-primary ring-offset-2 bg-primary/5 border-primary/20'
        )}
      >
        {/* Selection / Icon Area */}
        <div className="flex-shrink-0 pt-0.5">
          {isEditMode ? (
            <div
              className={cn(
                'w-6 h-6 flex items-center justify-center rounded-lg border-2 transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground scale-100'
                  : 'border-slate-200 bg-white scale-90 opacity-70 group-hover:opacity-100 group-hover:scale-100'
              )}
            >
              {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </div>
          ) : (
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-red-50 to-orange-50 border border-red-100",
              "group-hover:scale-110 transition-transform duration-300"
            )}>
              <FileText className="h-5 w-5 text-red-500" strokeWidth={1.75} />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Line */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium border-slate-200 text-slate-500 bg-slate-50">
                {subjectName}
              </Badge>
              <span className="text-xs text-slate-400">
                {getRelativeTime(item.created_at)}
              </span>
            </div>
            {/* Difficulty Dot */}
            <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", difficultyColor)}>
              Lv.{question?.difficulty || 3}
            </div>
          </div>

          {/* Question Stem */}
          <h3 className="text-base font-bold text-slate-800 line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">
            {question?.stem || '題目'}
          </h3>

          {/* Footer Info */}
          <div className="flex items-center gap-2 pt-1 h-6">
            {tags.slice(0, 2).map((tag: string, i: number) => (
              <div key={i} className="flex items-center text-xs text-amber-600/80 bg-amber-50 px-2 py-0.5 rounded-md">
                <GraduationCap className="w-3 h-3 mr-1" />
                {tag}
              </div>
            ))}
            {tags.length > 2 && (
              <span className="text-xs text-slate-400">+{tags.length - 2}</span>
            )}
          </div>
        </div>

        {/* Right Arrow (Hover only) */}
        {!isEditMode && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

