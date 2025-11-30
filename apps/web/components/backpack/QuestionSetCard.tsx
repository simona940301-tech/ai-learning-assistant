'use client'

import { motion } from 'framer-motion'
import { Book, Star, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { calculateProgressPercent } from '@/lib/types/question-sets'

interface QuestionSetCardProps {
  item: any
  onClick: () => void
  onCreatePractice: () => void
  isCreating: boolean
  subjectName: string
}

export function QuestionSetCard({
  item,
  onClick,
  onCreatePractice,
  isCreating,
  subjectName,
}: QuestionSetCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        onClick={onClick}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg',
          'border border-border bg-card',
          'hover:bg-muted/50 transition-colors',
          'cursor-pointer'
        )}
      >
        {/* Left Icon */}
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-muted">
          <Book className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
        </div>

        {/* Right Content - Three Layers */}
        <div className="flex-1 min-w-0">
          {/* Layer 1: Main Title */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-base text-foreground line-clamp-1 flex-1">
              {item.title}
            </h3>
            {item.rating && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded ml-2 shrink-0">
                <Star className="h-3 w-3 fill-primary text-primary" strokeWidth={1.75} />
                {item.rating}
              </div>
            )}
          </div>

          {/* Layer 2: Info Band */}
          <div className="mb-3">
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {item.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                {subjectName}
              </span>
              {item.difficulty_level && (
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  難度 {item.difficulty_level}
                </span>
              )}
            </div>
            {/* Progress */}
            {item.progress_data && item.practice_count > 0 && (
              <div className="space-y-1">
                <Progress
                  value={calculateProgressPercent(item.progress_data)}
                  className="h-1.5"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    已練習: {item.progress_data.completed}/{item.progress_data.total}
                  </span>
                  <span>
                    正確率: {Math.round(item.progress_data.correct_rate * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Layer 3: Action Row */}
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onCreatePractice()
                }}>開始練習</DropdownMenuItem>
                <DropdownMenuItem>查看詳情</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

