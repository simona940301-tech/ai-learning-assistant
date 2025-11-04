'use client'

import { useEffect, useState } from 'react'

interface TypewriterProps {
  text: string
  speed?: number
}

/**
 * Typewriter effect component
 */
export default function Typewriter({ text, speed = 30 }: TypewriterProps) {
  const [displayed, setDisplayed] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (displayed.length >= text.length) {
      setIsComplete(true)
      return
    }

    const timer = setTimeout(() => {
      setDisplayed(text.substring(0, displayed.length + 1))
    }, speed)

    return () => clearTimeout(timer)
  }, [displayed, text, speed])

  return (
    <span>
      {displayed}
      {!isComplete && <span className="animate-pulse">▋</span>}
    </span>
  )
}
