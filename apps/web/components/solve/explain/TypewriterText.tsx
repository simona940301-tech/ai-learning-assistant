'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface TypewriterTextProps {
  text: string
  speed?: number // Characters per interval (for smooth typing)
  className?: string
  onComplete?: () => void
}

/**
 * Typewriter effect component optimized for streaming
 * - For streaming: Shows text immediately as it arrives
 * - For static: Smooth typing animation
 */
export function TypewriterText({
  text,
  speed = 5, // Characters per 50ms
  className = '',
  onComplete,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTextLengthRef = useRef(0)
  const isStreamingRef = useRef(false)

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Detect streaming mode: text length increases incrementally
    if (text.length > lastTextLengthRef.current) {
      isStreamingRef.current = true
      // For streaming, show new text immediately
      setDisplayed(text)
      lastTextLengthRef.current = text.length
      return
    }

    // If text decreased significantly, reset (new generation)
    if (text.length < lastTextLengthRef.current * 0.5) {
      setDisplayed('')
      setIsComplete(false)
      lastTextLengthRef.current = 0
      isStreamingRef.current = false
    }

    // Static text mode: smooth typing animation
    if (displayed.length >= text.length && text.length > 0) {
      if (!isComplete) {
        setIsComplete(true)
        onComplete?.()
      }
      return
    }

    // Only animate if we have text to display
    if (text.length === 0) {
      setDisplayed('')
      return
    }

    // Smooth typing animation for static text
    const charsPerInterval = Math.max(1, Math.floor(speed))
    const interval = setInterval(() => {
      setDisplayed((prev) => {
        const nextLength = Math.min(prev.length + charsPerInterval, text.length)
        if (nextLength >= text.length) {
          setIsComplete(true)
          onComplete?.()
        }
        return text.slice(0, nextLength)
      })
    }, 50)

    intervalRef.current = interval

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [text, speed, onComplete, isComplete, displayed.length])

  // Reset on empty text
  useEffect(() => {
    if (text.length === 0 && displayed.length > 0) {
      setDisplayed('')
      setIsComplete(false)
      lastTextLengthRef.current = 0
      isStreamingRef.current = false
    }
  }, [text.length, displayed.length])

  const showCursor = (text.length > displayed.length) || (isStreamingRef.current && text.length > 0 && !isComplete)

  return (
    <span className={className}>
      {displayed || (isStreamingRef.current ? text : '')}
      {showCursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
          className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
          aria-hidden="true"
        />
      )}
    </span>
  )
}
