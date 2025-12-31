'use client'

/**
 * SafeAreaLayout - Global safe-area container for mobile devices
 *
 * Provides padding for notches, home indicators, and other system UI elements
 * on iOS and Android devices. Uses CSS env() variables for safe-area-inset-*.
 *
 * Usage: Wrap your entire app content with this component.
 */

import { ReactNode } from 'react'

interface SafeAreaLayoutProps {
  children: ReactNode
  /**
   * Whether to apply safe-area padding to top (default: true)
   * Set to false if you have a custom header that handles top insets
   */
  enableTop?: boolean
  /**
   * Whether to apply safe-area padding to bottom (default: true)
   * Set to false if you have a tab bar that handles bottom insets
   */
  enableBottom?: boolean
  /**
   * Whether to apply safe-area padding to left/right (default: true)
   */
  enableSides?: boolean
}

export function SafeAreaLayout({
  children,
  enableTop = true,
  enableBottom = true,
  enableSides = true,
}: SafeAreaLayoutProps) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        paddingTop: enableTop ? 'env(safe-area-inset-top)' : undefined,
        paddingBottom: enableBottom ? 'env(safe-area-inset-bottom)' : undefined,
        paddingLeft: enableSides ? 'env(safe-area-inset-left)' : undefined,
        paddingRight: enableSides ? 'env(safe-area-inset-right)' : undefined,
      }}
    >
      {children}
    </div>
  )
}

/**
 * Hook to get safe area inset values programmatically
 * Returns the current safe area inset values in pixels
 */
export function useSafeAreaInsets() {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }

  // Get computed style to read CSS env() values
  const style = getComputedStyle(document.documentElement)

  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
  }
}
