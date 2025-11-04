'use client'

import { useEffect, useState } from 'react'

export function useTypewriterStream(lines: string[], delayMs = 900) {
  const [shown, setShown] = useState<string[]>([])

  useEffect(() => {
    setShown([])
    let index = 0
    const id = setInterval(() => {
      if (index < lines.length) {
        setShown((prev) => [...prev, lines[index++]])
      } else {
        clearInterval(id)
      }
    }, delayMs)

    return () => {
      clearInterval(id)
    }
  }, [lines, delayMs])

  return shown
}
