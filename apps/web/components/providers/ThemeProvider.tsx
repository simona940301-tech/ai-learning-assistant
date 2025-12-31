/**
 * Theme Provider Component
 *
 * Wraps the app with theme context and applies CSS custom properties.
 * Handles smooth theme transitions and OS preference detection.
 */

'use client'

import { useEffect } from 'react'
import { useTheme, applyThemeToDocument } from '@/lib/theme'

interface ThemeProviderProps {
  children: React.ReactNode
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, isClient } = useTheme()

  // Apply theme to document on mount
  useEffect(() => {
    if (isClient) {
      applyThemeToDocument(theme)
    }
  }, [theme, isClient])

  // Prevent flash of unstyled content
  if (!isClient) {
    return <>{children}</>
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      {children}
    </div>
  )
}
