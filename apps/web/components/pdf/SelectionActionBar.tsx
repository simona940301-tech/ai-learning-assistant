'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  Highlighter,
  Minus,
  BookOpen,
  Volume2,
  MessageSquare,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react'
import { track } from '@/lib/telemetry'

interface SelectionActionBarProps {
  /** Position anchor (center of first selection rect) */
  anchorRect: DOMRect
  /** Container element for boundary detection */
  containerRect: DOMRect
  /** Action callbacks */
  onCopy: () => void
  onHighlight: (color: string) => void
  onStrikeout: () => void
  onDefine: () => void
  onSpeak: () => void
  onComment: () => void
  onAskAI: () => void
  /** iOS adaptive behavior */
  isIOS?: boolean
  /** Show minimized version (iOS when system menu is visible) */
  minimized?: boolean
}

const HIGHLIGHT_COLORS = [
  { name: 'yellow', value: '#FFEB3B', label: '黃色' },
  { name: 'green', value: '#4CAF50', label: '綠色' },
  { name: 'blue', value: '#2196F3', label: '藍色' },
  { name: 'orange', value: '#FF9800', label: '橘色' },
  { name: 'pink', value: '#E91E63', label: '粉色' },
] as const

/**
 * SelectionActionBar - GoodNotes-level selection action toolbar
 *
 * Features:
 * - 7 core actions: Copy, Highlight, Strikeout, Define, Speak, Comment, Ask AI
 * - iOS adaptive UX (minimized "..." button when system menu is visible)
 * - Smart positioning (avoids viewport edges)
 * - Expandable color picker for highlights
 * - Smooth animations with framer-motion
 * - Accessibility support (keyboard navigation, ARIA labels)
 *
 * Design principles:
 * - Minimalist glass morphism design
 * - Rounded pill shape with subtle shadows
 * - Icon-only buttons for space efficiency
 * - Tooltip labels on hover
 */
export function SelectionActionBar({
  anchorRect,
  containerRect,
  onCopy,
  onHighlight,
  onStrikeout,
  onDefine,
  onSpeak,
  onComment,
  onAskAI,
  isIOS = false,
  minimized = false,
}: SelectionActionBarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [expanded, setExpanded] = useState(!minimized)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  // Auto-expand on desktop, start minimized on iOS
  useEffect(() => {
    setExpanded(!minimized && !isIOS)
  }, [minimized, isIOS])

  /**
   * Calculate toolbar position
   * Strategy: Above selection, centered, with edge detection
   */
  const calculatePosition = () => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0

    const toolbarHeight = expanded ? 56 : 48
    const toolbarWidth = expanded ? 400 : 48
    const padding = 16

    // Default: centered above selection
    let x = anchorRect.left + anchorRect.width / 2
    let y = anchorRect.top - 12

    // Horizontal edge detection
    if (x < toolbarWidth / 2 + padding) {
      x = toolbarWidth / 2 + padding
    }
    if (x > viewportWidth - toolbarWidth / 2 - padding) {
      x = viewportWidth - toolbarWidth / 2 - padding
    }

    // Vertical edge detection (flip below if no space above)
    if (y < padding) {
      y = anchorRect.bottom + 12
    }
    if (y + toolbarHeight > viewportHeight - padding) {
      y = Math.max(padding, anchorRect.top - toolbarHeight - 12)
    }

    return { x, y }
  }

  const { x, y } = calculatePosition()

  /**
   * Close color picker when clicking outside
   */
  useEffect(() => {
    if (!showColorPicker) return

    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColorPicker])

  /**
   * Action handlers with tracking
   */
  const handleCopy = () => {
    track('pdf.selection.copy')
    onCopy()
  }

  const handleHighlightClick = () => {
    if (showColorPicker) {
      setShowColorPicker(false)
    } else {
      setShowColorPicker(true)
    }
  }

  const handleColorSelect = (color: string) => {
    track('pdf.selection.highlight', { color })
    setShowColorPicker(false)
    onHighlight(color)
  }

  const handleStrikeout = () => {
    track('pdf.selection.strikeout')
    onStrikeout()
  }

  const handleDefine = () => {
    track('pdf.selection.define')
    onDefine()
  }

  const handleSpeak = () => {
    track('pdf.selection.speak')
    onSpeak()
  }

  const handleComment = () => {
    track('pdf.selection.comment')
    onComment()
  }

  const handleAskAI = () => {
    track('pdf.selection.ask_ai')
    onAskAI()
  }

  const handleExpandToggle = () => {
    setExpanded((prev) => !prev)
  }

  /**
   * iOS Minimized Version: Single "..." button
   */
  if (!expanded && isIOS) {
    return (
      <motion.div
        ref={barRef}
        initial={{ opacity: 0, scale: 0.9, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 5 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed z-[9999] pointer-events-none"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: 'translateX(-50%) translateY(-100%)',
        }}
      >
        <button
          onClick={handleExpandToggle}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg border border-gray-100 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors pointer-events-auto"
          aria-label="展開工具列"
          title="展開工具列"
        >
          <MoreHorizontal className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
      </motion.div>
    )
  }

  /**
   * Full Action Bar: All actions visible
   */
  return (
    <AnimatePresence>
      <motion.div
        ref={barRef}
        initial={{ opacity: 0, scale: 0.95, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 5 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed z-[9999] pointer-events-none"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: 'translateX(-50%) translateY(-100%)',
        }}
        role="toolbar"
        aria-label="文字選取工具列"
      >
        {/* Main toolbar */}
        <div className="flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-full shadow-lg border border-gray-100 dark:border-zinc-700 px-2 py-2 pointer-events-auto">
          {/* Copy */}
          <ActionButton
            icon={<Copy className="h-4 w-4" />}
            label="複製"
            onClick={handleCopy}
          />

          <Divider />

          {/* Highlight */}
          <div className="relative" ref={colorPickerRef}>
            <ActionButton
              icon={<Highlighter className="h-4 w-4" />}
              label="螢光筆"
              onClick={handleHighlightClick}
              active={showColorPicker}
            />

            {/* Color Picker Popup */}
            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex items-center gap-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700 p-2"
                >
                  {HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => handleColorSelect(color.value)}
                      className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-800 shadow-md hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.value }}
                      aria-label={color.label}
                      title={color.label}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Strikeout */}
          <ActionButton
            icon={<Minus className="h-4 w-4" />}
            label="刪除線"
            onClick={handleStrikeout}
          />

          <Divider />

          {/* Define */}
          <ActionButton
            icon={<BookOpen className="h-4 w-4" />}
            label="查字典"
            onClick={handleDefine}
          />

          {/* Speak */}
          <ActionButton
            icon={<Volume2 className="h-4 w-4" />}
            label="朗讀"
            onClick={handleSpeak}
          />

          <Divider />

          {/* Comment */}
          <ActionButton
            icon={<MessageSquare className="h-4 w-4" />}
            label="註解"
            onClick={handleComment}
          />

          {/* Ask AI */}
          <ActionButton
            icon={<Sparkles className="h-4 w-4" />}
            label="問 AI"
            onClick={handleAskAI}
            highlight
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Action Button Component
 */
function ActionButton({
  icon,
  label,
  onClick,
  active = false,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center w-10 h-10 rounded-full
        transition-colors
        ${
          highlight
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : active
            ? 'bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-gray-100'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
        }
      `}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  )
}

/**
 * Divider Component
 */
function Divider() {
  return <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700" />
}
