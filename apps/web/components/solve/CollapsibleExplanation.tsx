'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownExplain } from './MarkdownExplain'
import { motion, AnimatePresence } from 'framer-motion'

interface CollapsibleExplanationProps {
  markdown: string
  /**
   * 初始摺疊的文字長度閾值（字元數）
   */
  collapseThreshold?: number
}

/**
 * 🎯 Phase A: 可折疊解析內容
 * 長文預設折疊，只顯示前 300 字
 */
export function CollapsibleExplanation({
  markdown,
  collapseThreshold = 300,
}: CollapsibleExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 判斷是否需要折疊
  const shouldCollapse = markdown.length > collapseThreshold

  // 截斷內容（只顯示前 N 字）
  const truncatedMarkdown = shouldCollapse && !isExpanded
    ? markdown.slice(0, collapseThreshold) + '...'
    : markdown

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? 'expanded' : 'collapsed'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <MarkdownExplain markdown={truncatedMarkdown} />
        </motion.div>
      </AnimatePresence>

      {/* 展開/折疊按鈕 */}
      {shouldCollapse && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full px-6"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                折疊詳解
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                展開詳解
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

