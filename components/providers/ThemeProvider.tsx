/**
 * Theme Provider Component
 *
 * Wraps the app with theme context and applies CSS custom properties.
 * Handles smooth theme transitions and OS preference detection.
 */

'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme, applyThemeToDocument, themeTransition } from '@/lib/theme'

interface ThemeProviderProps {
  children: React.ReactNode
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, mode, isClient } = useTheme()

  // Apply theme to document on mount and when theme changes
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
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.9 }}
        transition={{ duration: themeTransition.duration, ease: themeTransition.ease }}
        className="min-h-screen"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          transition: `background-color ${themeTransition.duration}s ${themeTransition.ease}, color ${themeTransition.duration}s ${themeTransition.ease}`,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
